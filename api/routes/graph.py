from fastapi import APIRouter
from api.models.loader import get_fraud_rings, get_graph_features, get_pr_curve

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


@router.get("/pr-curve")
def pr_curve_endpoint():
    return get_pr_curve()


def _lookup_pr(threshold: float):
    points = get_pr_curve()["points"]
    closest = min(points, key=lambda p: abs(p["threshold"] - threshold))
    return closest["precision"], closest["recall"]


@router.get("/cost-analysis")
def cost_analysis(
    threshold: float = 0.40,
    daily_volume: int = 1000,
    fraud_rate: float = 0.05,
    investigation_cost: int = 50
):
    precision, recall = _lookup_pr(threshold)

    fraud_per_day = int(daily_volume * fraud_rate)
    flagged_per_day = int(fraud_per_day / max(recall, 0.01))
    false_pos_per_day = int(flagged_per_day * (1 - precision))
    true_pos_per_day = flagged_per_day - false_pos_per_day
    missed_fraud = max(0, fraud_per_day - true_pos_per_day)
    total_cost_day = flagged_per_day * investigation_cost
    total_cost_month = total_cost_day * 30

    if threshold < 0.30:
        insight = f"Low threshold — high recall but {false_pos_per_day} false alarms/day costing ₹{false_pos_per_day * investigation_cost}/day"
    elif threshold > 0.60:
        insight = f"High threshold — missing ~{missed_fraud} fraudulent reviews/day"
    else:
        insight = f"Balanced threshold — catching {true_pos_per_day} frauds/day at ₹{total_cost_day}/day"

    return {
        "threshold": threshold,
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "daily_volume": daily_volume,
        "fraud_per_day": fraud_per_day,
        "flagged_per_day": flagged_per_day,
        "true_pos_per_day": true_pos_per_day,
        "false_pos_per_day": false_pos_per_day,
        "missed_fraud": missed_fraud,
        "cost_per_day": total_cost_day,
        "cost_per_month": total_cost_month,
        "insight": insight
    }