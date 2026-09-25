"""
gateway/config.py — Gateway configuration settings & quotas.
"""

import os
from pydantic import BaseModel


class GatewaySettings(BaseModel):
    # Rate Limiting
    MAX_REQUESTS_PER_MINUTE: int = int(os.getenv("GATEWAY_MAX_REQ_PER_MIN", "60"))
    MAX_TOKENS_PER_MINUTE: int = int(os.getenv("GATEWAY_MAX_TOKENS_PER_MIN", "50000"))
    USER_DAILY_TOKEN_BUDGET: int = int(os.getenv("GATEWAY_USER_DAILY_TOKEN_BUDGET", "200000"))

    # Circuit Breaker
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = int(os.getenv("CB_FAILURE_THRESHOLD", "5"))
    CIRCUIT_BREAKER_COOLDOWN_SECONDS: int = int(os.getenv("CB_COOLDOWN_SEC", "30"))

    # Response Caching
    CACHE_ENABLED: bool = os.getenv("GATEWAY_CACHE_ENABLED", "true").lower() == "true"
    CACHE_TTL_SECONDS: int = int(os.getenv("GATEWAY_CACHE_TTL_SEC", "3600"))  # 1 hour
    MAX_CACHE_ENTRIES: int = 5000

    # Cost Estimation ($ per 1M tokens approx for Llama 3.3 70B on Groq)
    INPUT_COST_PER_1M_TOKENS: float = 0.59
    OUTPUT_COST_PER_1M_TOKENS: float = 0.79


gateway_settings = GatewaySettings()
