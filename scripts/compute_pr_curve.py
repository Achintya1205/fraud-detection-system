import json
import torch
import numpy as np
import pandas as pd
from sklearn.metrics import precision_recall_curve
from sklearn.model_selection import train_test_split
from transformers import RobertaForSequenceClassification, RobertaTokenizer

MODEL_NAME = 'Achintya05/review-fraud-roberta'
RANDOM_STATE = 42

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    print("Loading model...")
    model = RobertaForSequenceClassification.from_pretrained(MODEL_NAME)
    model.to(device).eval()
    tokenizer = RobertaTokenizer.from_pretrained(MODEL_NAME)

    print("Loading data...")
    df = pd.read_csv('processed_reviews_slim.csv', compression='gzip', low_memory=False)
    _, test_df = train_test_split(
        df, test_size=0.2, random_state=RANDOM_STATE, stratify=df['fraud_flag']
    )

    print(f"Scoring {len(test_df)} held-out reviews...")
    probs, batch_size = [], 32
    texts = test_df['reviewText'].astype(str).tolist()
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        enc = tokenizer(batch, padding='max_length', truncation=True,
                         max_length=128, return_tensors='pt')
        with torch.no_grad():
            out = model(input_ids=enc['input_ids'].to(device),
                        attention_mask=enc['attention_mask'].to(device))
            probs.extend(torch.softmax(out.logits, dim=1)[:, 1].cpu().tolist())
        print(f"  {min(i + batch_size, len(texts))}/{len(texts)}")

    labels = test_df['fraud_flag'].tolist()
    precisions, recalls, thresholds = precision_recall_curve(labels, probs)
    precisions, recalls = precisions[:-1], recalls[:-1] 

    order = np.argsort(thresholds)
    grid = np.round(np.arange(0.01, 1.00, 0.01), 2)
    grid_p = np.interp(grid, thresholds[order], precisions[order])
    grid_r = np.interp(grid, thresholds[order], recalls[order])

    curve = [{"threshold": float(t), "precision": round(float(p), 4), "recall": round(float(r), 4)}
             for t, p, r in zip(grid, grid_p, grid_r)]

    with open('pr_curve.json', 'w') as f:
        json.dump({"test_size": len(test_df), "points": curve}, f, indent=2)
    print(f"Saved pr_curve.json with {len(curve)} points.")

if __name__ == '__main__':
    main()