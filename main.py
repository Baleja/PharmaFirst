from fastapi import FastAPI, Request
import uvicorn
import logging
from config import config
from api import whatsapp, voice

logger = logging.getLogger(__name__)
app = FastAPI(title="Healthcare Agent")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "healthcare-agent"}

@app.post("/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    payload = await request.form()
    # Delegate to handler (Twilio posts form-encoded)
    return await whatsapp.handle_whatsapp(dict(payload))

@app.post("/webhook/voice")
async def voice_webhook(request: Request):
    # Twilio voice initial webhook sends form-encoded data
    return await voice.handle_voice(request)

@app.post('/webhook/voice/collect')
async def voice_collect(request: Request):
    return await voice.handle_voice_collect(request)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=config.PORT, log_level=config.LOG_LEVEL.lower())
