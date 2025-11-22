"""
WhatsApp webhook handler using Twilio's webhook format.
Receives incoming messages, delegates to GraphManager, and replies via Twilio API.
"""
from fastapi import HTTPException, Request
import logging
from agent.graph import graph_manager
from agent.tools import send_whatsapp_message

logger = logging.getLogger(__name__)


async def handle_whatsapp(payload: dict):
    try:
        # Twilio sends 'From' and 'Body'
        from_number = payload.get('From') or payload.get('from')
        body = payload.get('Body') or payload.get('body') or ''
        session_id = from_number

        # create session if missing
        if not graph_manager.get(session_id):
            graph_manager.new_session(session_id, phone_number=from_number, channel='whatsapp')

        state = graph_manager.handle_message(session_id, body)

        reply = state.get('agent_response', '')
        # send message back via Twilio REST API (async call in our tools)
        await send_whatsapp_message(from_number, reply)

        return {"status": "ok", "reply": reply}
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))
