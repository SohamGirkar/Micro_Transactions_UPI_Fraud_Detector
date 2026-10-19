"""Shared helpers so every model is trained and evaluated under identical conditions.

NEW FILE. Nothing in the original scripts (generate_data.py, train_model.py, predict.py) is modified.
The split below is the *same* split train_model.py already uses (80/20, stratified, seed 42),
so the held-out test rows are exactly the ones the original model was evaluated on.
"""
import hashlib
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, average_precision_score, confusion_matrix,
    f1_score, precision_score, recall_score, roc_auc_score,
)
from sklearn.model_selection import train_test_split

MTF = Path(__file__).resolve().parents[1]          # .../UPI_Fraud_Detector/MTF
DATASET = MTF / "dataset" / "transactions.csv"
MODELS = MTF / "models"
RESULTS = MTF / "results"

SEED = 42            # same seed as train_model.py
TEST_SIZE = 0.20     # same test fraction as train_model.py
TARGET = "is_fraud"  # 1 = fraudulent (POSITIVE class), 0 = legitimate


def load_split():
    """Return (df, X_train, X_test, y_train, y_test) using the original split."""
    df = pd.read_csv(DATASET)
    X, y = df.drop(columns=TARGET), df[TARGET]
    Xtr, Xte, ytr, yte = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=SEED, stratify=y
    )
    # Leakage guard: no row index may appear in both partitions.
    assert set(Xtr.index).isdisjoint(Xte.index), "train/test overlap"
    return df, Xtr, Xte, ytr, yte


def metrics_at(y_true, proba, threshold):
    """Threshold-dependent metrics with fraud (1) as the positive class."""
    y_true = np.asarray(y_true)
    pred = (np.asarray(proba) >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred, labels=[0, 1]).ravel()
    return {
        "threshold": float(threshold),
        "accuracy": float(accuracy_score(y_true, pred)),
        "precision": float(precision_score(y_true, pred, zero_division=0)),
        "recall": float(recall_score(y_true, pred, zero_division=0)),
        "f1": float(f1_score(y_true, pred, zero_division=0)),
        "specificity": float(tn / (tn + fp)) if (tn + fp) else None,
        "flagged_rate": float(pred.mean()),
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def ranking_metrics(y_true, proba):
    """Threshold-free metrics."""
    return {
        "roc_auc": float(roc_auc_score(y_true, proba)),
        "average_precision": float(average_precision_score(y_true, proba)),
    }


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()
