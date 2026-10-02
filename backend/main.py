"""FastAPI wrapper around the existing UPI fraud model (fraud_model.pkl) and dataset.
Nothing is hardcoded: stats come from transactions.csv, metrics from the saved model."""
import os
from pathlib import Path
import joblib, numpy as np, pandas as pd, shap
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.model_selection import train_test_split

MTF = Path(os.getenv("MTF_DIR", Path(__file__).resolve().parents[1] / "UPI_Fraud_Detector" / "MTF"))
model = joblib.load(MTF / "models" / "fraud_model.pkl")
df = pd.read_csv(MTF / "dataset" / "transactions.csv")
FEATURES = [c for c in df.columns if c != "is_fraud"]
X = df[FEATURES]
# Same explainer setup as src/predict.py
explainer = shap.Explainer(model, X)

LABELS = {"amount": "Transaction amount", "transactions_last_hour": "Transactions in last hour",
          "account_age_days": "Account age", "new_device": "New device", "location_changed": "Location changed",
          "failed_attempts": "Failed attempts", "time_since_last_transaction": "Time since previous txn"}

def risk_level(p: float) -> str:  # p in percent, thresholds from src/predict.py
    return "HIGH RISK" if p >= 70 else "MEDIUM RISK" if p >= 40 else "LOW RISK"

T = df.copy()
T.insert(0, "id", np.arange(1, len(T) + 1))
T["prob"] = (model.predict_proba(X)[:, 1] * 100).round(2)
T["prediction"] = np.where(model.predict(X) == 1, "FRAUDULENT", "LEGITIMATE")
T["risk"] = T["prob"].map(risk_level)

def shap_values(rows: pd.DataFrame):
    sv = explainer(rows)
    v = sv.values
    return v[:, :, 1] if v.ndim == 3 else v

def explain(f, v, s):
    verb = "increased" if s > 0 else "reduced"
    t = {
        "transactions_last_hour": ("High transaction frequency" if s > 0 else "Normal transaction frequency",
                                   f"{int(v)} transactions occurred in the last hour, which {verb} the model's fraud prediction."),
        "failed_attempts": ("Recent failed attempts" if s > 0 else "Few failed attempts",
                            f"{int(v)} failed attempts were detected before this transaction, which {verb} the fraud prediction."),
        "new_device": ("New device detected", f"The transaction was made from a new device, which {verb} the predicted fraud risk.") if v == 1
                      else ("Known device", f"The transaction came from a recognized device, which {verb} the predicted fraud risk."),
        "location_changed": ("Location change detected", f"The location changed, which {verb} the predicted fraud risk.") if v == 1
                            else ("Consistent location", f"No location change was detected, which {verb} the predicted fraud risk."),
        "amount": ("Transaction amount", f"An amount of ₹{v:,.2f} {verb} the fraud prediction."),
        "account_age_days": ("Account age", f"An account age of {int(v)} days {verb} the fraud prediction."),
        "time_since_last_transaction": ("Time since previous transaction", f"{v:,.0f} seconds since the previous transaction {verb} the fraud prediction."),
    }[f]
    a = abs(s)
    return {"feature": f, "label": LABELS[f], "value": float(v), "shap": round(float(s), 4),
            "direction": "increase" if s > 0 else "decrease",
            "severity": "high" if a >= 0.5 else "medium" if a >= 0.2 else "low", "title": t[0], "text": t[1]}

def contributions(row: pd.DataFrame):
    sv = shap_values(row)[0]
    items = [explain(f, row.iloc[0][f], s) for f, s in zip(FEATURES, sv)]
    return sorted(items, key=lambda i: abs(i["shap"]), reverse=True)

def grouped(keys):
    g = T.groupby(keys, observed=True).agg(count=("is_fraud", "size"), fraud_rate=("is_fraud", "mean"), avg_prob=("prob", "mean"))
    return [{"label": str(i),
             "count": int(r["count"]), "fraud_rate": round(r["fraud_rate"] * 100, 2), "avg_prob": round(r["avg_prob"], 2)}
            for i, r in g.iterrows()]

def bucket(col, bins, labels):
    return pd.cut(T[col], bins=bins, labels=labels, right=False)

AGE = bucket("account_age_days", [0, 90, 365, 730, 1100, 10**6], ["<90d", "90-365d", "1-2y", "2-3y", "3y+"])
TXH = T["transactions_last_hour"].clip(upper=8).map(lambda x: "8+" if x >= 8 else str(int(x)))
FAIL = T["failed_attempts"].clip(upper=4).map(lambda x: "4+" if x >= 4 else str(int(x)))
GAP = bucket("time_since_last_transaction", [0, 300, 900, 1800, 3600, 10**7], ["<5m", "5-15m", "15-30m", "30-60m", "60m+"])
AMT = bucket("amount", [0, 25, 50, 100, 250, 10**7], ["<₹25", "₹25-50", "₹50-100", "₹100-250", "₹250+"])

app = FastAPI(title="UPI Fraud Sentinel API", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/api/overview")
def overview():
    total, fraud = len(T), int(T.is_fraud.sum())
    return {
        "total": total, "fraud": fraud, "legitimate": total - fraud, "fraud_rate": round(fraud / total * 100, 2),
        "avg_amount": round(float(T.amount.mean()), 2),
        "high_risk": int((T.risk == "HIGH RISK").sum()), "medium_risk": int((T.risk == "MEDIUM RISK").sum()),
        "flagged": int((T.prediction == "FRAUDULENT").sum()),
        "signals": {
            "transactions_last_hour": grouped(TXH), "failed_attempts": grouped(FAIL),
            "account_age": grouped(AGE), "time_since_last": grouped(GAP), "amount": grouped(AMT),
            "new_device_pct": round(float(T.new_device.mean() * 100), 2),
            "location_changed_pct": round(float(T.location_changed.mean() * 100), 2),
        },
    }

@app.get("/api/transactions")
def transactions(page: int = 1, page_size: int = Query(10, le=100), q: str = "", risk: str = "", label: str = "",
                 new_device: int | None = None, location_changed: int | None = None,
                 min_amount: float | None = None, max_amount: float | None = None,
                 sort: str = "id", order: str = "asc"):
    d = T
    if q.strip().isdigit(): d = d[d.id == int(q)]
    if risk: d = d[d.risk == risk]
    if label == "fraud": d = d[d.is_fraud == 1]
    elif label == "legit": d = d[d.is_fraud == 0]
    if new_device is not None: d = d[d.new_device == new_device]
    if location_changed is not None: d = d[d.location_changed == location_changed]
    if min_amount is not None: d = d[d.amount >= min_amount]
    if max_amount is not None: d = d[d.amount <= max_amount]
    if sort not in d.columns: sort = "id"
    d = d.sort_values(sort, ascending=order == "asc")
    n = len(d)
    rows = d.iloc[(page - 1) * page_size: page * page_size]
    return {"total": n, "page": page, "page_size": page_size, "rows": rows.to_dict("records")}

@app.get("/api/transactions/{tid}/explain")
def explain_transaction(tid: int):
    if not 1 <= tid <= len(T): raise HTTPException(404, "Transaction not found")
    r = T.iloc[tid - 1]
    return {"transaction": r.to_dict(), "fraud_probability": float(r.prob), "risk_level": r.risk,
            "prediction": r.prediction, "actual": "FRAUDULENT" if r.is_fraud else "LEGITIMATE",
            "shap_explanations": contributions(X.iloc[[tid - 1]])}

@app.get("/api/analytics")
def analytics():
    hist, edges = np.histogram(T.prob / 100, bins=20, range=(0, 1))
    hl, _ = np.histogram(T.prob[T.is_fraud == 1] / 100, bins=edges)
    s = T.sample(600, random_state=1)
    return {
        "histogram": [{"bin": f"{edges[i]*100:.0f}-{edges[i+1]*100:.0f}%", "total": int(hist[i]), "fraud": int(hl[i]),
                       "legitimate": int(hist[i] - hl[i])} for i in range(20)],
        "scatter": [{"amount": float(a), "prob": float(p), "fraud": int(f)} for a, p, f in zip(s.amount, s.prob, s.is_fraud)],
        "by_transactions": grouped(TXH), "by_account_age": grouped(AGE), "by_failed_attempts": grouped(FAIL),
        "by_device": [{**g, "label": "New device" if g["label"] == "1" else "Known device"} for g in grouped(T.new_device.astype(str))],
        "by_location": [{**g, "label": "Changed" if g["label"] == "1" else "Same location"} for g in grouped(T.location_changed.astype(str))],
    }

@app.get("/api/model-performance")
def model_performance():
    # Same split as src/train_model.py, evaluated with the saved model
    _, Xt, _, yt = train_test_split(X, df.is_fraud, test_size=0.20, random_state=42, stratify=df.is_fraud)
    yp = model.predict(Xt)
    tn, fp, fn, tp = confusion_matrix(yt, yp).ravel()
    return {"model": type(model).__name__, "dataset_size": len(df), "train_size": len(df) - len(Xt), "test_size": len(Xt),
            "split": "80 / 20", "accuracy": accuracy_score(yt, yp), "precision": precision_score(yt, yp, zero_division=0),
            "recall": recall_score(yt, yp, zero_division=0), "f1": f1_score(yt, yp, zero_division=0),
            "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}}

@app.get("/api/explainability")
def global_importance():
    sample = X.sample(1000, random_state=7)
    m = np.abs(shap_values(sample)).mean(axis=0)
    items = sorted(({"feature": f, "label": LABELS[f], "importance": round(float(v), 4)} for f, v in zip(FEATURES, m)),
                   key=lambda i: -i["importance"])
    coefs = dict(zip(FEATURES, model.coef_[0]))
    for i in items: i["coefficient"] = round(float(coefs[i["feature"]]), 5)
    return {"method": "mean(|SHAP|) over 1,000 sampled transactions", "features": items}

class Txn(BaseModel):
    amount: float = Field(ge=0)
    transactions_last_hour: int = Field(ge=0)
    account_age_days: int = Field(ge=0)
    new_device: int = Field(ge=0, le=1)
    location_changed: int = Field(ge=0, le=1)
    failed_attempts: int = Field(ge=0)
    time_since_last_transaction: float = Field(ge=0)

@app.post("/api/predict")
def predict(t: Txn):
    row = pd.DataFrame([t.model_dump()])[FEATURES]
    p = float(model.predict_proba(row)[0, 1] * 100)
    return {"fraud_probability": round(p, 2), "risk_level": risk_level(p),
            "prediction": "FRAUDULENT" if model.predict(row)[0] == 1 else "LEGITIMATE",
            "shap_explanations": contributions(row)}
