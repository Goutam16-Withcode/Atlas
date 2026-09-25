"""
gateway/router.py — Enterprise LLM Gateway Router.
Provides unified model dispatching with:
- Token and request rate limiting
- Circuit breaker protection
- Sub-5ms caching for repeated queries
- Multi-key rotation and multi-model fallback
- Token and monetary cost calculation
"""

import time
from typing import List, Any, Dict, Optional, Tuple
from langchain_core.messages import BaseMessage, AIMessage
from langchain_groq import ChatGroq

from config import settings
from logger import get_logger
from gateway.config import gateway_settings
from gateway.circuit_breaker import circuit_breaker
from gateway.rate_limiter import rate_limiter
from gateway.cache import gateway_cache
from gateway.smart_router import smart_router
from guardrails.manager import guardrails

logger = get_logger("gateway.router")



class LLMGateway:
    def __init__(self):
        self._key_index = 0
        self.total_tokens_consumed = 0
        self.total_estimated_cost = 0.0

    def _get_api_key(self) -> Optional[str]:
        keys = settings.groq_api_keys
        if not keys:
            return None
        return keys[self._key_index % len(keys)]

    def _rotate_key(self):
        keys = settings.groq_api_keys
        if len(keys) > 1:
            self._key_index = (self._key_index + 1) % len(keys)
            logger.info(f"Gateway rotated API key to index {self._key_index}")

    def _estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        input_cost = (prompt_tokens / 1_000_000) * gateway_settings.INPUT_COST_PER_1M_TOKENS
        output_cost = (completion_tokens / 1_000_000) * gateway_settings.OUTPUT_COST_PER_1M_TOKENS
        return input_cost + output_cost

    def _invoke_openrouter(self, messages: List[BaseMessage], model: str = None) -> Optional[AIMessage]:
        if not settings.OPENROUTER_API_KEY:
            return None
        import requests
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "HTTP-Referer": "https://github.com/Goutam16-Withcode/Atlas-Multimodal-AI-Portal",
            "X-Title": "Atlas AI Portal",
            "Content-Type": "application/json"
        }
        formatted_msgs = []
        for m in messages:
            role = "user" if m.type == "human" else ("assistant" if m.type == "ai" else "system")
            content = m.content if isinstance(m.content, str) else str(m.content)
            formatted_msgs.append({"role": role, "content": content})

        payload = {
            "model": model or settings.OPENROUTER_MODEL,
            "messages": formatted_msgs,
            "temperature": settings.TEMPERATURE,
        }
        try:
            r = requests.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=25
            )
            if r.status_code == 200:
                data = r.json()
                content = data["choices"][0]["message"]["content"]
                logger.info(f"Successfully routed request through OpenRouter ({payload['model']})")
                return AIMessage(content=content)
            else:
                logger.warning(f"OpenRouter API returned status {r.status_code}: {r.text[:200]}")
                return None
        except Exception as e:
            logger.error(f"OpenRouter invocation failed: {e}")
            return None

    def invoke(

        self,
        messages: List[BaseMessage],
        model: str = None,
        temperature: float = None,
        client_identifier: str = "default_user",
        tools: Optional[list] = None,
        is_industrial: bool = False,
    ) -> Dict[str, Any]:
        """
        Main entry point for routing LLM calls through the Gateway with guardrails,
        caching, circuit breakers, rate limits, and cost accounting.
        """
        start_time = time.time()
        
        # Smart Routing Decision
        if not model:
            routing_decision = smart_router.select_model(messages, is_industrial=is_industrial)
            model_name = routing_decision.selected_model
            logger.info(f"Smart Router dispatched query to [{routing_decision.tier.upper()}]: {model_name} (Rationale: {routing_decision.rationale})")
        else:
            model_name = model

        temp = temperature if temperature is not None else settings.TEMPERATURE


        # 1. Rate Limiting Check
        allowed, reject_reason = rate_limiter.check_and_record_request(client_identifier)
        if not allowed:
            logger.warning(f"Gateway rejected request for '{client_identifier}': {reject_reason}")
            return {
                "response": AIMessage(content=f"⚠️ {reject_reason}"),
                "cached": False,
                "latency_ms": round((time.time() - start_time) * 1000, 2),
                "error": reject_reason,
            }

        # 2. Extract last user prompt for Guardrails and Caching
        last_user_prompt = ""
        for m in reversed(messages):
            if m.type == "human" and isinstance(m.content, str):
                last_user_prompt = m.content
                break

        # 3. Input Guardrails Processing
        if last_user_prompt:
            guard_decision = guardrails.process_input(last_user_prompt)
            if guard_decision.is_blocked:
                return {
                    "response": AIMessage(content=f"🚫 {guard_decision.rejection_reason}"),
                    "cached": False,
                    "latency_ms": round((time.time() - start_time) * 1000, 2),
                    "error": guard_decision.rejection_reason,
                }
            # Update prompt in place if PII was sanitized
            if guard_decision.pii_redacted:
                for m in reversed(messages):
                    if m.type == "human" and isinstance(m.content, str):
                        m.content = guard_decision.sanitized_text
                        break

        # 4. Check Gateway Response Cache (only for non-tool or pure query requests)
        if not tools and last_user_prompt:
            cached_response = gateway_cache.get(last_user_prompt, model_name, temp)
            if cached_response:
                latency = round((time.time() - start_time) * 1000, 2)
                return {
                    "response": cached_response,
                    "cached": True,
                    "latency_ms": latency,
                    "tokens_used": 0,
                    "cost_usd": 0.0,
                    "error": None,
                }

        # 5. Circuit Breaker Check
        can_run, cb_reason = circuit_breaker.can_execute(model_name)
        if not can_run:
            logger.warning(f"Circuit breaker active for {model_name}. Attempting fallback...")
            model_name = "llama-3.1-8b-instant"  # fallback lightweight model

        # 6. LLM Invocation with Retry & Rotation
        retries = 0
        last_error = None
        response_msg = None

        while retries < settings.MAX_LLM_RETRIES:
            api_key = self._get_api_key()
            try:
                base_llm = ChatGroq(
                    model=model_name,
                    temperature=temp,
                    api_key=api_key or None,
                )
                if tools:
                    llm_with_tools = base_llm.bind_tools(tools)
                    response_msg = llm_with_tools.invoke(messages)
                else:
                    response_msg = base_llm.invoke(messages)

                # Record success with circuit breaker
                circuit_breaker.record_success(model_name)
                break

            except Exception as e:
                err_msg = str(e)
                last_error = err_msg
                retries += 1
                logger.warning(f"Gateway invocation error (try {retries}/{settings.MAX_LLM_RETRIES}): {err_msg}")

                # If rate limited (429), trip key rotation and circuit failure
                if "429" in err_msg or "rate_limit" in err_msg.lower():
                    self._rotate_key()
                    circuit_breaker.record_failure(model_name, e)

                time.sleep(settings.RETRY_BACKOFF_SECONDS * retries)

        # Fallback to OpenRouter if Groq primary is exhausted
        if not response_msg and settings.OPENROUTER_API_KEY:
            logger.info("Attempting automatic failover to OpenRouter...")
            response_msg = self._invoke_openrouter(messages)

        if not response_msg:
            circuit_breaker.record_failure(model_name, Exception(last_error))
            response_msg = AIMessage(
                content="Atlas Gateway encountered upstream model unavailability across all providers. The request has been logged."
            )


        # 7. Output Guardrails Processing
        output_decision = guardrails.process_output(
            model_output=response_msg.content if isinstance(response_msg.content, str) else "",
            is_emergency=False,
            is_industrial=is_industrial,
        )
        response_msg.content = output_decision.sanitized_text

        # 8. Token Accounting & Metrics
        token_usage = getattr(response_msg, "response_metadata", {}).get("token_usage", {})
        prompt_tokens = token_usage.get("prompt_tokens", len(str(messages)) // 4)
        completion_tokens = token_usage.get("completion_tokens", len(response_msg.content) // 4)
        total_tokens = prompt_tokens + completion_tokens

        cost = self._estimate_cost(prompt_tokens, completion_tokens)
        self.total_tokens_consumed += total_tokens
        self.total_estimated_cost += cost
        rate_limiter.record_token_usage(client_identifier, total_tokens)

        # 9. Store in Gateway Cache (if applicable)
        if not tools and last_user_prompt and not last_error:
            gateway_cache.set(last_user_prompt, model_name, temp, response_msg)

        latency = round((time.time() - start_time) * 1000, 2)
        return {
            "response": response_msg,
            "cached": False,
            "latency_ms": latency,
            "tokens_used": total_tokens,
            "cost_usd": round(cost, 6),
            "error": last_error,
        }

    def get_metrics(self) -> Dict[str, Any]:
        return {
            "total_tokens_consumed": self.total_tokens_consumed,
            "total_estimated_cost_usd": round(self.total_estimated_cost, 4),
            "cache_stats": gateway_cache.get_stats(),
        }


gateway = LLMGateway()
