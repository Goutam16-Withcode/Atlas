"""
gateway/circuit_breaker.py — Circuit Breaker Pattern for LLM Providers.
Prevents cascading failures by opening the circuit when a model provider
returns repeated rate limits, connection errors, or timeouts.
"""

import time
from enum import Enum
from typing import Dict, Tuple
from gateway.config import gateway_settings
from logger import get_logger

logger = get_logger("gateway.circuit_breaker")


class CircuitState(Enum):
    CLOSED = "CLOSED"        # Normal operation
    OPEN = "OPEN"            # Provider failing; reject calls immediately
    HALF_OPEN = "HALF_OPEN"  # Testing if provider has recovered


class CircuitBreaker:
    def __init__(self, failure_threshold: int = None, cooldown_seconds: int = None):
        self.failure_threshold = failure_threshold or gateway_settings.CIRCUIT_BREAKER_FAILURE_THRESHOLD
        self.cooldown_seconds = cooldown_seconds or gateway_settings.CIRCUIT_BREAKER_COOLDOWN_SECONDS
        
        # State tracking per provider/model name
        self.states: Dict[str, CircuitState] = {}
        self.failure_counts: Dict[str, int] = {}
        self.last_failure_times: Dict[str, float] = {}

    def get_state(self, provider: str) -> CircuitState:
        now = time.time()
        state = self.states.get(provider, CircuitState.CLOSED)

        if state == CircuitState.OPEN:
            last_fail = self.last_failure_times.get(provider, 0.0)
            if now - last_fail >= self.cooldown_seconds:
                logger.info(f"Circuit Breaker for {provider} moving to HALF_OPEN (cooldown expired).")
                self.states[provider] = CircuitState.HALF_OPEN
                return CircuitState.HALF_OPEN

        return state

    def can_execute(self, provider: str) -> Tuple[bool, str]:
        state = self.get_state(provider)
        if state == CircuitState.OPEN:
            time_left = int(self.cooldown_seconds - (time.time() - self.last_failure_times.get(provider, 0)))
            return False, f"Provider '{provider}' circuit is OPEN due to repeated errors. Retry in {max(1, time_left)}s."
        return True, ""

    def record_success(self, provider: str):
        if self.states.get(provider) in (CircuitState.HALF_OPEN, CircuitState.OPEN):
            logger.info(f"Provider '{provider}' recovered successfully. Circuit CLOSED.")
        self.states[provider] = CircuitState.CLOSED
        self.failure_counts[provider] = 0

    def record_failure(self, provider: str, error: Exception):
        now = time.time()
        self.failure_counts[provider] = self.failure_counts.get(provider, 0) + 1
        self.last_failure_times[provider] = now

        count = self.failure_counts[provider]
        logger.warning(f"Recorded failure #{count} for '{provider}': {error}")

        if count >= self.failure_threshold:
            self.states[provider] = CircuitState.OPEN
            logger.error(f"Circuit Breaker TRIPPED to OPEN for provider '{provider}'! Threshold {self.failure_threshold} reached.")


circuit_breaker = CircuitBreaker()
