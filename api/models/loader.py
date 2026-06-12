import torch
import pandas as pd
from transformers import RobertaForSequenceClassification, RobertaTokenizer

# ── Constants ─────────────────────────────────────────────────
MODEL_NAME = 'Achintya05/review-fraud-roberta'
THRESHOLD  = 0.40

# ── Device ────────────────────────────────────────────────────
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# ── Model + Tokenizer (loaded once at startup) ────────────────
model     = None
tokenizer = None
df        = None
graph_features = None
fraud_rings    = None

def load_all():
    global model, tokenizer, df, graph_features, fraud_rings

    print(f"Loading model from {MODEL_NAME}...")
    model = RobertaForSequenceClassification.from_pretrained(MODEL_NAME)
    model.to(device)
    model.eval()

    tokenizer = RobertaTokenizer.from_pretrained(MODEL_NAME)
    print("Model loaded")

    print("Loading data...")
    df             = pd.read_csv('./processed_reviews_slim.csv', compression='gzip', low_memory=False)
    graph_features = pd.read_csv('./graph_features.csv')
    fraud_rings    = pd.read_csv('./fraud_rings.csv')
    print(f"Data loaded — {len(df)} reviews")

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