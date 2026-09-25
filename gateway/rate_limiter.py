"""
gateway/rate_limiter.py — Token & Request Sliding-Window Rate Limiter.
Tracks request counts and token consumption per client IP / user identifier.
"""

import time
from collections import defaultdict
from typing import Dict, List, Tuple
from gateway.config import gateway_settings
from logger import get_logger

logger = get_logger("gateway.rate_limiter")


class SlidingWindowRateLimiter:
    def __init__(self):
        # Maps identifier -> list of request timestamps
        self.request_windows: Dict[str, List[float]] = defaultdict(list)
        # Maps identifier -> list of (timestamp, token_count)
        self.token_windows: Dict[str, List[Tuple[float, int]]] = defaultdict(list)
        # Daily token counter: identifier -> (date_str, total_tokens)
        self.daily_tokens: Dict[str, Tuple[str, int]] = {}

    def _cleanup_old_entries(self, ident: str, now: float):
        one_min_ago = now - 60.0
        self.request_windows[ident] = [t for t in self.request_windows[ident] if t > one_min_ago]
        self.token_windows[ident] = [
            (t, tokens) for t, tokens in self.token_windows[ident] if t > one_min_ago
        ]

    def check_and_record_request(self, identifier: str) -> Tuple[bool, str]:
        """
        Validates whether a request is allowed under the sliding window limit.
        Returns: (is_allowed: bool, rejection_message: str)
        """
        now = time.time()
        self._cleanup_old_entries(identifier, now)

        # Check requests per minute
        if len(self.request_windows[identifier]) >= gateway_settings.MAX_REQUESTS_PER_MINUTE:
            logger.warning(f"Rate limit exceeded for {identifier}: >{gateway_settings.MAX_REQUESTS_PER_MINUTE} req/min")
            return False, f"Rate limit exceeded: Maximum {gateway_settings.MAX_REQUESTS_PER_MINUTE} requests per minute."

        # Check daily token budget
        today = time.strftime("%Y-%m-%d")
        last_date, daily_count = self.daily_tokens.get(identifier, (today, 0))
        if last_date != today:
            daily_count = 0
            self.daily_tokens[identifier] = (today, 0)

        if daily_count >= gateway_settings.USER_DAILY_TOKEN_BUDGET:
            return False, f"Daily token budget exhausted ({gateway_settings.USER_DAILY_TOKEN_BUDGET} tokens/day)."

        # Record this request
        self.request_windows[identifier].append(now)
        return True, ""

    def record_token_usage(self, identifier: str, tokens: int):
        """Records token consumption for quota tracking."""
        now = time.time()
        self.token_windows[identifier].append((now, tokens))

        today = time.strftime("%Y-%m-%d")
        last_date, current_daily = self.daily_tokens.get(identifier, (today, 0))
        if last_date != today:
            current_daily = 0
        self.daily_tokens[identifier] = (today, current_daily + tokens)


rate_limiter = SlidingWindowRateLimiter()
