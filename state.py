"""
Shared graph state. Extends beyond plain messages to carry the
metadata a real support workflow needs: intent, escalation flag,
ticket info, retry counters, and a rolling summary of older turns.
"""
from typing import TypedDict, Annotated, Optional, Literal
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


IntentType = Literal["general", "technical_support", "knowledge_query", "escalation"]


class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]

    # Routing metadata
    intent: Optional[IntentType]

    # Rolling summary of older conversation turns (context compression)
    summary: Optional[str]

    # Escalation / ticketing
    needs_escalation: bool
    ticket_id: Optional[str]

    # Resilience bookkeeping
    retry_count: int
    error: Optional[str]

    # Cognitive Engine: Reflection & Self-Correction (Phase 1)
    critique_history: Optional[list[str]]
    reflection_passes: Optional[int]
    verification_passed: Optional[bool]
    plan_steps: Optional[list[str]]

    # Multi-Agent & Human-in-the-Loop Interlock (Phase 3)
    active_agent: Optional[str]
    hitl_pending: Optional[bool]
    hitl_action_details: Optional[dict]