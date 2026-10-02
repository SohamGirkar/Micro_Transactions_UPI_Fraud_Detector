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
