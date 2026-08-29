---
title: Fraud Detection Api
emoji: 📚
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
short_description: Hosting FastAPI for Fraud Detection System
---

# 🕵️ Fraud Detection System

A multi-signal fraud detection system for e-commerce reviews — combining a **fine-tuned RoBERTa text classifier**, **graph-based reviewer connectivity analysis**, and **behavioral feature engineering** to flag fraudulent reviews and coordinated fraud rings.

**Live demo:** [dashboard link] · **API:** [Hugging Face Space link] · **Model:** [`Achintya05/review-fraud-roberta`](https://huggingface.co/Achintya05/review-fraud-roberta)

---

## Why this project

Fake reviews are usually caught with a single signal — text style, or account behavior, or network patterns — in isolation. This system fuses all three and exposes them through an interactive dashboard so the reasoning behind a "fraud" verdict is inspectable, not a black box:

- **Text model** — fine-tuned RoBERTa scores individual review language.
- **Graph analysis** — reviewers are nodes in a co-review graph; tightly connected clusters ("fraud rings") that repeatedly target the same products are surfaced separately from individually suspicious accounts.
- **Behavioral features** — review velocity, rating patterns, and product diversity per reviewer.
- **Cost simulation** — a business-facing calculator translating detection threshold choices into estimated daily investigation cost, false-alarm rate, and missed fraud — driven by a precision/recall curve computed against the real class distribution, not a fitted approximation.

## Architecture

```
┌─────────────────────┐        REST / JSON           ┌──────────────────────────┐
│   React Dashboard    │ ─────────────────────────▶ │      FastAPI Backend     │
│  (Vite + Tailwind +  │◀─────────────────────────  │                          │
│      Recharts)       │                             │  RoBERTa classifier (HF) │
└─────────────────────┘                              │  Reviewer graph features │
                                                     │  Fraud ring aggregation  │
                                                     │  Precomputed PR curve    │
                                                     └──────────────────────────┘
        deployed on Vercel                              deployed on HF Spaces (Docker)
```

## Features

| Screen | What it does |
|---|---|
| **Review Analysis** | Paste any review, get a fraud probability, linguistic red-flag list, and highlighted suspicious language |
| **Reviewer Profile** | Look up a reviewer ID → text score + graph degree + fraud ring membership → combined rule-based verdict |
| **Fraud Ring Network** | Interactive force-directed graph (vis-network) of co-review clusters, sortable by fraud rate |
| **Investigation Cost Calculator** | Real precision/recall curve (computed from a sample preserving the real class distribution) + estimated daily/monthly investigation cost as you move the detection threshold |
| **Batch Scan** | Upload a CSV of reviews, score up to 25 rows in one pass |
| **Model Metrics** | Accuracy, precision, recall, F1, AUC-ROC, confusion matrix, ROC curve on a class-balanced validation set |

## Model performance — two honest views

This project reports metrics two ways on purpose, because they answer different questions, and conflating them is a common (and misleading) mistake in fraud/anomaly detection projects.

### 1. Balanced evaluation (Model Metrics screen)

Fine-tuned RoBERTa, evaluated on a class-balanced **validation** split of 1,170 labeled reviews (585 fraud / 585 legitimate), threshold = 0.40, tuned on this same split:

| Metric | Score |
|---|---|
| Accuracy | 77.3% |
| Precision | 70.4% |
| Recall | 94.2% |
| F1 | 80.6% |
| AUC-ROC | 79.4% (verified by direct trapezoidal integration of the raw ROC curve: 0.7962) |

A separate, genuinely held-out **test** set (1,098 reviews, never used for threshold tuning) gives near-identical results — 70% precision, 95% recall, 80% F1, 77% accuracy — confirming these metrics generalize beyond the validation split rather than being an artifact of threshold selection.

This balanced-evaluation approach is standard practice for reporting classifier quality on an imbalanced problem — it isolates the model's discriminative ability from the effect of class frequency. It's real, correct, and it's what most published fraud-model benchmarks report.

### 2. Real-world class distribution (what production would actually see)

Fraud is a small minority of real review traffic. Re-evaluating the same model, same threshold, on a stratified sample preserving that real imbalance (~1.7% fraud rate, 6,000 reviews):

| Metric | Score |
|---|---|
| Accuracy | 63.9% |
| Precision | **4.2%** |
| Recall | 94.1% |
| F1 | 8.1% |
| PR-AUC | 6.1% (≈3.6× better than the 1.7% random baseline) |

Recall barely moves between the balanced and real-world evaluations — it doesn't depend on class balance. **Precision collapses**, because the same false-positive *rate* produces a much larger false-positive *count* once legitimate reviews vastly outnumber fraudulent ones. This is expected behavior for a text-only classifier under real imbalance, not a bug — but it does mean the text model alone is not precise enough to run as a fully automated filter in production.

### 3. Does the multi-signal design actually help? — measured, not assumed

Re-evaluated at the reviewer level (aggregating text + graph connectivity + historical flag rate, i.e. the exact logic in `api/routes/reviewer.py`) on a real-distribution sample of 2,000 reviewers:

| | Precision | Recall | False alarms per real catch |
|---|---|---|---|
| Text-only baseline | 1.6% | 92.9% | ~63 |
| **Combined verdict** (text + graph + flag rate) | **11.7%** | 92.9% | **~7.5** |

Combining signals cuts false alarms by roughly **8×** at the same recall. That's the measured, concrete answer to "why not rely on text alone" — the architecture's core premise holds up under real evaluation, even though the resulting precision (11.7%) is still not production-ready on its own.

*(Full evaluation methodology and scripts: `scripts/compute_pr_curve.py`, `scripts/evaluate_combined_verdict.py`.)*

## Tech stack

**Backend:** FastAPI · PyTorch · Hugging Face Transformers · pandas · scikit-learn
**Frontend:** React 19 · Vite · Tailwind CSS 4 · Recharts · vis-network
**Deployment:** Docker on Hugging Face Spaces (API) · Vercel (frontend)

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/predict/` | Score a single review's text for fraud probability |
| `POST` | `/explain/` | Return linguistic risk flags for a review + confidence score |
| `GET` | `/reviewer/{reviewer_id}` | Full fraud profile for one reviewer (text + graph + behavioral) |
| `GET` | `/graph/rings` | List detected fraud rings sorted by average fraud score |
| `GET` | `/graph/top-reviewers` | Most connected reviewers by graph degree |
| `GET` | `/graph/pr-curve` | Real precision/recall curve computed against the held-out sample |
| `GET` | `/graph/cost-analysis` | Simulate investigation cost at a given threshold, using real precision/recall from `/graph/pr-curve` |

Interactive Swagger docs are available at `/docs` on the running API.

## Running locally

**Backend**
```bash
pip install -r requirements.txt

# one-time: generate the real precision/recall curve used by /graph/cost-analysis
python scripts/compute_pr_curve.py

# optional: measure whether combining signals improves precision over text alone
python scripts/evaluate_combined_verdict.py

uvicorn api.main:app --reload --port 7860
```

**Frontend**
```bash
cd fraud-dashboard
npm install
npm run dev
```

Create `fraud-dashboard/.env.local` with `VITE_API_URL=http://localhost:7860` to point the dashboard at your local backend during development; it falls back to the deployed API automatically when that variable isn't set.

## Dataset & training

Trained on a fixed Amazon Reviews dataset (offline, not live production traffic). `fraud_flag` is a heuristic label (unverified purchase + 5-star rating + very short review text), since no ground-truth fraud labels exist in the source data. Two class-imbalance strategies were explored during training — class-weighted loss on the full imbalanced data, and explicit 1:1 balanced sampling with unweighted loss — the final training run used the latter. Graph features are precomputed from reviewer co-occurrence on shared products; fraud ring communities are derived via Louvain community detection and cached to `graph_features.csv` / `fraud_rings.csv`. The precision/recall curve and real-world/combined-verdict metrics used throughout this README and the dashboard are generated via `scripts/compute_pr_curve.py` and `scripts/evaluate_combined_verdict.py`, and re-run whenever the model or data changes.

Full training and evaluation notebook: `notebooks/fraud_model_training.ipynb`.

## Limitations

- Evaluated offline on a static dataset — no feedback loop from real investigator outcomes yet.
- The text-only model has poor precision (4.2%) under realistic class imbalance, despite strong balanced-evaluation numbers — see "Model performance" above. This is a known, measured limitation, not an unaddressed gap: the multi-signal verdict logic measurably mitigates it (11.7% precision, ~8× fewer false alarms at the same recall), though not to a production-ready level on its own.
- The reviewer-verdict logic (`api/routes/reviewer.py`) combines signals with fixed, hand-set thresholds rather than a learned meta-model. This is a deliberate choice for interpretability; a natural next step is tuning those thresholds directly against the precision/recall tradeoffs measured in `evaluate_combined_verdict.py`, or replacing them with a learned meta-model once more labeled combined-signal outcomes are available.
- The "REVIEW MANUALLY — mixed signals" verdict tier is not precise enough to treat as an automated flag (measured precision below even the text-only baseline when counted as positive) — it's appropriate as a human-review queue label, not an auto-flag signal.

## License

Apache 2.0