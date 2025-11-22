from typing import TypedDict, List, Optional, Literal

class AgentState(TypedDict):
    """State for the healthcare agent conversation"""

    # User Information
    phone_number: str
    patient_id: Optional[str]
    patient_name: Optional[str]
    birthday: Optional[str]
    preferred_language: str

    # Conversation Flow
    conversation_stage: Literal[
        "greeting",
        "collect_info",
        "triage_start",
        "triage_assessment",
        "booking_guidance",
        "prescription_query",
        "general_chat",
        "end"
    ]

    # Messages
    messages: List[dict]  # Chat history
    user_input: str  # Current user message
    agent_response: str  # Agent's response

    # Triage Data
    symptoms: List[str]
    symptom_severity: Optional[str]
    condition_detected: Optional[str]
    requires_urgent_care: bool

    # Prescription Context
    prescription_query: Optional[str]
    prescription_results: List[dict]

    # Metadata
    timestamp: str
    session_id: str
    channel: Literal["whatsapp", "voice"]
