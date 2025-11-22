"""
Voice webhook handlers for Twilio calls. This uses TwiML to ask questions and receive speech via <Gather>.
Flow:
 - /webhook/voice -> returns TwiML asking greeting question and pointing action to /webhook/voice/collect
 - /webhook/voice/collect -> receives Twilio's speech/DTMF result, updates GraphManager and responds with next TwiML

Note: For a real streaming/fully conversational call you'd integrate Twilio Media Streams or LiveKit.
"""
from fastapi import Request, HTTPException
from fastapi.responses import Response
from twilio.twiml.voice_response import VoiceResponse, Gather, Say
import logging
from agent.graph import graph_manager

logger = logging.getLogger(__name__)


async def handle_voice(request: Request):
    # Twilio initial webhook when call connects
    params = await request.form()
    from_number = params.get('From')
    session_id = params.get('CallSid') or from_number

    # ensure session
    if not graph_manager.get(session_id):
        graph_manager.new_session(session_id, phone_number=from_number, channel='voice')

    # Ask initial question with speech gather
    resp = VoiceResponse()
    gather = Gather(input='speech', action='/webhook/voice/collect', method='POST', timeout=5)
    gather.say('Hello. This is Pharmacy First. To start, please tell me your full name and date of birth.', voice='alice')
    resp.append(gather)
    resp.say("I didn't receive any input. Goodbye.")
    return Response(content=str(resp), media_type='application/xml')


async def handle_voice_collect(request: Request):
    try:
        params = await request.form()
        speech_result = params.get('SpeechResult') or params.get('TranscriptionText') or ''
        call_sid = params.get('CallSid')
        session_id = call_sid

        if not graph_manager.get(session_id):
            graph_manager.new_session(session_id, phone_number=params.get('From'), channel='voice')

        state = graph_manager.handle_message(session_id, speech_result)
        reply_text = state.get('agent_response', 'Thanks. Goodbye.')

        resp = VoiceResponse()
        resp.say(reply_text, voice='alice')

        # If expecting more input (e.g., more triage questions), ask again
        if state['conversation_stage'] in ['triage_start', 'triage_assessment'] and not state['requires_urgent_care']:
            gather = Gather(input='speech', action='/webhook/voice/collect', method='POST', timeout=5)
            gather.say('Could you tell me a bit more about your symptoms?', voice='alice')
            resp.append(gather)
        else:
            resp.say('Thank you. If you need further help, we will follow up by message. Goodbye.', voice='alice')
            resp.hangup()

        return Response(content=str(resp), media_type='application/xml')
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))
