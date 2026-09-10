from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
import torch
from api.models.loader import get_model, get_tokenizer, get_device, get_lgb_model, get_fusion_model, get_ensemble_config
from api.models.features import get_behavioral_features

router = APIRouter()

# Request/Response schemas
class ReviewRequest(BaseModel):
    text: str
    reviewer_id: Optional[str] = None   # enables ensemble scoring when provided

class ReviewResponse(BaseModel):
    fraud: bool
    confidence: float
    threshold: float
    verdict: str
    word_count: int
    method: str                          # "ensemble" or "text_only"
    roberta_score: float
    lightgbm_score: Optional[float] = None


def get_roberta_probability(text: str) -> float:
    tokenizer = get_tokenizer()
    model = get_model()
    device = get_device()

    encoding = tokenizer(
        text,
        padding='max_length',
        truncation=True,
        max_length=128,
        return_tensors='pt'
    )

    with torch.no_grad():
        outputs = model(
            input_ids=encoding['input_ids'].to(device),
            attention_mask=encoding['attention_mask'].to(device)
        )
        return torch.softmax(outputs.logits, dim=1)[:, 1].item()


# Predict endpoint
@router.post("/", response_model=ReviewResponse)
def predict_review(request: ReviewRequest):
    roberta_prob = get_roberta_probability(request.text)

    lgb_prob = None
    method = "text_only"
    confidence = roberta_prob
    threshold = 0.40 

    if request.reviewer_id:
        behavioral_features = get_behavioral_features(request.reviewer_id)

        if behavioral_features is not None:
            lgb_model = get_lgb_model()
            fusion_model = get_fusion_model()
            config = get_ensemble_config()

            lgb_prob = lgb_model.predict_proba(behavioral_features)[0][1]

            fusion_input = [[roberta_prob, lgb_prob]]
            confidence = fusion_model.predict_proba(fusion_input)[0][1]

            threshold = config['threshold']
            method = "ensemble"

    is_fraud = confidence >= threshold

    if confidence >= 0.65:
        verdict = "HIGH RISK — Strong fraud indicators detected"
    elif confidence >= threshold:
        verdict = "MEDIUM RISK — Some suspicious patterns detected"
    else:
        verdict = "LOW RISK — Review appears legitimate"

    if method == "text_only":
        verdict += " (text-only score — no reviewer history available for full ensemble)"

    return ReviewResponse(
        fraud=is_fraud,
        confidence=round(confidence, 4),
        threshold=round(threshold, 4),
        verdict=verdict,
        word_count=len(request.text.split()),
        method=method,
        roberta_score=round(roberta_prob, 4),
        lightgbm_score=round(float(lgb_prob), 4) if lgb_prob is not None else None
    )