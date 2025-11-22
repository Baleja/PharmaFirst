"""
Simple GraphManager to orchestrate the conversation flow.
This is an MVP-friendly, lightweight substitute for a full LangGraph setup.
It manages state transitions and delegates to node functions implemented in `agent.nodes`.

The project uses this GraphManager as the conversation controller.
"""
from typing import Dict
from agent.state import AgentState
import agent.nodes as nodes


class GraphManager:
    def __init__(self):
        # In-memory session store: session_id -> AgentState
        self.sessions: Dict[str, AgentState] = {}

    def new_session(self, session_id: str, phone_number: str, channel: str = "whatsapp") -> AgentState:
        state: AgentState = {
            'phone_number': phone_number,
            'patient_id': None,
            'patient_name': None,
            'birthday': None,
            'preferred_language': 'en',
            'conversation_stage': 'greeting',
            'messages': [],
            'user_input': '',
            'agent_response': '',
            'symptoms': [],
            'symptom_severity': None,
            'condition_detected': None,
            'requires_urgent_care': False,
            'prescription_query': None,
            'prescription_results': [],
            'timestamp': '',
            'session_id': session_id,
            'channel': channel
        }
        self.sessions[session_id] = state
        return state

    def get(self, session_id: str) -> AgentState:
        return self.sessions.get(session_id)

    def handle_message(self, session_id: str, user_input: str) -> AgentState:
        state = self.sessions.get(session_id)
        if not state:
            raise ValueError("Session not found")

        state['user_input'] = user_input

        # routing
        node = nodes.router_node(state)
        if node == 'greeting':
            new_state = nodes.greeting_node(state)
        elif node == 'collect_info':
            new_state = nodes.collect_info_node(state)
        elif node == 'triage_assessment':
            new_state = nodes.triage_assessment_node(state)
        elif node == 'booking_guidance':
            new_state = nodes.booking_guidance_node(state)
        elif node == 'prescription_query':
            new_state = nodes.prescription_query_node(state)
        else:
            new_state = nodes.greeting_node(state)

        # persist
        self.sessions[session_id] = new_state
        return new_state


# global manager for simple use
graph_manager = GraphManager()
