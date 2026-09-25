"""
guardrails/manager.py — Centralized Guardrails Orchestration.
Integrates input injection defense, PII scrubbing, safety rules, and output leakage protection.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from guardrails.injection import InjectionGuardrail
from guardrails.pii import PIIGuardrail
from guardrails.safety import IndustrialSafetyGuardrail
from guardrails.output_filter import OutputGuardrail
from logger import get_logger

logger = get_logger("guardrails")


class GuardrailInputDecision(BaseModel):
    is_blocked: bool = False
    sanitized_text: str
    rejection_reason: Optional[str] = None
    pii_redacted: list = Field(default_factory=list)
    is_emergency: bool = False
    is_safety_violation: bool = False


class GuardrailOutputDecision(BaseModel):
    sanitized_text: str
    warnings: list = Field(default_factory=list)
    has_safety_mandate: bool = False


class GuardrailsManager:
    """Enterprise Guardrail Engine for validating inputs and outputs."""

    @classmethod
    def process_input(cls, user_prompt: str) -> GuardrailInputDecision:
        # 1. Check for prompt injection / jailbreak
        is_injected, inject_reason = InjectionGuardrail.check_injection(user_prompt)
        if is_injected:
            logger.warning(f"Guardrail BLOCKED input due to injection attempt: {inject_reason}")
            return GuardrailInputDecision(
                is_blocked=True,
                sanitized_text="",
                rejection_reason=f"Security Policy Violation: {inject_reason}"
            )

        # 2. Check for hazardous safety instructions
        is_unsafe, safety_reason = IndustrialSafetyGuardrail.check_safety_violation(user_prompt)
        if is_unsafe:
            logger.warning(f"Guardrail BLOCKED input due to safety violation: {safety_reason}")
            return GuardrailInputDecision(
                is_blocked=True,
                sanitized_text="",
                rejection_reason=f"Industrial Safety Violation: {safety_reason}",
                is_safety_violation=True
            )

        # 3. Detect emergencies
        is_emergency = IndustrialSafetyGuardrail.is_critical_emergency(user_prompt)

        # 4. Scrub and mask PII
        sanitized, redactions = PIIGuardrail.redact(user_prompt)
        if redactions:
            logger.info(f"Guardrail masked {len(redactions)} PII entities.")

        return GuardrailInputDecision(
            is_blocked=False,
            sanitized_text=sanitized,
            pii_redacted=redactions,
            is_emergency=is_emergency
        )

    @classmethod
    def process_output(cls, model_output: str, is_emergency: bool = False, is_industrial: bool = False) -> GuardrailOutputDecision:
        # 1. Output leakage & PII scrubbing
        clean_text, warnings = OutputGuardrail.sanitize_output(model_output)

        # 2. Safety mandate injection for industrial/emergency contexts
        if is_emergency or is_industrial:
            clean_text = IndustrialSafetyGuardrail.inject_safety_mandate(clean_text, is_emergency=is_emergency)
            has_mandate = True
        else:
            has_mandate = False

        return GuardrailOutputDecision(
            sanitized_text=clean_text,
            warnings=warnings,
            has_safety_mandate=has_mandate
        )


guardrails = GuardrailsManager()
