"""
Node implementations: greeting, collect_info, triage, booking guidance, prescription queries.
These nodes use OpenAI (via `openai` package) for natural language understanding where helpful,
and the `database.weaviate_client` for patient/prescription storage.

This file prefers simple, robust calls to OpenAI via the `openai` package to avoid fragile framework-specific
invocation code in a hackathon MVP.
"""
import openai
import logging
from datetime import datetime
from config import config
from services.multilingual import detect_language, translate_text
from services.triage import assess_uti_symptoms
from database.weaviate_client import weaviate_client

logger = logging.getLogger(__name__)
openai.api_key = config.OPENAI_API_KEY

OPENAI_MODEL = config.OPENAI_MODEL or "gpt-4o-mini"


def _openai_chat(messages, max_tokens=512, temperature=0.7):
    try:
        resp = openai.ChatCompletion.create(
            model=OPENAI_MODEL,
            messages=messages,
            temperature=temperature if 'temperature' in locals() else 0.7,
            max_tokens=max_tokens
        )
        return resp['choices'][0]['message']['content']
    except Exception as e:
        logger.exception("OpenAI call failed")
        return ""


def greeting_node(state):
    logger.info(f"Greeting node for {state['phone_number']}")
    user_text = state.get('user_input', '')

    detected = detect_language(user_text or "")
    state['preferred_language'] = detected

    patient = None
    try:
        patient = weaviate_client.get_patient(state['phone_number'])
    except Exception:
        logger.exception("Weaviate lookup failed")

    if patient:
        state['patient_id'] = patient.get('patient_id')
        state['patient_name'] = patient.get('name')
        state['birthday'] = patient.get('birthday')
        state['agent_response'] = f"Hello {state['patient_name']} — welcome back! How can I help you today?"
        state['conversation_stage'] = 'triage_start'
    else:
        # New user: ask for name
        state['agent_response'] = {
            'en': "Hi, I'm the Pharmacy First assistant. What's your full name?",
            'ur': "سلام! براہ کرم اپنا پورا نام بتائیں۔",
            'es': "Hola, soy el asistente de Pharmacy First. ¿Cuál es tu nombre completo?"
        }.get(detected, "Hi, I'm the Pharmacy First assistant. What's your full name?")
        state['conversation_stage'] = 'collect_info'

    state['messages'].append({'role': 'assistant', 'content': state['agent_response'], 'timestamp': datetime.now().isoformat()})
    return state


def collect_info_node(state):
    logger.info("collect_info_node")
    text = state.get('user_input', '')

    # Try to extract name and birthday naively
    name = state.get('patient_name')
    dob = state.get('birthday')

    # simple extraction heuristics
    if not name:
        # look for patterns: "My name is ..." or first capitalized words
        import re
        m = re.search(r"(?:name is|I'm|I am|my name is)\s+([A-Za-z][A-Za-z ]{1,50})", text, re.IGNORECASE)
        if m:
            name = m.group(1).strip()

    if not dob:
        # look for yyyy or dd/mm/yyyy patterns
        import re
        m = re.search(r"(\d{4}-\d{2}-\d{2})", text)
        if m:
            dob = m.group(1)
        else:
            m2 = re.search(r"(\d{1,2}/\d{1,2}/\d{2,4})", text)
            if m2:
                dob = m2.group(1)

    if name:
        state['patient_name'] = name

    if dob:
        state['birthday'] = dob

    if state.get('patient_name') and state.get('birthday'):
        # save to DB
        try:
            patient_data = {
                'patient_id': f"PAT_{state['phone_number'][-6:]}",
                'name': state['patient_name'],
                'birthday': state['birthday'],
                'phone_number': state['phone_number'],
                'preferred_language': state['preferred_language'],
                'medical_history': ''
            }
            uid = weaviate_client.upsert_patient(patient_data, state['phone_number'])
            state['patient_id'] = uid
        except Exception:
            logger.exception("Failed upsert patient")

        state['agent_response'] = f"Thanks {state['patient_name']} — how can I help you today?"
        state['conversation_stage'] = 'triage_start'
    elif state.get('patient_name'):
        state['agent_response'] = f"Nice to meet you, {state['patient_name']} — could you tell me your date of birth?"
    else:
        state['agent_response'] = "I didn't catch your name. What's your full name, please?"

    state['messages'].append({'role': 'assistant', 'content': state['agent_response'], 'timestamp': datetime.now().isoformat()})
    return state


def triage_assessment_node(state):
    logger.info("triage_assessment_node")
    text = state.get('user_input', '')

    # detect symptoms from free text using a small set
    symptom_keywords = ['pain', 'burn', 'burning', 'frequent', 'urgency', 'blood', 'fever', 'cloudy', 'back pain']
    found = []
    for kw in symptom_keywords:
        if kw in text.lower() and kw not in state['symptoms']:
            found.append(kw)
            state['symptoms'].append(kw)

    assessment = assess_uti_symptoms(state['symptoms'])
    state['condition_detected'] = assessment['condition']
    state['symptom_severity'] = assessment['severity']
    state['requires_urgent_care'] = assessment['urgent']

    if state['requires_urgent_care']:
        state['agent_response'] = "Based on your symptoms, please seek urgent care or call 111 immediately."
        state['conversation_stage'] = 'end'
    elif len(state['symptoms']) >= 2:
        state['agent_response'] = (
            "It sounds like you may have a UTI. I can help you find an NHS Pharmacy First nearby for assessment. "
            "Would you like me to find a local pharmacy and book a consultation?"
        )
        state['conversation_stage'] = 'booking_guidance'
    else:
        state['agent_response'] = (
            "Can you tell me if you have any of the following: pain or burning when urinating, needing to urinate more often, urgency, fever, or blood in your urine?"
        )

    state['messages'].append({'role': 'assistant', 'content': state['agent_response'], 'timestamp': datetime.now().isoformat()})
    return state


def booking_guidance_node(state):
    logger.info("booking_guidance_node")
    # Provide NHS Pharmacy First information and next steps
    link = config.NHS_PHARMACY_BOOKING_URL
    response = (
        "NHS Pharmacy First offers same-day assessment and treatment. "
        f"You can learn more and find participating pharmacies here: {link}. "
        "If you want, I can search for nearby pharmacies and share contact details."
    )
    state['agent_response'] = response
    state['conversation_stage'] = 'general_chat'
    state['messages'].append({'role': 'assistant', 'content': state['agent_response'], 'timestamp': datetime.now().isoformat()})
    return state


def prescription_query_node(state):
    logger.info("prescription_query_node")
    if not state.get('patient_id'):
        state['agent_response'] = "Please verify your name and date of birth first so I can look up prescriptions."
        state['conversation_stage'] = 'collect_info'
    else:
        results = []
        try:
            results = weaviate_client.search_prescriptions(query=state.get('user_input', ''), patient_id=state['patient_id'], limit=3)
        except Exception:
            logger.exception("Prescription search failed")

        state['prescription_results'] = results
        if results:
            parts = []
            for r in results:
                p = r.get('properties', {})
                parts.append(f"{p.get('medication_name')} {p.get('dosage')} - {p.get('instructions')}")
            state['agent_response'] = "I found these prescriptions: " + "; ".join(parts)
        else:
            state['agent_response'] = "I couldn't find prescriptions matching your query. Could you provide more details?"

        state['conversation_stage'] = 'general_chat'

    state['messages'].append({'role': 'assistant', 'content': state['agent_response'], 'timestamp': datetime.now().isoformat()})
    return state


def router_node(state):
    """Return node name based on intent heuristics and conversation stage."""
    text = state.get('user_input', '').lower()
    if any(k in text for k in ['prescription', 'medication', 'medicine', 'dosage']):
        return 'prescription_query'
    if any(k in text for k in ['pain', 'burn', 'uti', 'infection', 'frequent', 'urinate']):
        if state['conversation_stage'] in ['triage_start', 'triage_assessment', 'greeting']:
            return 'triage_assessment'
    return state['conversation_stage'] or 'greeting'
