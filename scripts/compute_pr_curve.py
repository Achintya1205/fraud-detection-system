
import json
import time
import torch
import numpy as np
import pandas as pd
from sklearn.metrics import precision_recall_curve
from sklearn.model_selection import train_test_split
from transformers import RobertaForSequenceClassification, RobertaTokenizer

MODEL_NAME = 'Achintya05/review-fraud-roberta'
RANDOM_STATE = 42   
SAMPLE_SIZE = 6000     
BATCH_SIZE = 64 

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Device: {device}")

    print("Loading model...")
    model = RobertaForSequenceClassification.from_pretrained(MODEL_NAME)
    model.to(device).eval()
    tokenizer = RobertaTokenizer.from_pretrained(MODEL_NAME)

    print("Loading data...")
    df = pd.read_csv('processed_reviews_slim.csv', compression='gzip', low_memory=False)
    _, test_df = train_test_split(
        df, test_size=0.2, random_state=RANDOM_STATE, stratify=df['fraud_flag']
    )

    if len(test_df) > SAMPLE_SIZE:
        test_df, _ = train_test_split(
            test_df, train_size=SAMPLE_SIZE, random_state=RANDOM_STATE,
            stratify=test_df['fraud_flag']
        )
    print(f"Scoring {len(test_df)} sampled reviews (stratified, batch size {BATCH_SIZE})...")

    probs = []
    texts = test_df['reviewText'].astype(str).tolist()
    n_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE
    start = time.time()

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]

        enc = tokenizer(batch, padding=True, truncation=True,
                         max_length=128, return_tensors='pt')
        with torch.no_grad():
            out = model(input_ids=enc['input_ids'].to(device),
                        attention_mask=enc['attention_mask'].to(device))
            probs.extend(torch.softmax(out.logits, dim=1)[:, 1].cpu().tolist())

        done = min(i + BATCH_SIZE, len(texts))
        batch_num = i // BATCH_SIZE + 1
        elapsed = time.time() - start
        rate = elapsed / batch_num
        remaining = rate * (n_batches - batch_num)
        print(f"  {done}/{len(texts)} — batch {batch_num}/{n_batches} "
              f"— ~{remaining/60:.1f} min remaining")

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

    total_min = (time.time() - start) / 60
    print(f"Done in {total_min:.1f} min. Saved pr_curve.json with {len(curve)} points "
          f"(sampled from {len(test_df)} reviews).")


if __name__ == '__main__':
    main()