from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from api.models.loader import get_df, get_graph_features, get_fraud_rings, get_model, get_tokenizer, get_device, THRESHOLD
import torch

router = APIRouter()

class ReviewerResponse(BaseModel):
    reviewer_id       : str
    name              : str
    total_reviews     : int
    avg_rating        : float
    unique_products   : int
    velocity          : int
    fraud_flag_rate   : float
    graph_degree      : int
    community_id      : int
    ring_size         : int
    ring_fraud_rate   : float
    fraud_score       : float
    verdict           : str

@router.get("/{reviewer_id}", response_model=ReviewerResponse)
def get_reviewer(reviewer_id: str):
    df             = get_df()
    graph_features = get_graph_features()
    fraud_rings    = get_fraud_rings()
    model          = get_model()
    tokenizer      = get_tokenizer()
    device         = get_device()

    reviewer_df = df[df['reviewerID'] == reviewer_id]
    if len(reviewer_df) == 0:
        raise HTTPException(status_code=404, detail="Reviewer not found")

    graph_row  = graph_features[graph_features['reviewerID'] == reviewer_id]
    graph_deg  = int(graph_row['graph_degree'].iloc[0]) if len(graph_row) > 0 else 0
    community  = int(reviewer_df['community_id'].iloc[0]) if 'community_id' in reviewer_df.columns else -1

    ring_row   = fraud_rings[fraud_rings['community_id'] == community]
    ring_size  = int(ring_row['size'].iloc[0])             if len(ring_row) > 0 else 0
    ring_fraud = float(ring_row['avg_fraud_score'].iloc[0]) if len(ring_row) > 0 else 0.0

    latest_review = str(reviewer_df.sort_values('reviewTime').iloc[-1]['reviewText'])

    encoding = tokenizer(
        latest_review,
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
        prob = torch.softmax(outputs.logits, dim=1)[:, 1].item()

    if prob >= 0.65 and graph_deg > 100:
        verdict = "HIGH RISK — Suspicious text and highly connected network"
    elif prob >= 0.40 and float(reviewer_df['fraud_flag'].mean()) >= 0.1:
        verdict = "MEDIUM RISK — Suspicious pattern detected"
    elif prob < 0.40 and graph_deg < 10:
        verdict = "LOW RISK — Looks legitimate"
    else:
        verdict = "REVIEW MANUALLY — Mixed signals"

    return ReviewerResponse(
        reviewer_id     = reviewer_id,
        name            = str(reviewer_df['reviewerName'].iloc[0]),
        total_reviews   = int(reviewer_df['total_reviews'].iloc[0]),
        avg_rating      = round(float(reviewer_df['avg_rating'].iloc[0]), 2),
        unique_products = int(reviewer_df['unique_products'].iloc[0]),
        velocity        = int(reviewer_df['reviews_last_7_days'].iloc[0]),
        fraud_flag_rate = round(float(reviewer_df['fraud_flag'].mean()), 2),
        graph_degree    = graph_deg,
        community_id    = community,
        ring_size       = ring_size,
        ring_fraud_rate = round(ring_fraud, 3),
        fraud_score     = round(prob, 4),
        verdict         = verdict
    )