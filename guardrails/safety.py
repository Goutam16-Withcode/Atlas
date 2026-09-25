"""
guardrails/safety.py — Industrial Safety & Compliance Guardrail.
Enforces plant safety rules, Lockout/Tagout (LOTO) requirements,
and catches hazardous instructions (bypassing interlocks, disabling safety valves).
"""

import re
from typing import Tuple, Optional


class IndustrialSafetyGuardrail:
    # Phrases that suggest bypassing critical plant safety mechanisms
    HAZARDOUS_PATTERNS = [
        r"(?i)\bbypass\s+(the\s+)?(safety\s+interlock|emergency\s+stop|e-stop|relief\s+valve)\b",
        r"(?i)\boverride\s+(the\s+)?(high\s+pressure\s+trip|temperature\s+trip|limit\s+switch)\b",
        r"(?i)\bignore\s+(the\s+)?(gas\s+leak|ammonia\s+leak|fire\s+alarm|toxic\s+fumes)\b",
        r"(?i)\bwork\s+inside\s+(the\s+)?(press|crusher|hopper)\s+without\s+(loto|lockout)\b",
        r"(?i)\bforce\s+(open|close)\s+the\s+isolation\s+valve\s+under\s+pressure\b",
    ]

    LOTO_KEYWORDS = ["lockout", "tagout", "loto", "energized", "zero energy state", "padlock"]
    CRITICAL_EMERGENCY_KEYWORDS = ["fire", "explosion", "leak", "toxic", "smoke", "injury", "emergency", "fatal"]

    @classmethod
    def check_safety_violation(cls, text: str) -> Tuple[bool, Optional[str]]:
        """Checks if the request asks the system to recommend an unsafe or illegal industrial operation."""
        for pattern in cls.HAZARDOUS_PATTERNS:
            if re.search(pattern, text):
                return True, "Request violates industrial safety guidelines (bypassing safety controls/LOTO)."
        return False, None

    @classmethod
    def is_critical_emergency(cls, text: str) -> bool:
        """Determines if the text describes a live physical emergency."""
        lower = text.lower()
        return any(kw in lower for kw in cls.CRITICAL_EMERGENCY_KEYWORDS)

    @classmethod
    def inject_safety_mandate(cls, original_response: str, is_emergency: bool = False) -> str:
        """Appends mandatory OSHA / Plant safety notices to outputs when safety-critical issues are discussed."""
        disclaimer = (
            "\n\n> ⚠️ **MANDATORY INDUSTRIAL SAFETY NOTICE:**\n"
            "> All procedures involving energized machinery or pressure vessels require strict adherence to "
            "OSHA 1910.147 (Lockout/Tagout - LOTO) protocols and authorized PPE. Never bypass interlocks."
        )
        if is_emergency:
            disclaimer = (
                "\n\n> 🚨 **CRITICAL LIFE-SAFETY ALERT:**\n"
                "> An active hazard was reported. Evacuate the immediate area and sound plant alarms immediately. "
                "Do not attempt manual intervention without HAZMAT / emergency response clearance."
            )
        if disclaimer not in original_response:
            return original_response + disclaimer
        return original_response
