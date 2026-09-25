"""
guardrails/output_filter.py — Output Guardrails & System Leakage Prevention.
Validates model output before delivering to user:
- Prevents system prompt leakage or internal instruction exposure
- Strips any accidentally leaked API keys, tokens, or DB credentials
- Enforces grounded industrial assertions
"""

import re
from typing import Tuple, Optional, List
from guardrails.pii import PIIGuardrail


class OutputGuardrail:
    SYSTEM_LEAK_TRIGGERS = [
        r"(?i)my\s+(system\s+prompt|core\s+instructions)\s+is[:\s]",
        r"(?i)you\s+are\s+atlas,\s+an\s+operations\s+assistant",
        r"(?i)═══════════════════════════════════════",
        r"(?i)task\s+classification\s+industrial/ops",
        r"(?i)response\s+formats\s+industrial\s+format\s+\(required\)",
        r"(?i)groq_api_key\s*=",
        r"(?i)DATABASE_URL\s*=",
    ]

    @classmethod
    def sanitize_output(cls, output_text: str) -> Tuple[str, List[str]]:
        """
        Sanitizes outgoing LLM responses:
        1. Strips leaked secrets or PII
        2. Detects and censors system prompt regurgitation
        Returns: (sanitized_text, warnings)
        """
        warnings = []
        clean_text = output_text

        # 1. PII & Secret Scrubbing on Output
        clean_text, redactions = PIIGuardrail.redact(clean_text)
        if redactions:
            warnings.append(f"Redacted {len(redactions)} sensitive items from model output.")

        # 2. System Prompt Regurgitation Check
        for trigger in cls.SYSTEM_LEAK_TRIGGERS:
            if re.search(trigger, clean_text):
                warnings.append("System instruction leakage detected and redacted.")
                clean_text = re.sub(trigger, "[CONFIDENTIAL_SYSTEM_DIRECTIVE]", clean_text)

        return clean_text, warnings
