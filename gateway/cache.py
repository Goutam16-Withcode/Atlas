"""
gateway/cache.py — Deterministic Response Cache for LLM Gateway.
Caches repeated queries using normalized hashing, saving LLM tokens,
lowering API costs, and delivering sub-5ms latency for frequent queries.
"""

import time
import hashlib
from typing import Optional, Dict, Any
from gateway.config import gateway_settings
from logger import get_logger

logger = get_logger("gateway.cache")


class ResponseCache:
    def __init__(self):
        # Maps cache_key -> {"response": Any, "timestamp": float, "hits": int}
        self._store: Dict[str, Dict[str, Any]] = {}
        self.total_hits = 0
        self.total_misses = 0

    def _generate_key(self, prompt: str, model: str, temperature: float) -> str:
        # Normalize prompt (strip whitespace, lowercase)
        normalized = prompt.strip().lower()
        payload = f"{model}:{temperature:.2f}:{normalized}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def get(self, prompt: str, model: str, temperature: float = 0.0) -> Optional[Any]:
        if not gateway_settings.CACHE_ENABLED:
            return None

        key = self._generate_key(prompt, model, temperature)
        entry = self._store.get(key)
        if not entry:
            self.total_misses += 1
            return None

        # Check TTL
        if time.time() - entry["timestamp"] > gateway_settings.CACHE_TTL_SECONDS:
            del self._store[key]
            self.total_misses += 1
            return None

        entry["hits"] += 1
        self.total_hits += 1
        logger.info(f"Gateway Cache HIT for query (hits: {entry['hits']})")
        return entry["response"]

    def set(self, prompt: str, model: str, temperature: float, response: Any):
        if not gateway_settings.CACHE_ENABLED:
            return

        # Evict oldest if reaching capacity
        if len(self._store) >= gateway_settings.MAX_CACHE_ENTRIES:
            oldest_key = min(self._store.keys(), key=lambda k: self._store[k]["timestamp"])
            del self._store[oldest_key]

        key = self._generate_key(prompt, model, temperature)
        self._store[key] = {
            "response": response,
            "timestamp": time.time(),
            "hits": 0,
        }

    def get_stats(self) -> Dict[str, Any]:
        total = self.total_hits + self.total_misses
        hit_ratio = (self.total_hits / total * 100) if total > 0 else 0.0
        return {
            "total_cached_entries": len(self._store),
            "cache_hits": self.total_hits,
            "cache_misses": self.total_misses,
            "hit_ratio_percent": round(hit_ratio, 2),
        }


gateway_cache = ResponseCache()
