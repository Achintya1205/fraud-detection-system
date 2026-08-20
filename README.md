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
- **Cost simulation** — a business-facing calculator translating detection threshold choices into estimated daily investigation cost, false-alarm rate, and missed fraud — driven by a precision/recall curve computed against the real held-out test set (see `scripts/compute_pr_curve.py`), not a fitted approximation.

## Architecture

```
┌─────────────────────┐        REST / JSON        ┌──────────────────────────┐
│   React Dashboard    │ ─────────────────────────▶│      FastAPI Backend      │
│  (Vite + Tailwind +  │◀───────────────────────── │                            │
│      Recharts)       │                            │  RoBERTa classifier (HF)  │
└─────────────────────┘                            │  Reviewer graph features   │
                                                     │  Fraud ring aggregation    │
                                                     │  Precomputed PR curve      │
                                                     └──────────────────────────┘
        deployed on Vercel                              deployed on HF Spaces (Docker)
```

## Features

| Screen | What it does |
|---|---|
| **Review Analysis** | Paste any review, get a fraud probability, linguistic red-flag list, and highlighted suspicious language |
| **Reviewer Profile** | Look up a reviewer ID → text score + graph degree + fraud ring membership → combined rule-based verdict |
| **Fraud Ring Network** | Interactive force-directed graph (vis-network) of co-review clusters, sortable by fraud rate |
| **Investigation Cost Calculator** | Real precision/recall curve (computed from the held-out test set, not fitted) + estimated daily/monthly investigation cost as you move the detection threshold |
| **Batch Scan** | Upload a CSV of reviews, score up to 25 rows in one pass |
| **Model Metrics** | Accuracy, precision, recall, F1, AUC-ROC, confusion matrix, ROC curve on the held-out test set |

## Model performance

Fine-tuned RoBERTa, evaluated on a held-out split of 1,170 labeled reviews, threshold = 0.40:

| Metric | Score |
|---|---|
| Accuracy | 77.3% |
| Precision | 70.4% |
| Recall | 94.2% |
| F1 | 80.6% |
| AUC-ROC | 79.4% |

Recall is prioritized over precision by design — in fraud detection, missing a fraudulent review is generally costlier than flagging a legitimate one for manual review.

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
| `GET` | `/graph/pr-curve` | Real precision/recall curve computed against the held-out test set |
| `GET` | `/graph/cost-analysis` | Simulate investigation cost at a given threshold, using real precision/recall from `/graph/pr-curve` |

Interactive Swagger docs are available at `/docs` on the running API.

## Running locally

**Backend**
```bash
pip install -r requirements.txt

# one-time: generate the real precision/recall curve used by /graph/cost-analysis
python scripts/compute_pr_curve.py

uvicorn api.main:app --reload --port 7860
```

**Frontend**
```bash
cd fraud-dashboard
npm install
npm run dev
```

The frontend expects the API base URL configured in each `src/pages/Screen*.jsx` file — point it at `http://localhost:7860` for local development.

## Dataset & training

Trained on a fixed Amazon Reviews dataset (offline, not live production traffic). Graph features are precomputed from reviewer co-occurrence on shared products; fraud ring communities are derived via community detection and cached to `graph_features.csv` / `fraud_rings.csv`. The precision/recall curve used by the cost calculator (`pr_curve.json`) is generated once via `scripts/compute_pr_curve.py` by scoring the actual held-out test split and is re-run whenever the model or data changes.

## Limitations

- Evaluated offline on a static dataset — no feedback loop from real investigator outcomes yet.
- The reviewer-verdict logic (`api/routes/reviewer.py`) combines signals (text score, graph degree, flag rate) with fixed, hand-set thresholds rather than a learned meta-model. This is a deliberate choice for interpretability — an analyst can see exactly why a reviewer was flagged — rather than a shortcut; a natural next step is a learned meta-model once enough labeled combined-signal outcomes exist to validate one properly.
- fp16 inference is only used when a GPU is available (`torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32`) — CPU-only deployments run in fp32, which is correct but slower than a GPU deployment would be.

## License

Apache 2.0