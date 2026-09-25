"""
gateway/smart_router.py — Dynamic Smart Model Routing Engine.
Routes incoming queries to the optimal LLM based on task complexity,
modality, cost, and latency targets.

Routing Tiers:
- FAST / LIGHTWEIGHT (e.g., Llama-3.1-8b-instant): Simple queries, chit-chat, single lookups (80% cost & latency savings)
- FRONTIER / REASONING (e.g., Llama-3.3-70b-versatile): Multi-step industrial root cause, math, LOTO compliance
- VISION / MULTIMODAL: Visual inspections, meter readings, diagrams
- CODE / SQL: Complex script analysis and queries
"""

import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from langchain_core.messages import BaseMessage, HumanMessage
from logger import get_logger

logger = get_logger("gateway.smart_router")


class RoutingDecision(BaseModel):
    selected_model: str
    tier: str  # "fast", "frontier", "vision", "code"
    rationale: str
    estimated_cost_multiplier: float  # e.g., 0.1x for 8b vs 1.0x for 70b


class SmartRouter:
    # Model catalog per tier
    TIER_MODELS = {
        "fast": "qwen/qwen3.8-27b",
        "frontier": "openai/gpt-oss-120b",
        "vision": "openai/gpt-oss-20b",
        "code": "qwen/qwen3.8-27b",
    }


    # Complexity indicators (requires frontier reasoning)
    COMPLEX_INDICATORS = [
        r"(?i)\b(calculate|derive|compute|integrate|differentiate|formula)\b",
        r"(?i)\b(root\s+cause|failure\s+mode|troubleshoot|diagnos|investigate)\b",
        r"(?i)\b(trade-off|compare|pros\s+and\s+cons|evaluate|strategy)\b",
        r"(?i)\b(lockout|tagout|loto|osha|safety\s+protocol|hazard)\b",
        r"(?i)\b(simulate|architecture|design\s+pattern|optimiz)\b",
    ]

    # Simple indicators (can be handled by fast 8B tier)
    SIMPLE_INDICATORS = [
        r"(?i)^(hi|hello|hey|good\s+morning|good\s+evening|greetings)[\.!]?$",
        r"(?i)^what\s+is\s+the\s+capital\s+of\b",
        r"(?i)^who\s+(is|was)\b",
        r"(?i)^(thank\s+you|thanks|ok|okay|got\s+it)[\.!]?$",
        r"(?i)^define\s+[a-zA-Z\s]+$",
    ]

    @classmethod
    def select_model(
        cls,
        messages: List[BaseMessage],
        has_image: bool = False,
        is_industrial: bool = False,
        intent: Optional[str] = None
    ) -> RoutingDecision:
        """
        Dynamically inspects conversation complexity and selects the best model.
        """
        # 1. Vision routing
        if has_image:
            return RoutingDecision(
                selected_model=cls.TIER_MODELS["vision"],
                tier="vision",
                rationale="Multimodal image payload detected. Routed to Vision tier.",
                estimated_cost_multiplier=0.6,
            )

        # 2. Extract latest user query
        latest_text = ""
        for m in reversed(messages):
            if isinstance(m, HumanMessage) and isinstance(m.content, str):
                latest_text = m.content.strip()
                break

        # 3. Industrial safety / escalation -> always frontier
        if is_industrial or intent in ("escalation", "technical_support"):
            return RoutingDecision(
                selected_model=cls.TIER_MODELS["frontier"],
                tier="frontier",
                rationale="Industrial or safety-critical context. Routed to high-reasoning Frontier tier.",
                estimated_cost_multiplier=1.0,
            )

        # 4. Check for simple chit-chat or shallow lookups
        for pattern in cls.SIMPLE_INDICATORS:
            if re.search(pattern, latest_text):
                return RoutingDecision(
                    selected_model=cls.TIER_MODELS["fast"],
                    tier="fast",
                    rationale="Low-complexity greeting or single-fact inquiry. Routed to Fast 8B tier (85% cost savings).",
                    estimated_cost_multiplier=0.15,
                )

        # 5. Check for complex reasoning patterns
        for pattern in cls.COMPLEX_INDICATORS:
            if re.search(pattern, latest_text):
                return RoutingDecision(
                    selected_model=cls.TIER_MODELS["frontier"],
                    tier="frontier",
                    rationale="Complex reasoning, calculation, or diagnostic required. Routed to Frontier 70B tier.",
                    estimated_cost_multiplier=1.0,
                )

        # 6. Length heuristic: short query (< 10 words) with no complex keywords -> Fast tier
        word_count = len(latest_text.split())
        if word_count < 10 and not any(symbol in latest_text for symbol in ["?", "=", "+", "-", "*", "/"]):
            return RoutingDecision(
                selected_model=cls.TIER_MODELS["fast"],
                tier="fast",
                rationale="Brief conversational input. Routed to Fast 8B tier.",
                estimated_cost_multiplier=0.15,
            )

        # Default fallback to frontier for quality
        return RoutingDecision(
            selected_model=cls.TIER_MODELS["frontier"],
            tier="frontier",
            rationale="Standard query. Routed to Frontier 70B tier for maximum accuracy.",
            estimated_cost_multiplier=1.0,
        )


smart_router = SmartRouter()
