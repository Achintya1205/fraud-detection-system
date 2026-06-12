from fastapi import APIRouter
from pydantic import BaseModel
from api.models.loader import THRESHOLD

router = APIRouter()

class ExplainRequest(BaseModel):
    text: str
    confidence: float

class ExplainResponse(BaseModel):
    linguistic_flags : list
    risk_level       : str
    explanation      : str

@router.post("/", response_model=ExplainResponse)
def explain_review(request: ExplainRequest):
    words      = request.text.lower().split()
    word_count = len(words)
    flags      = []

    suspicious_words = [
        'amazing', 'perfect', 'love', 'best', 'awesome',
        'excellent', 'great', 'fantastic', 'wonderful', 'superb'
    ]
    matches = [w for w in words if w in suspicious_words]

    if word_count < 20:
        flags.append(f"Very short review ({word_count} words)")
    if len(matches) >= 2:
        flags.append(f"Multiple generic positive words: {', '.join(matches[:3])}")
    if request.text == request.text.upper() and len(request.text) > 5:
        flags.append("ALL CAPS text detected")
    if len(set(words)) / max(len(words), 1) < 0.6:
        flags.append("Low vocabulary diversity")

    if request.confidence >= 0.65:
        risk_level  = "HIGH"
        explanation = f"Fraud probability of {request.confidence*100:.1f}% with {len(flags)} linguistic flags. Strong indicators of fake review."
    elif request.confidence >= THRESHOLD:
        risk_level  = "MEDIUM"
        explanation = f"Fraud probability of {request.confidence*100:.1f}%. Some suspicious patterns — recommend manual review."
    else:
        risk_level  = "LOW"
        explanation = f"Fraud probability of {request.confidence*100:.1f}%. Language patterns consistent with genuine reviews."

    return ExplainResponse(
        linguistic_flags = flags if flags else ["No suspicious patterns detected"],
        risk_level       = risk_level,
        explanation      = explanation
    )