import json
import time
import torch
import numpy as np
import pandas as pd
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from transformers import RobertaForSequenceClassification, RobertaTokenizer

MODEL_NAME = 'Achintya05/review-fraud-roberta'
RANDOM_STATE = 42
SAMPLE_SIZE = 2000 
BATCH_SIZE = 32

def verdict_for(prob, graph_deg, flag_rate):
    if prob >= 0.65 and graph_deg > 100:
        return "HIGH"
    elif prob >= 0.40 and flag_rate >= 0.1:
        return "MEDIUM"
    elif prob < 0.40 and graph_deg < 10:
        return "LOW"
    else:
        return "MANUAL"


def eval_binary(y_true, y_pred, name):
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    return {
        "name": name,
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision": round(precision_score(y_true, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_true, y_pred, zero_division=0), 4),
        "f1": round(f1_score(y_true, y_pred, zero_division=0), 4),
        "confusion_matrix": {"tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn)}
    }

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Device: {device}")

    print("Loading model...")
    model = RobertaForSequenceClassification.from_pretrained(MODEL_NAME)
    model.to(device).eval()
    tokenizer = RobertaTokenizer.from_pretrained(MODEL_NAME)

    print("Loading data...")
    df = pd.read_csv('processed_reviews_slim.csv', compression='gzip', low_memory=False)
    graph_features = pd.read_csv('graph_features.csv')

    print("Aggregating per reviewer...")
    df_sorted = df.sort_values('reviewTime')
    reviewer_agg = df.groupby('reviewerID').agg(
        flag_rate=('fraud_flag', 'mean'),
        n_reviews=('fraud_flag', 'size')
    ).reset_index()
    latest_text = df_sorted.groupby('reviewerID')['reviewText'].last().reset_index()
    reviewers = reviewer_agg.merge(latest_text, on='reviewerID')
    reviewers = reviewers.merge(
        graph_features[['reviewerID', 'graph_degree']], on='reviewerID', how='left'
    )
    reviewers['graph_degree'] = reviewers['graph_degree'].fillna(0)
    reviewers['ground_truth'] = (reviewers['flag_rate'] >= 0.5).astype(int)

    print(f"Total reviewers: {len(reviewers)} "
          f"({int(reviewers['ground_truth'].sum())} fraud / "
          f"{int((reviewers['ground_truth']==0).sum())} legit — "
          f"{reviewers['ground_truth'].mean()*100:.2f}% fraud rate, real distribution)")

    if len(reviewers) > SAMPLE_SIZE:
        reviewers, _ = train_test_split(
            reviewers, train_size=SAMPLE_SIZE, random_state=RANDOM_STATE,
            stratify=reviewers['ground_truth']
        )
    reviewers = reviewers.reset_index(drop=True)
    print(f"Evaluating {len(reviewers)} sampled reviewers "
          f"({int(reviewers['ground_truth'].sum())} fraud / "
          f"{int((reviewers['ground_truth']==0).sum())} legit)")

    texts = reviewers['reviewText'].astype(str).tolist()
    probs = []
    n_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE
    start = time.time()
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        enc = tokenizer(batch, padding=True, truncation=True, max_length=128, return_tensors='pt')
        with torch.no_grad():
            out = model(input_ids=enc['input_ids'].to(device), attention_mask=enc['attention_mask'].to(device))
            probs.extend(torch.softmax(out.logits, dim=1)[:, 1].cpu().tolist())
        done = min(i + BATCH_SIZE, len(texts))
        batch_num = i // BATCH_SIZE + 1
        elapsed = time.time() - start
        remaining = (elapsed / batch_num) * (n_batches - batch_num)
        print(f"  {done}/{len(texts)} — batch {batch_num}/{n_batches} — ~{remaining/60:.1f} min remaining")

    reviewers['text_prob'] = probs
    reviewers['verdict'] = reviewers.apply(
        lambda r: verdict_for(r['text_prob'], r['graph_degree'], r['flag_rate']), axis=1
    )

    y_true = reviewers['ground_truth'].values

    text_only_pred = (reviewers['text_prob'].values >= 0.40).astype(int)
    text_only = eval_binary(y_true, text_only_pred, "text_only_baseline (prob >= 0.40)")

    strict_pred = reviewers['verdict'].isin(["HIGH", "MEDIUM"]).astype(int).values
    combined_strict = eval_binary(y_true, strict_pred, "combined_verdict_strict (HIGH+MEDIUM auto-flag only)")

    incl_manual_pred = reviewers['verdict'].isin(["HIGH", "MEDIUM", "MANUAL"]).astype(int).values
    combined_incl_manual = eval_binary(y_true, incl_manual_pred, "combined_verdict_incl_manual_review")

    results = {
        "sample_size": len(reviewers),
        "fraud_rate_pct": round(float(y_true.mean()) * 100, 2),
        "text_only_baseline": text_only,
        "combined_verdict_strict": combined_strict,
        "combined_verdict_incl_manual_review": combined_incl_manual,
    }

    with open('combined_verdict_metrics.json', 'w') as f:
        json.dump(results, f, indent=2)

    total_min = (time.time() - start) / 60
    print(f"\nDone in {total_min:.1f} min.")
    print("="*60)
    print(json.dumps(results, indent=2))
    print("="*60)
    print("\nSaved combined_verdict_metrics.json")
    print("\nCompare precision: text_only_baseline vs combined_verdict_strict.")
    print("If combined precision is meaningfully higher, that's the measured")
    print("proof that multi-signal design mitigates the text-only false-positive problem.")

if __name__ == '__main__':
    main()