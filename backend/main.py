"""
main.py
-------
The FastAPI server. Runs on http://localhost:8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
from pathlib import Path

from gesture_engine import classify_gesture
from tts_service import text_to_speech_base64

app = FastAPI(title="SignSpeak API")

# Allow the React app to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://sign-speak-eta.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ────────────────────────────────────────────────────────────────────

class Landmark(BaseModel):
    x: float
    y: float
    z: float

class ClassifyRequest(BaseModel):
    landmarks: list[Landmark]

class SpeakRequest(BaseModel):
    text: str
    lang: str = "en"

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "SignSpeak API"}


@app.get("/gestures")
def get_gestures():
    path = Path(__file__).parent / "models" / "gesture_labels.json"
    with open(path) as f:
        data = json.load(f)
    return {"gestures": data["gestures"], "count": len(data["gestures"])}


@app.post("/classify")
def classify(req: ClassifyRequest):
    if not req.landmarks:
        raise HTTPException(status_code=400, detail="No landmarks provided")
    landmarks = [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in req.landmarks]
    result = classify_gesture(landmarks)
    return result


@app.post("/speak")
def speak(req: SpeakRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is empty")
    audio = text_to_speech_base64(req.text, req.lang)
    if not audio:
        raise HTTPException(status_code=500, detail="TTS failed")
    return {"audio_base64": audio, "text": req.text}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)