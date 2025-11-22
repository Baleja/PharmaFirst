"""
Multilingual helpers: language detection and translation using OpenAI as a simple backend.
Supports English, Urdu and Spanish explicitly; falls back to OpenAI translation for others.
"""
from langdetect import detect
import openai
from config import config
import logging

logger = logging.getLogger(__name__)
openai.api_key = config.OPENAI_API_KEY


def detect_language(text: str) -> str:
    if not text:
        return 'en'
    try:
        return detect(text)
    except Exception:
        return 'en'


def translate_text(text: str, target: str = 'en') -> str:
    """Simple translation using OpenAI. For hackathon MVP only."""
    if not text:
        return ''
    if target == 'en':
        # if already English, return
        try:
            lang = detect(text)
            if lang == 'en':
                return text
        except Exception:
            pass

    try:
        prompt = [
            {"role": "system", "content": "You are a helpful translator."},
            {"role": "user", "content": f"Translate the following text to {target}:\n\n{text}"}
        ]
        resp = openai.ChatCompletion.create(model=config.OPENAI_MODEL, messages=prompt, max_tokens=512)
        return resp['choices'][0]['message']['content']
    except Exception:
        logger.exception('Translation failed')
        return text
