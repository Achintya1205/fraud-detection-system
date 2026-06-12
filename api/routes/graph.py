from fastapi import APIRouter
from api.models.loader import get_fraud_rings, get_graph_features

router = APIRouter()

@router.get("/rings")
def get_fraud_rings_endpoint():
    fraud_rings = get_fraud_rings()
    rings = fraud_rings[fraud_rings['size'] >= 5].sort_values(
        'avg_fraud_score', ascending=False
    ).to_dict(orient='records')
    return {"total_rings": len(rings), "rings": rings}

@router.get("/top-reviewers")
def get_top_connected_reviewers(limit: int = 10):
    graph_features = get_graph_features()
    top = graph_features.sort_values(
        'graph_degree', ascending=False
    ).head(limit).to_dict(orient='records')
    return {"top_reviewers": top}