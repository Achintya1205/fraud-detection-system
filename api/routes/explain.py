from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from api.models.loader import get_fusion_model, get_ensemble_config
from api.models.features import get_behavioral_features

router = APIRouter()

class ExplainRequest(BaseModel):
    text: str
    confidence: float
    reviewer_id: Optional[str] = None
    roberta_score: Optional[float] = None
    lightgbm_score: Optional[float] = None

class ExplainResponse(BaseModel):
    linguistic_flags: list
    behavioral_flags: list
    fusion_breakdown: Optional[dict] = None
    risk_level: str
    explanation: str

def get_linguistic_flags(text: str) -> list:
    words = text.lower().split()
    word_count = len(words)
    flags = []

    suspicious_words = [
        'amazing', 'perfect', 'love', 'best', 'awesome',
        'excellent', 'great', 'fantastic', 'wonderful', 'superb'
    ]
    matches = [w for w in words if w in suspicious_words]

    if word_count < 20:
        flags.append(f"Very short review ({word_count} words)")
    if len(matches) >= 2:
        flags.append(f"Multiple generic positive words: {', '.join(matches[:3])}")
    if text == text.upper() and len(text) > 5:
        flags.append("ALL CAPS text detected")
    if len(set(words)) / max(len(words), 1) < 0.6:
        flags.append("Low vocabulary diversity")

    return flags if flags else ["No suspicious language patterns detected"]

def get_behavioral_flags(reviewer_id: str) -> list:
    features = get_behavioral_features(reviewer_id)
    if features is None:
        return ["No reviewer history available"]

    config = get_ensemble_config()
    feature_names = config['features']
    values = dict(zip(feature_names, features[0]))
    flags = []

    if values['reviews_last_7_days'] >= 5:
        flags.append(f"High review velocity: {int(values['reviews_last_7_days'])} reviews in the last 7 days")
    if values['graph_degree'] >= 100:
        flags.append(f"Highly connected reviewer network: {int(values['graph_degree'])} linked reviewers")
    if values['community_id'] != -1:
        flags.append(f"Belongs to detected community #{int(values['community_id'])}")
    if values['unique_products'] > 0 and values['total_reviews'] / max(values['unique_products'], 1) > 3:
        flags.append("Reviews concentrated on a narrow set of products")

    return flags if flags else ["No suspicious behavioral patterns detected"]


def get_fusion_breakdown(roberta_score: float, lightgbm_score: float) -> dict:
    fusion_model = get_fusion_model()
    coefs = fusion_model.coef_[0]
    roberta_weight, lgb_weight = coefs[0], coefs[1]

    roberta_contribution = roberta_weight * roberta_score
    lgb_contribution = lgb_weight * lightgbm_score
    total = abs(roberta_contribution) + abs(lgb_contribution)

    return {
        "roberta_weight": round(float(roberta_weight), 3),
        "lightgbm_weight": round(float(lgb_weight), 3),
        "roberta_contribution_pct": round(abs(roberta_contribution) / total * 100, 1) if total > 0 else 0,
        "lightgbm_contribution_pct": round(abs(lgb_contribution) / total * 100, 1) if total > 0 else 0,
    }


@router.post("/", response_model=ExplainResponse)
def explain_review(request: ExplainRequest):
    linguistic_flags = get_linguistic_flags(request.text)

    behavioral_flags = ["No reviewer context provided"]
    fusion_breakdown = None

    if request.reviewer_id:
        behavioral_flags = get_behavioral_flags(request.reviewer_id)

        if request.roberta_score is not None and request.lightgbm_score is not None:
            fusion_breakdown = get_fusion_breakdown(request.roberta_score, request.lightgbm_score)

    total_flags = len([f for f in linguistic_flags if "No suspicious" not in f]) + \
                  len([f for f in behavioral_flags if "No suspicious" not in f and "No reviewer" not in f])

    if request.confidence >= 0.65:
        risk_level = "HIGH"
        explanation = f"Fraud probability of {request.confidence*100:.1f}% with {total_flags} combined flags across text and behavior. Strong indicators of fake review."
    elif request.confidence >= 0.40:
        risk_level = "MEDIUM"
        explanation = f"Fraud probability of {request.confidence*100:.1f}%. Some suspicious patterns — recommend manual review."
    else:
        risk_level = "LOW"
        explanation = f"Fraud probability of {request.confidence*100:.1f}%. Patterns consistent with genuine reviews."

    return ExplainResponse(
        linguistic_flags=linguistic_flags,
        behavioral_flags=behavioral_flags,
        fusion_breakdown=fusion_breakdown,
        risk_level=risk_level,
        explanation=explanation
    )