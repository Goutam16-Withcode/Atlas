"""
guardrails/injection.py — Prompt Injection & Jailbreak Defense.
Detects direct prompt injection, jailbreaks, system instruction overrides,
and roleplay jailbreak exploits (DAN, AIM, Developer Mode, etc.).
"""

import re
from typing import Tuple, List, Optional


class InjectionGuardrail:
    # High-confidence jailbreak and instruction override signatures
    JAILBREAK_PATTERNS = [
        r"(?i)\bignore\s+(all\s+)?(previous|prior|above)\s+instructions\b",
        r"(?i)\bdisregard\s+(all\s+)?(previous|prior|system)\s+rules\b",
        r"(?i)\byou\s+are\s+now\s+(DAN|AIM|STAN|unrestricted|jailbroken|Developer\s+Mode)\b",
        r"(?i)\bpretend\s+(that\s+)?you\s+(have\s+no\s+filters|can\s+do\s+anything|are\s+evil)\b",
        r"(?i)\bdo\s+anything\s+now\b",
        r"(?i)\benter\s+(god|developer|debug|sudo|root)\s+mode\b",
        r"(?i)\breveal\s+(your\s+)?(system\s+prompt|initial\s+instructions|secret\s+instructions)\b",
        r"(?i)\bwhat\s+is\s+your\s+system\s+prompt\b",
        r"(?i)\boutput\s+everything\s+above\b",
        r"(?i)\bprint\s+your\s+hidden\s+rules\b",
        r"(?i)\boperating\s+without\s+any\s+(safety|ethical)\s+guidelines\b",
        r"(?i)\bbypass\s+safety\s+(filters|protocols|checks)\b",
    ]

    # Obfuscation checks: base64 patterns or hex dumps
    OBFUSCATION_PATTERNS = [
        r"(?i)\bdecode\s+this\s+base64\b",
        r"(?:[A-Za-z0-9+/]{40,}={0,2})",  # long base64 blobs
    ]

    MAX_INPUT_CHARS = 12000

    @classmethod
    def check_injection(cls, prompt: str) -> Tuple[bool, Optional[str]]:
        """
        Evaluates input text for prompt injection or jailbreak attempts.
        Returns: (is_blocked: bool, reason: Optional[str])
        """
        if not prompt or not prompt.strip():
            return False, None

        if len(prompt) > cls.MAX_INPUT_CHARS:
            return True, f"Input character count exceeds security threshold ({cls.MAX_INPUT_CHARS} chars)."

        for pattern in cls.JAILBREAK_PATTERNS:
            if re.search(pattern, prompt):
                return True, "Potential prompt injection or jailbreak pattern detected."

        # Check for repetitive prompt nesting / canary leak attempts
        if prompt.count("SYSTEM:") > 2 or prompt.count("<|im_start|>") > 0:
            return True, "Delimiter manipulation or synthetic system turn detected."

        return False, None
