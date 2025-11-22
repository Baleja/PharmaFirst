import logging
import os
from config import config
from twilio.rest import Client

logger = logging.getLogger(__name__)


def _twilio_client() -> Client:
    sid = os.getenv("TWILIO_ACCOUNT_SID") or config.WHATSAPP_ACCOUNT_SID
    token = os.getenv("TWILIO_AUTH_TOKEN") or config.WHATSAPP_AUTH_TOKEN
    return Client(sid, token)


async def send_whatsapp_message(to: str, message: str):
    """Send a WhatsApp message using Twilio."""
    try:
        client = _twilio_client()
        from_number = os.getenv("TWILIO_WHATSAPP_NUMBER") or config.WHATSAPP_NUMBER
        msg = client.messages.create(body=message, from_=from_number, to=to)
        logger.info(f"Sent WhatsApp message SID={msg.sid} to={to}")
        return True
    except Exception as e:
        logger.exception("Failed to send WhatsApp message")
        return False


def make_call(to_number: str, answer_url: str):
    """Place an outbound call via Twilio and request TwiML from `answer_url`."""
    try:
        client = _twilio_client()
        from_number = os.getenv("TWILIO_CALL_FROM") or config.WHATSAPP_NUMBER
        call = client.calls.create(to=to_number, from_=from_number, url=answer_url)
        logger.info(f"Started call SID={call.sid} to={to_number}")
        return call.sid
    except Exception as e:
        logger.exception("Failed to place call")
        return None


async def synthesize_voice(text: str):
    """Placeholder for TTS — Twilio <Say> used in TwiML responses instead."""
    logger.info(f"(placeholder) Synthesizing voice for text: {text[:40]}...")
    return b""
