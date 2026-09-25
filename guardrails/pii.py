"""
guardrails/pii.py — Personally Identifiable Information (PII) Masking & Redaction.
Scans user inputs and agent outputs for sensitive data:
- Email addresses
- Phone numbers
- US Social Security Numbers (SSN)
- Credit Card Numbers (Luhn-compliant or pattern)
- API Keys / Passwords / Private Keys
"""

import re
from typing import Tuple, Dict, List


class PIIGuardrail:
    EMAIL_REGEX = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    PHONE_REGEX = r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
    SSN_REGEX = r"\b\d{3}-\d{2}-\d{4}\b"
    CREDIT_CARD_REGEX = r"\b(?:\d{4}[-\s]?){3}\d{4}\b"
    API_KEY_REGEX = r"(?i)\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-\.]{16,})['\"]?"

    @classmethod
    def redact(cls, text: str) -> Tuple[str, List[Dict[str, str]]]:
        """
        Redacts sensitive PII from text and replaces with anonymized tokens.
        Returns: (sanitized_text, list_of_redactions)
        """
        redactions = []
        sanitized = text

        # 1. API Keys & Secrets
        def replace_secret(match):
            secret_val = match.group(1)
            redactions.append({"type": "API_KEY", "value": secret_val})
            return match.group(0).replace(secret_val, "[REDACTED_API_KEY]")

        sanitized = re.sub(cls.API_KEY_REGEX, replace_secret, sanitized)

        # 2. SSN
        for match in re.finditer(cls.SSN_REGEX, sanitized):
            val = match.group(0)
            redactions.append({"type": "SSN", "value": val})
            sanitized = sanitized.replace(val, "[REDACTED_SSN]")

        # 3. Credit Cards
        for match in re.finditer(cls.CREDIT_CARD_REGEX, sanitized):
            val = match.group(0)
            redactions.append({"type": "CREDIT_CARD", "value": val})
            sanitized = sanitized.replace(val, "[REDACTED_CARD]")

        # 4. Emails
        for match in re.finditer(cls.EMAIL_REGEX, sanitized):
            val = match.group(0)
            redactions.append({"type": "EMAIL", "value": val})
            sanitized = sanitized.replace(val, "[REDACTED_EMAIL]")

        # 5. Phone Numbers (only if formatted like a valid phone)
        for match in re.finditer(cls.PHONE_REGEX, sanitized):
            val = match.group(0)
            # Exclude simple date formats or numbers
            if len(val.strip()) >= 10:
                redactions.append({"type": "PHONE", "value": val})
                sanitized = sanitized.replace(val, "[REDACTED_PHONE]")

        return sanitized, redactions
