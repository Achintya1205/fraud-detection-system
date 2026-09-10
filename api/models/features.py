import numpy as np
from api.models.loader import get_df, get_graph_features, get_ensemble_config


def get_behavioral_features(reviewer_id: str):

    df = get_df()
    graph_features = get_graph_features()
    config = get_ensemble_config()
    feature_order = config['features']

    reviewer_df = df[df['reviewerID'] == reviewer_id]
    if len(reviewer_df) == 0:
        return None

    graph_row = graph_features[graph_features['reviewerID'] == reviewer_id]

    values = {
        'reviews_last_7_days': reviewer_df['reviews_last_7_days'].iloc[0],
        'total_reviews': reviewer_df['total_reviews'].iloc[0],
        'avg_rating': reviewer_df['avg_rating'].iloc[0],
        'unique_products': reviewer_df['unique_products'].iloc[0],
        'graph_degree': graph_row['graph_degree'].iloc[0] if len(graph_row) > 0 else 0,
        'graph_weighted_degree': graph_row['graph_weighted_degree'].iloc[0] if len(graph_row) > 0 else 0,
        'community_id': reviewer_df['community_id'].iloc[0] if 'community_id' in reviewer_df.columns else -1,
    }

    ordered = [values[f] for f in feature_order]
    return np.array(ordered, dtype=float).reshape(1, -1)