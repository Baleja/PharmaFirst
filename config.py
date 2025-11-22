import os
from dotenv import load_dotenv
from typing import List

load_dotenv()

class Config:
    # OpenAI
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
    
    # Weaviate
    WEAVIATE_URL = os.getenv("WEAVIATE_URL", "http://localhost:8080")
    WEAVIATE_API_KEY = os.getenv("WEAVIATE_API_KEY")
    
    # Valyu
    VALYU_API_KEY = os.getenv("VALYU_API_KEY")
    VALYU_BASE_URL = "https://api.valyu.ai"
    
    # WhatsApp
    WHATSAPP_ACCOUNT_SID = os.getenv("WHATSAPP_ACCOUNT_SID")
    WHATSAPP_AUTH_TOKEN = os.getenv("WHATSAPP_AUTH_TOKEN")
    WHATSAPP_NUMBER = os.getenv("WHATSAPP_NUMBER")
    
    # Application
    PORT = int(os.getenv("PORT", 8000))
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    
    # Supported Languages
    SUPPORTED_LANGUAGES: List[str] = [
        "en", "ur", "es", "fr", "de", "it", 
        "pt", "ar", "hi", "bn", "pa", "pl", "ro"
    ]
    
    # NHS Pharmacy First
    NHS_PHARMACY_BOOKING_URL = "https://www.nhs.uk/nhs-services/prescriptions-and-pharmacies/pharmacy-first/"

config = Config()
