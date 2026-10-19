"""PART 1 - record the baseline of the ORIGINAL Logistic Regression.

NEW FILE. Loads the saved fraud_model.pkl (read-only; it is never retrained or overwritten here)
and evaluates it on the original held-out test set. Every number is computed, none typed in.

Run from anywhere:  python UPI_Fraud_Detector/MTF/src/baseline_metrics.py
Output:             UPI_Fraud_Detector/MTF/results/baseline_metrics.json
"""
import json
import joblib
import sklearn

from common import (MODELS, RESULTS, SEED, TEST_SIZE, TARGET,
                    load_split, metrics_at, ranking_metrics, sha256)

df, Xtr, Xte, ytr, yte = load_split()
artifact = MODELS / "fraud_model.pkl"
model = joblib.load(artifact)
proba = model.predict_proba(Xte)[:, 1]      # column 1 = P(fraud) because classes_ == [0, 1]
assert list(model.classes_) == [0, 1]

n_fraud = int(df[TARGET].sum())
out = {
    "dataset": {
        "rows": int(len(df)),
        "n_features": int(Xte.shape[1]),
        "features": list(Xte.columns),
        "legitimate": int(len(df) - n_fraud),
        "fraudulent": n_fraud,
        "fraud_percent": round(100 * n_fraud / len(df), 2),
        "positive_class": "is_fraud == 1 (fraudulent)",
    },
    "split": {
        "strategy": "train_test_split, stratified on is_fraud",
        "test_size": TEST_SIZE, "random_state": SEED,
        "train_rows": int(len(Xtr)), "test_rows": int(len(Xte)),
        "test_fraud": int(yte.sum()), "test_legitimate": int(len(yte) - yte.sum()),
    },
    "model": {
        "name": "Original Logistic Regression",
        "artifact": str(artifact.relative_to(MODELS.parent)),
        "artifact_sha256": sha256(artifact),
        "class": type(model).__name__,
        "params": model.get_params(),
        "preprocessing": "none (raw, unscaled features)",
        "sklearn_version_used_now": sklearn.__version__,
    },
    "test_at_0.50": metrics_at(yte, proba, 0.50),
    "test_ranking": ranking_metrics(yte, proba),
    "majority_class_baseline_accuracy": float(max(yte.mean(), 1 - yte.mean())),
}

RESULTS.mkdir(exist_ok=True)
(RESULTS / "baseline_metrics.json").write_text(json.dumps(out, indent=2))
print(json.dumps({k: out[k] for k in ("dataset", "split", "test_at_0.50", "test_ranking",
                                      "majority_class_baseline_accuracy")}, indent=2))
