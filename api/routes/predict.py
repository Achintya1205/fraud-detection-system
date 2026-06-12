from fastapi import APIRouter
from pydantic import BaseModel
import torch
from api.models.loader import get_model, get_tokenizer, get_device, THRESHOLD

router = APIRouter()

# ── Request/Response schemas ──────────────────────────────────
class ReviewRequest(BaseModel):
    text: str

class ReviewResponse(BaseModel):
    fraud: bool
    confidence: float
    threshold: float
    verdict: str
    word_count: int

# ── Predict endpoint ──────────────────────────────────────────
@router.post("/", response_model=ReviewResponse)
def predict_review(request: ReviewRequest):
    model     = get_model()
    tokenizer = get_tokenizer()
    device    = get_device()

    encoding = tokenizer(
        request.text,
        padding='max_length',
        truncation=True,
        max_length=128,
        return_tensors='pt'
    )

    input_ids      = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)

    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        prob    = torch.softmax(outputs.logits, dim=1)[:, 1].item()

    is_fraud = prob >= THRESHOLD

    if prob >= 0.65:
        verdict = "HIGH RISK — Strong fraud indicators detected"
    elif prob >= 0.40:
        verdict = "MEDIUM RISK — Some suspicious patterns detected"
    else:
        verdict = "LOW RISK — Review appears legitimate"

    return ReviewResponse(
        fraud      = is_fraud,
        confidence = round(prob, 4),
        threshold  = THRESHOLD,
        verdict    = verdict,
        word_count = len(request.text.split())
    )