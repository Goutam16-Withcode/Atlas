"""
gateway/cache.py — Enterprise Hybrid Deterministic & Semantic Vector Cache.
Delivers sub-millisecond cached responses for exact and semantically similar queries,
dramatically slashing LLM token costs, rate limits, and latency.
"""

import time
import hashlib
import math
import re
from typing import Optional, Dict, Any, List, Tuple
import numpy as np

from gateway.config import gateway_settings
from logger import get_logger

logger = get_logger("gateway.cache")


class SemanticVectorCache:
    """
    Two-tier response cache:
      Tier 1: O(1) Exact SHA-256 normalized string hash
      Tier 2: Sub-millisecond Semantic Vector Cosine Similarity Search (threshold >= 0.94)
    """

    def __init__(self, semantic_threshold: float = 0.94, embedding_dim: int = 128):
        self.semantic_threshold = semantic_threshold
        self.embedding_dim = embedding_dim
        # Key -> Entry
        self._store: Dict[str, Dict[str, Any]] = {}
        # List of (key, prompt_text, normalized_vector)
        self._vector_index: List[Tuple[str, str, np.ndarray]] = []
        self.total_exact_hits = 0
        self.total_semantic_hits = 0
        self.total_misses = 0

    def _generate_key(self, prompt: str, model: str, temperature: float) -> str:
        normalized = prompt.strip().lower()
        payload = f"{model}:{temperature:.2f}:{normalized}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def _embed(self, text: str) -> np.ndarray:
        """Fast, deterministic subword and token n-gram dense embedding into unit vector."""
        tokens = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", text.lower())
        vec = np.zeros(self.embedding_dim, dtype=np.float32)
        if not tokens:
            return vec

        for idx, token in enumerate(tokens):
            # Token hash projection
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest()[:8], 16)
            pos = h % self.embedding_dim
            sign = 1.0 if ((h >> 4) & 1) else -1.0
            vec[pos] += sign * (1.0 + 0.1 * min(len(token), 10))

            # Character tri-grams for typo-resilience and inflection matching
            if len(token) >= 3:
                for j in range(len(token) - 2):
                    tri = token[j:j+3]
                    th = int(hashlib.md5(tri.encode("utf-8")).hexdigest()[:6], 16)
                    vec[th % self.embedding_dim] += 0.3 * sign

        norm = np.linalg.norm(vec)
        if norm > 1e-9:
            vec /= norm
        return vec

    def get(self, prompt: str, model: str, temperature: float = 0.0) -> Optional[Any]:
        if not gateway_settings.CACHE_ENABLED:
            return None

        # Tier 1: Exact Hash Match
        key = self._generate_key(prompt, model, temperature)
        entry = self._store.get(key)
        now = time.time()

        if entry:
            if now - entry["timestamp"] <= gateway_settings.CACHE_TTL_SECONDS:
                entry["hits"] += 1
                self.total_exact_hits += 1
                logger.info(f"Gateway Cache EXACT HIT (hits: {entry['hits']})")
                return entry["response"]
            else:
                self._remove_key(key)

        # Tier 2: Semantic Vector Similarity Match
        if self._vector_index:
            query_vec = self._embed(prompt)
            best_sim = -1.0
            best_key = None

            for stored_key, stored_text, stored_vec in self._vector_index:
                # Fast dot product on unit-normalized vectors
                sim = float(np.dot(query_vec, stored_vec))
                if sim > best_sim:
                    best_sim = sim
                    best_key = stored_key

            if best_sim >= self.semantic_threshold and best_key and best_key in self._store:
                sem_entry = self._store[best_key]
                if now - sem_entry["timestamp"] <= gateway_settings.CACHE_TTL_SECONDS:
                    sem_entry["hits"] += 1
                    self.total_semantic_hits += 1
                    logger.info(f"Gateway Cache SEMANTIC HIT (sim: {best_sim:.4f}, hits: {sem_entry['hits']})")
                    return sem_entry["response"]

        self.total_misses += 1
        return None

    def set(self, prompt: str, model: str, temperature: float, response: Any):
        if not gateway_settings.CACHE_ENABLED:
            return

        # Evict oldest if reaching capacity
        if len(self._store) >= gateway_settings.MAX_CACHE_ENTRIES:
            oldest_key = min(self._store.keys(), key=lambda k: self._store[k]["timestamp"])
            self._remove_key(oldest_key)

        key = self._generate_key(prompt, model, temperature)
        vec = self._embed(prompt)
        
        self._store[key] = {
            "response": response,
            "prompt": prompt,
            "timestamp": time.time(),
            "hits": 0,
        }
        self._vector_index.append((key, prompt, vec))

    def _remove_key(self, key: str):
        if key in self._store:
            del self._store[key]
        self._vector_index = [item for item in self._vector_index if item[0] != key]

    def get_stats(self) -> Dict[str, Any]:
        total_hits = self.total_exact_hits + self.total_semantic_hits
        total = total_hits + self.total_misses
        hit_ratio = (total_hits / total * 100) if total > 0 else 0.0
        return {
            "total_cached_entries": len(self._store),
            "exact_cache_hits": self.total_exact_hits,
            "semantic_cache_hits": self.total_semantic_hits,
            "cache_hits": total_hits,
            "cache_misses": self.total_misses,
            "hit_ratio_percent": round(hit_ratio, 2),
        }


# Global singleton instance
gateway_cache = SemanticVectorCache()
