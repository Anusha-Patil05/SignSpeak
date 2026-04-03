"""
gesture_engine.py
-----------------
Looks at which fingers are up or down and
maps that to a gesture name and word.
"""

import json
import math
from pathlib import Path

# Load the gesture labels
LABELS_PATH = Path(__file__).parent / "models" / "gesture_labels.json"
with open(LABELS_PATH) as f:
    GESTURE_MAP = json.load(f)["gestures"]


def get_finger_states(landmarks):
    """
    Returns which fingers are extended (up).
    landmarks = list of 21 points, each with x, y, z
    """
    if not landmarks or len(landmarks) < 21:
        return {}

    def lm(i):
        return landmarks[i]

    fingers = {}

    # Thumb: is tip further from wrist than the base?
    fingers["thumb"] = abs(lm(4)["x"] - lm(0)["x"]) > abs(lm(2)["x"] - lm(0)["x"])

    # Other fingers: tip y is higher (smaller) than pip y = finger is up
    tips = [8,  12, 16, 20]
    pips = [6,  10, 14, 18]
    names = ["index", "middle", "ring", "pinky"]

    for name, tip, pip in zip(names, tips, pips):
        fingers[name] = lm(tip)["y"] < lm(pip)["y"]

    return fingers


def distance(p1, p2):
    return math.sqrt((p1["x"] - p2["x"])**2 + (p1["y"] - p2["y"])**2)


def classify_gesture(landmarks):
    """
    Main function — takes 21 landmarks, returns gesture result dict.
    """
    if not landmarks or len(landmarks) < 21:
        return {"gesture": None, "word": None, "confidence": 0.0, "description": ""}

    f = get_finger_states(landmarks)
    lm = landmarks
    gesture = None
    confidence = 0.0

    thumb  = f.get("thumb")
    index  = f.get("index")
    middle = f.get("middle")
    ring   = f.get("ring")
    pinky  = f.get("pinky")

    # All fingers closed = FIST
    if not thumb and not index and not middle and not ring and not pinky:
        gesture, confidence = "fist", 0.95

    # All fingers open = OPEN HAND / Hello
    elif thumb and index and middle and ring and pinky:
        gesture, confidence = "open_hand", 0.94

    # Only thumb up = THUMBS UP or THUMBS DOWN
    elif thumb and not index and not middle and not ring and not pinky:
        if lm[4]["y"] < lm[2]["y"]:
            gesture, confidence = "thumbs_up", 0.93
        else:
            gesture, confidence = "thumbs_down", 0.91

    # Index + middle = PEACE
    elif not thumb and index and middle and not ring and not pinky:
        gesture, confidence = "peace", 0.92

    # Only index = POINT UP
    elif not thumb and index and not middle and not ring and not pinky:
        gesture, confidence = "point_up", 0.91

    # Thumb + index + pinky = I LOVE YOU
    elif thumb and index and not middle and not ring and pinky:
        gesture, confidence = "love", 0.90

    # Index + pinky = ROCK
    elif not thumb and index and not middle and not ring and pinky:
        gesture, confidence = "rock", 0.89

    # Thumb + pinky = CALL ME
    elif thumb and not index and not middle and not ring and pinky:
        gesture, confidence = "call_me", 0.88

    # Index + middle + ring = THREE
    elif not thumb and index and middle and ring and not pinky:
        gesture, confidence = "three", 0.88

    # Index + middle + ring + pinky = FOUR
    elif not thumb and index and middle and ring and pinky:
        gesture, confidence = "four", 0.87

    # Middle + ring + pinky up, thumb+index close = OK
    elif middle and ring and pinky:
        if distance(lm[4], lm[8]) < 0.06:
            gesture, confidence = "ok_sign", 0.86

    # Thumb + index close together, others down = PINCH
    elif not middle and not ring and not pinky:
        if distance(lm[4], lm[8]) < 0.05:
            gesture, confidence = "pinch", 0.85

    if gesture and gesture in GESTURE_MAP:
        info = GESTURE_MAP[gesture]
        return {
            "gesture": gesture,
            "word": info["word"],
            "confidence": confidence,
            "description": info["description"]
        }

    return {
        "gesture": "unknown",
        "word": None,
        "confidence": 0.0,
        "description": "Gesture not recognized"
    }