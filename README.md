# Explainable AI for UPI Micro-Transaction Fraud

This project is a prototype of an Explainable AI (XAI) system to detect low-value,
high-frequency fraudulent transactions in UPI systems.

## Features
- Detects micro-transaction fraud using behavioral rules
- Cross-user correlation (multiple users to same receiver)
- Human-readable explanations for each fraud case
- Generates risk score and explanations

## Tech Stack
- Python
- Pandas, NumPy
- CSV-based simulated dataset

## How to Run
```bash
pip install pandas numpy
python fraud_detector.py


---

# UPI Fraud Sentinel — Explainable AI Dashboard

React + Vite + TypeScript + Tailwind frontend and a FastAPI backend that wraps the existing
`fraud_model.pkl`, `transactions.csv` and SHAP logic from `UPI_Fraud_Detector/MTF`.
All statistics come from the CSV, all metrics from the saved model on the 80/20 held-out split
(same split as `train_model.py`), and all SHAP values from the same `shap.Explainer` setup as `predict.py`.

## Run

```bash
# 1. Backend (http://localhost:8000, docs at /docs)
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000

# 2. Frontend (http://localhost:5173, proxies /api to :8000)
cd frontend && npm install && npm run dev
```

Set `MTF_DIR` to override the path of the `MTF` folder. Use the same scikit-learn version the model was trained with;
if loading fails, re-run `python train_model.py` from `UPI_Fraud_Detector/MTF/src`.

## API

| Endpoint | Description |
|---|---|
| `GET /api/overview` | KPIs and behavioral signal distributions |
| `GET /api/transactions` | Paginated table; params `page, page_size, q, risk, label, new_device, location_changed, min_amount, max_amount, sort, order` |
| `GET /api/transactions/{id}/explain` | SHAP explanation for one dataset transaction |
| `GET /api/analytics` | Histogram, scatter and fraud-rate breakdowns |
| `GET /api/model-performance` | Accuracy, precision, recall, F1, confusion matrix |
| `GET /api/explainability` | Global mean(\|SHAP\|) feature importance |
| `POST /api/predict` | Body: the 7 features; returns `fraud_probability, prediction, risk_level, shap_explanations` |

Risk thresholds follow `predict.py`: HIGH ≥ 70%, MEDIUM ≥ 40%, otherwise LOW.

## Live Fraud Simulation

Sidebar → **Live Simulation** (or the launcher panel on Overview). Pick one of five scenarios, then **START SIMULATION** or **DEMO MODE**.

- The scenarios (`frontend/src/simulation/scenarios.ts`) define only the **input features** for each stage.
- Stages run sequentially: `POST /api/predict` → wait for response → update UI → wait (Slow 5 s / Normal 3 s / Fast 1.5 s) → next stage.
- Probability, risk level, prediction and SHAP values shown are exactly what the API returns. Nothing is simulated or smoothed, so the curve may not be monotonic.
- The fraud alert appears only when the API returns `HIGH RISK` (≥ 70%).
- Reset / restart cancels the in-flight request (`AbortController`) and discards stale responses via a run id. Start is ignored while a run is active.
- If the API is unreachable the run stops with “Unable to reach fraud detection engine.” and a **Retry** button; no results are fabricated.

**Tests** (integration, runs the real hook against the running backend):

```bash
uvicorn backend.main:app --port 8000   # terminal 1
cd frontend && npm test                # terminal 2 (set API_BASE to override the URL)
```

Note: `time_since_last_transaction` values far outside the training range (the data averages ~30 min) are extrapolated linearly by Logistic Regression, so the *Dormant Account* scenario's first stages score ~0%. That is the model's real behavior and is shown as-is.
