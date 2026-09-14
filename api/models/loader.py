import json
import joblib
import torch
import pandas as pd
from transformers import RobertaForSequenceClassification, RobertaTokenizer

MODEL_NAME = 'Achintya05/review-fraud-roberta' 
MODEL_DIR = "models"   
THRESHOLD = 0.40   

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

model = None
tokenizer = None
df = None
graph_features = None
fraud_rings = None
pr_curve = None

lgb_model = None
fusion_model = None
ensemble_config = None


def load_all():
    global model, tokenizer, df, graph_features, fraud_rings, pr_curve
    global lgb_model, fusion_model, ensemble_config

    print(f"Loading RoBERTa from {MODEL_NAME}...")
    model = RobertaForSequenceClassification.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
    )
    model.to(device)
    model.eval()

    tokenizer = RobertaTokenizer.from_pretrained(MODEL_NAME)
    print("RoBERTa loaded")

    print("Loading ensemble artifacts...")
    lgb_model = joblib.load(f"{MODEL_DIR}/lightgbm_behavioral.joblib")
    fusion_model = joblib.load(f"{MODEL_DIR}/fusion_model.joblib")
    ensemble_config = joblib.load(f"{MODEL_DIR}/ensemble_config.joblib")
    print(f"Ensemble threshold: {ensemble_config['threshold']:.4f}")
    print(f"LightGBM feature order: {ensemble_config['features']}")

    print("Loading data...")
    df = pd.read_csv('./processed_reviews_slim.csv', compression='gzip', low_memory=False)
    graph_features = pd.read_csv('./graph_features.csv')
    fraud_rings = pd.read_csv('./fraud_rings.csv')
    print(f"Data loaded — {len(df)} reviews")

    print("Loading precomputed PR curve...")
    with open('./pr_curve.json') as f:
        pr_curve = json.load(f)
    print(f"PR curve loaded — {len(pr_curve['points'])} points")


def get_model():
    return model


def get_tokenizer():
    return tokenizer


def get_device():
    return device


def get_df():
    return df


def get_graph_features():
    return graph_features


def get_fraud_rings():
    return fraud_rings


def get_pr_curve():
    return pr_curve


def get_lgb_model():
    return lgb_model


def get_fusion_model():
    return fusion_model


def get_ensemble_config():
    return ensemble_config