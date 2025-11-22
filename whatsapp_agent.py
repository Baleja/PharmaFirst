import os
import requests
from typing import Annotated
from typing_extensions import TypedDict

# FastAPI & Twilio
from fastapi import FastAPI, Form, Request
from fastapi.responses import PlainTextResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from twilio.twiml.voice_response import VoiceResponse
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client

# LangChain & LangGraph
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver

# --- CONFIGURATION ---
# Set these in your environment or replace strings below
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-...")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "AC...")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "...")
# THIS MUST BE YOUR PUBLIC NGROK URL (e.g., https://1234.ngrok-free.app)
# Do not add a trailing slash
BASE_URL = os.getenv("BASE_URL", "https://your-ngrok-url.ngrok-free.app") 

# Initialize Clients
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
llm = ChatOpenAI(model="gpt-4o-mini", api_key=OPENAI_API_KEY)

# --- LANGGRAPH SETUP ---

class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]

def chatbot(state: State):
    return {"messages": [llm.invoke(state["messages"])]}

# Build the Graph
graph_builder = StateGraph(State)
graph_builder.add_node("chatbot", chatbot)
graph_builder.add_edge(START, "chatbot")
graph_builder.add_edge("chatbot", END)

# Memory ensures context is kept based on phone number
memory = MemorySaver()
app_graph = graph_builder.compile(checkpointer=memory)

# --- FASTAPI SETUP ---
app = FastAPI()
# Mount a static directory to serve audio files for voice calls
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- HELPER FUNCTIONS ---

def run_agent(user_input: str, user_id: str) -> str:
    """Runs the LangGraph agent and returns the text response."""
    config = {"configurable": {"thread_id": user_id}}
    
    # Invoke graph
    events = app_graph.invoke(
        {"messages": [HumanMessage(content=user_input)]}, 
        config=config
    )
    
    # Extract last AI response
    return events["messages"][-1].content

def text_to_speech_file(text: str, filename: str):
    """Uses OpenAI to convert text to speech and saves as MP3."""
    url = "https://api.openai.com/v1/audio/speech"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
    data = {"model": "tts-1", "input": text, "voice": "alloy"}
    
    response = requests.post(url, headers=headers, json=data)
    with open(f"static/{filename}", "wb") as f:
        f.write(response.content)

def transcribe_audio(media_url: str) -> str:
    """Downloads audio from Twilio and transcribes via Whisper."""
    # 1. Download Audio
    # Note: Twilio requires basic auth to download recordings
    r = requests.get(media_url, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN))
    if r.status_code != 200:
        return "Error processing audio."
    
    temp_filename = "temp_rec.wav"
    with open(temp_filename, 'wb') as f:
        f.write(r.content)
        
    # 2. Transcribe
    with open(temp_filename, "rb") as audio_file:
        import openai
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        transcript = client.audio.transcriptions.create(
            model="whisper-1", 
            file=audio_file
        )
    return transcript.text

# --- ROUTES ---

@app.get("/")
async def root():
    return {"status": "Agent is running"}

# 1. WHATSAPP HANDLER
@app.post("/whatsapp")
async def whatsapp_reply(From: str = Form(...), Body: str = Form(...)):
    """Handles incoming WhatsApp messages."""
    print(f"WhatsApp from {From}: {Body}")
    
    # Run Agent
    response_text = run_agent(Body, user_id=From)
    
    # Send back via Twilio TwiML
    resp = MessagingResponse()
    resp.message(response_text)
    return PlainTextResponse(str(resp), media_type="application/xml")

# 2. VOICE HANDLER (Initial Call)
@app.post("/call")
async def call_start():
    """When the phone rings, this endpoint is hit."""
    resp = VoiceResponse()
    resp.say("Hello! I am your AI assistant. Please speak after the beep.")
    # Record the user's speech
    resp.record(
        action=f"{BASE_URL}/call_process", # Send recording here
        play_beep=True,
        max_length=10, # Max recording time
        timeout=2      # Stop recording if silence for 2s
    )
    return PlainTextResponse(str(resp), media_type="application/xml")

# 3. VOICE PROCESSING (After Recording)
@app.post("/call_process")
async def call_process(RecordingUrl: str = Form(...), From: str = Form(...)):
    """Processes the audio, runs agent, speaks back."""
    print(f"Processing Call Audio from {From}")
    
    # 1. Transcribe
    user_text = transcribe_audio(RecordingUrl)
    print(f"Transcribed: {user_text}")
    
    # 2. Get Agent Response
    ai_text = run_agent(user_text, user_id=From)
    
    # 3. Generate Audio Response (TTS)
    audio_filename = f"response_{From.replace('+','')}.mp3"
    text_to_speech_file(ai_text, audio_filename)
    
    # 4. Build TwiML to play audio and listen again
    resp = VoiceResponse()
    resp.play(f"{BASE_URL}/static/{audio_filename}")
    
    # Loop back to record user again (Conversation loop)
    resp.record(
        action=f"{BASE_URL}/call_process",
        play_beep=False,
        timeout=2
    )
    
    return PlainTextResponse(str(resp), media_type="application/xml")

if __name__ == "__main__":
    import uvicorn
    print("Starting Server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)