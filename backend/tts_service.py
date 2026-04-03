"""
tts_service.py
--------------
Converts text to speech and returns it as a base64 string
so the browser can play it directly.
"""

import base64
import io
from gtts import gTTS


def text_to_speech_base64(text, lang="en"):
    try:
        tts = gTTS(text=text, lang=lang, slow=False)
        buffer = io.BytesIO()
        tts.write_to_fp(buffer)
        buffer.seek(0)
        return base64.b64encode(buffer.read()).decode("utf-8")
    except Exception as e:
        print(f"TTS error: {e}")
        return ""