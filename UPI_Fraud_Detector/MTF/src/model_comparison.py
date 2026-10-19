"""PARTS 2-4 - tuned Logistic Regression, Random Forest, and a fair three-way comparison.

NEW FILE. Original scripts, dataset and fraud_model.pkl are never modified.

Candidates (all use the same 7 features, target, split and CV folds):
  A  lr_original  - the saved fraud_model.pkl (LogisticRegression, unscaled)           [read-only]
  B  lr_tuned     - Pipeline(StandardScaler -> LogisticRegression), grid-searched
  C  rf_tuned     - RandomForestClassifier, randomized-search

PROTOCOL (fixed BEFORE looking at any test number)
  1. Split: same 80/20 stratified split, seed 42, as train_model.py. The 2,000 test rows are not
     used for tuning, threshold selection or model selection. They appear only in section 6.
  2. Hyper-parameters: 5-fold stratified CV on the 8,000 TRAINING rows. The scaler lives inside the
     Pipeline, so it is re-fit on each training fold only (no leakage into validation folds).
     Search criterion: F1 of the fraud class (balances precision and recall); precision, recall,
     average precision and ROC-AUC are recorded for every setting.
  3. Thresholds: chosen on OUT-OF-FOLD validation probabilities (cross_val_predict on the training
     rows, with fold models that never saw the rows they predict).
        f1_opt  = threshold maximising validation F1 (the primary, pre-declared rule)
        youden  = threshold maximising recall + specificity - 1 (secondary; shown because with ~88%
                  fraud, maximising F1 alone tends to flag almost everything)
  4. Model selection: highest VALIDATION F1 at the model's own f1_opt threshold.
     Differences <= 0.001 are treated as ties and resolved toward the simpler / more interpretable
     model (A, then B, then C).
  5. Everything is also reported at the common 0.50 threshold.
  6. Final test evaluation: once per model, nothing is changed afterwards.

Run:    python UPI_Fraud_Detector/MTF/src/model_comparison.py            (~3-6 minutes on 2 cores)
Output: results/model_comparison.json, models/tuned_logistic_model.pkl, models/random_forest_model.pkl
"""
import argparse
import json
import time
import warnings
from datetime import datetime, timezone

import joblib
import numpy as np
import sklearn
from sklearn.base import clone
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, precision_recall_curve, roc_auc_score, average_precision_score
from sklearn.model_selection import (GridSearchCV, RandomizedSearchCV, StratifiedKFold,
                                     cross_val_predict, cross_validate)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from common import MODELS, RESULTS, SEED, TARGET, load_split, metrics_at, ranking_metrics, sha256

warnings.filterwarnings("ignore", category=UserWarning, module="sklearn.base")  # old-pickle version notice
# Extreme grid settings (e.g. L1 with C=0.001) can predict no positives in a fold; precision is then 0.
warnings.filterwarnings("ignore", message="Precision is ill-defined")

ap = argparse.ArgumentParser()
ap.add_argument("--rf-iter", type=int, default=24, help="RandomizedSearchCV candidates for Random Forest")
ap.add_argument("--n-jobs", type=int, default=-1)
args = ap.parse_args()

CV_FOLDS = 5
THRESHOLDS = np.round(np.arange(0.05, 0.951, 0.005), 3)       # validation threshold grid
SWEEP = [0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90]            # informational test sweep only
SCORING = {"f1": "f1", "precision": "precision", "recall": "recall",
           "average_precision": "average_precision", "roc_auc": "roc_auc"}
TIE_TOLERANCE = 0.001

df, Xtr, Xte, ytr, yte = load_split()
cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=SEED)   # identical folds for all models


def f(x):
    return None if x is None else float(x)


def pick_threshold(y, p, rule):
    """Choose a threshold on VALIDATION data only."""
    y = np.asarray(y); pred = p[:, None] >= THRESHOLDS[None, :]
    tp = (pred & (y[:, None] == 1)).sum(0); fp = (pred & (y[:, None] == 0)).sum(0)
    fn = ((~pred) & (y[:, None] == 1)).sum(0); tn = ((~pred) & (y[:, None] == 0)).sum(0)
    if rule == "f1_opt":
        score = 2 * tp / np.maximum(2 * tp + fp + fn, 1)
    else:  # youden
        score = tp / np.maximum(tp + fn, 1) + tn / np.maximum(tn + fp, 1) - 1
    return float(THRESHOLDS[int(np.argmax(score))])


def cv_row(cvres, i):
    return {m: {"mean": f(cvres[f"mean_test_{m}"][i]), "std": f(cvres[f"std_test_{m}"][i])} for m in SCORING}


# ---------------------------------------------------------------- 2. Logistic Regression
t0 = time.perf_counter()
lr_pipe = Pipeline([("scaler", StandardScaler()),
                    ("clf", LogisticRegression(solver="liblinear", max_iter=5000, random_state=SEED))])
lr_grid = {"clf__l1_ratio": [0, 1],                       # 0 = L2 (ridge), 1 = L1 (lasso)
           "clf__C": list(np.logspace(-3, 2, 11)),
           "clf__class_weight": [None, "balanced"]}
lr_search = GridSearchCV(lr_pipe, lr_grid, scoring=SCORING, refit="f1", cv=cv, n_jobs=args.n_jobs)
lr_search.fit(Xtr, ytr)                                   # TRAIN ONLY
lr_search_s = time.perf_counter() - t0
lr_best = lr_search.best_estimator_
lr_cvres = lr_search.cv_results_

# Does class_weight="balanced" help? Measured, not assumed: best CV result per setting.
cw_effect = {}
for cw in (None, "balanced"):
    idx = [i for i, p in enumerate(lr_cvres["params"]) if p["clf__class_weight"] == cw]
    b = max(idx, key=lambda i: lr_cvres["mean_test_f1"][i])
    cw_effect[str(cw)] = {"best_params": {k.replace("clf__", ""): v for k, v in lr_cvres["params"][b].items()},
                          "cv": cv_row(lr_cvres, b)}

# Ablation on the training folds: what does each step contribute?
ablation = []
for name, est in [("A: original (unscaled, C=1, L2)", LogisticRegression(max_iter=1000)),
                  ("A + StandardScaler (C=1, L2)", Pipeline([("scaler", StandardScaler()),
                                                             ("clf", LogisticRegression(max_iter=1000))])),
                  ("B: tuned (scaler + best C / L1-L2 / class weight)", clone(lr_best))]:
    r = cross_validate(est, Xtr, ytr, cv=cv, scoring=SCORING, n_jobs=args.n_jobs)
    ablation.append({"step": name, "cv": {m: {"mean": f(r[f"test_{m}"].mean()), "std": f(r[f"test_{m}"].std())}
                                          for m in SCORING}})

# ---------------------------------------------------------------- 3. Random Forest
t0 = time.perf_counter()
rf_space = {"n_estimators": [200, 300],
            "max_depth": [None, 6, 10, 16],
            "min_samples_split": [2, 10, 30],
            "min_samples_leaf": [1, 5, 15, 40],
            "max_features": ["sqrt", 0.5, 1.0],
            "class_weight": [None, "balanced", "balanced_subsample"]}
rf_search = RandomizedSearchCV(RandomForestClassifier(random_state=SEED, n_jobs=1), rf_space,
                               n_iter=args.rf_iter, scoring=SCORING, refit="f1", cv=cv,
                               random_state=SEED, n_jobs=args.n_jobs)
rf_search.fit(Xtr, ytr)                                   # TRAIN ONLY
rf_search_s = time.perf_counter() - t0
rf_best = rf_search.best_estimator_
rf_cv_best = cv_row(rf_search.cv_results_, rf_search.best_index_)

# ---------------------------------------------------------------- validation probabilities + thresholds
candidates = {
    "lr_original": {"estimator": LogisticRegression(max_iter=1000), "cv_cfg": None},
    "lr_tuned": {"estimator": lr_best, "cv_cfg": cv_row(lr_cvres, lr_search.best_index_)},
    "rf_tuned": {"estimator": rf_best, "cv_cfg": rf_cv_best},
}
validation = {}
for cid, c in candidates.items():
    # out-of-fold P(fraud) for every training row, from fold models that never saw that row
    oof = cross_val_predict(clone(c["estimator"]), Xtr, ytr, cv=cv, method="predict_proba", n_jobs=args.n_jobs)[:, 1]
    th = {"0.50": 0.50, "f1_opt": pick_threshold(ytr, oof, "f1_opt"), "youden": pick_threshold(ytr, oof, "youden")}
    validation[cid] = {"oof": oof, "thresholds": th,
                       "at": {k: metrics_at(ytr, oof, v) for k, v in th.items()},
                       "ranking": ranking_metrics(ytr, oof)}

# model selection - uses VALIDATION numbers only
order = ["lr_original", "lr_tuned", "rf_tuned"]               # preference order for ties
val_f1 = {cid: validation[cid]["at"]["f1_opt"]["f1"] for cid in order}
best_f1 = max(val_f1.values())
winner = next(cid for cid in order if best_f1 - val_f1[cid] <= TIE_TOLERANCE)

# ---------------------------------------------------------------- 5. fit finals, save artifacts
def fit_seconds(est):
    e = clone(est); t = time.perf_counter(); e.fit(Xtr, ytr); return time.perf_counter() - t

MODELS.mkdir(exist_ok=True); RESULTS.mkdir(exist_ok=True)
joblib.dump(lr_best, MODELS / "tuned_logistic_model.pkl", compress=3)
joblib.dump(rf_best, MODELS / "random_forest_model.pkl", compress=3)
final = {"lr_original": joblib.load(MODELS / "fraud_model.pkl"),            # read-only, unchanged
         "lr_tuned": joblib.load(MODELS / "tuned_logistic_model.pkl"),
         "rf_tuned": joblib.load(MODELS / "random_forest_model.pkl")}
info = {
    "lr_original": dict(name="Original Logistic Regression", short="LR (original)", artifact="models/fraud_model.pkl",
                        description="Saved baseline: LogisticRegression(max_iter=1000) on raw, unscaled features.",
                        preprocessing="none", hyperparameters=final["lr_original"].get_params(),
                        train_seconds=fit_seconds(candidates["lr_original"]["estimator"]), search_seconds=None),
    "lr_tuned": dict(name="Tuned Logistic Regression", short="LR (tuned)", artifact="models/tuned_logistic_model.pkl",
                     description="StandardScaler + LogisticRegression; C, L1/L2 and class weight chosen by 5-fold CV on training rows.",
                     preprocessing="StandardScaler (fit inside the pipeline, training folds only)",
                     hyperparameters={k.replace("clf__", ""): v for k, v in lr_search.best_params_.items()},
                     train_seconds=fit_seconds(lr_best), search_seconds=lr_search_s),
    "rf_tuned": dict(name="Random Forest", short="Random Forest", artifact="models/random_forest_model.pkl",
                     description="RandomForestClassifier chosen by randomized 5-fold CV on training rows. No scaling needed.",
                     preprocessing="none (tree-based)", hyperparameters=rf_search.best_params_,
                     train_seconds=fit_seconds(rf_best), search_seconds=rf_search_s),
}

# ---------------------------------------------------------------- 6. FINAL TEST EVALUATION (once)
def thin_pr(y, p, n=80):
    pr, rc, _ = precision_recall_curve(y, p)
    idx = np.unique(np.linspace(0, len(pr) - 1, n).astype(int))
    return [{"recall": round(float(rc[i]), 4), "precision": round(float(pr[i]), 4)} for i in idx]

models_out = []
for cid in order:
    p_te = final[cid].predict_proba(Xte)[:, 1]
    th = validation[cid]["thresholds"]
    v = validation[cid]
    models_out.append({
        "id": cid, **info[cid],
        "artifact_sha256": sha256(MODELS.parent / info[cid]["artifact"]),
        "cv_search_best": candidates[cid]["cv_cfg"],
        "validation": {"source": f"out-of-fold predictions on the {len(ytr)} training rows ({CV_FOLDS}-fold)",
                       "thresholds": th, "at": v["at"], "ranking": v["ranking"]},
        "test": {"ranking": ranking_metrics(yte, p_te),
                 "at_0.50": metrics_at(yte, p_te, 0.50),
                 "at_f1_opt": metrics_at(yte, p_te, th["f1_opt"]),
                 "at_youden": metrics_at(yte, p_te, th["youden"]),
                 "sweep": [metrics_at(yte, p_te, t) for t in SWEEP],
                 "pr_curve": thin_pr(yte, p_te)},
        "selected_by_validation": cid == winner,
    })

# Context: the best any model could do on this synthetic data (labels are Bernoulli draws).
beta = dict(amount=.0005, transactions_last_hour=.20, account_age_days=-.0003, new_device=1.2,
            location_changed=1.0, failed_attempts=.35, time_since_last_transaction=-.0003)   # from generate_data.py
risk = sum(b * Xte[k] for k, b in beta.items()); p_true = 1 / (1 + np.exp(-risk))
oracle = {"source": "true label probability sigma(risk) reconstructed from the formula in generate_data.py",
          "roc_auc": f(roc_auc_score(yte, p_true)), "average_precision": f(average_precision_score(yte, p_true)),
          "brier": f(brier_score_loss(yte, p_true))}

test_f1 = {m["id"]: m["test"]["at_f1_opt"]["f1"] for m in models_out}

# REPORTING ONLY (does not feed any selection): are the test differences larger than sampling noise?
# Paired bootstrap over the 2,000 test rows, each model compared with the original LR at 0.50.
proba_te = {cid: final[cid].predict_proba(Xte)[:, 1] for cid in order}
y_te = yte.to_numpy(); rng = np.random.default_rng(SEED); B = 2000
boots = {cid: {"f1_diff": [], "roc_auc_diff": []} for cid in order[1:]}
from sklearn.metrics import f1_score as _f1
for _ in range(B):
    i = rng.integers(0, len(y_te), len(y_te)); yb = y_te[i]
    if yb.min() == yb.max():
        continue
    base_f1 = _f1(yb, proba_te["lr_original"][i] >= 0.5, zero_division=0)
    base_auc = roc_auc_score(yb, proba_te["lr_original"][i])
    for cid in order[1:]:
        boots[cid]["f1_diff"].append(_f1(yb, proba_te[cid][i] >= 0.5, zero_division=0) - base_f1)
        boots[cid]["roc_auc_diff"].append(roc_auc_score(yb, proba_te[cid][i]) - base_auc)
paired = {}
for cid, d in boots.items():
    paired[cid] = {k: {"mean": f(np.mean(v)), "ci95": [f(np.percentile(v, 2.5)), f(np.percentile(v, 97.5))]}
                   for k, v in d.items()}
    paired[cid]["ci_excludes_zero"] = {k: bool(np.percentile(v, 2.5) > 0 or np.percentile(v, 97.5) < 0)
                                       for k, v in d.items()}
best_test_f1 = max(test_f1.values())
out = {
    "meta": {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sklearn_version": sklearn.__version__, "seed": SEED, "cv_folds": CV_FOLDS,
        "positive_class": "is_fraud == 1 (fraudulent); every precision/recall/F1 is for the fraud class",
        "dataset": {"rows": int(len(df)), "features": list(Xte.columns), "n_features": int(Xte.shape[1]),
                    "fraudulent": int(df[TARGET].sum()), "legitimate": int((df[TARGET] == 0).sum()),
                    "fraud_percent": round(100 * float(df[TARGET].mean()), 2)},
        "split": {"strategy": "train_test_split, 80/20, stratified on is_fraud", "random_state": SEED,
                  "train_rows": int(len(ytr)), "test_rows": int(len(yte)),
                  "test_fraud": int(yte.sum()), "test_legitimate": int(len(yte) - yte.sum())},
        "majority_class_accuracy": f(max(yte.mean(), 1 - yte.mean())),
        "protocol": ["Test rows are never used for tuning, threshold choice or model selection.",
                     f"Hyper-parameters tuned with {CV_FOLDS}-fold stratified CV on training rows only.",
                     "Scaler is inside a Pipeline, so it is fit on training folds only.",
                     "Thresholds chosen on out-of-fold validation predictions.",
                     "Test metrics computed once per model after every choice was fixed."],
        "search_criterion": "F1 of the fraud class (precision and recall also recorded)",
        "threshold_rules": {"0.50": "common default for all models",
                            "f1_opt": "maximises validation F1 (primary validation-selected threshold)",
                            "youden": "maximises validation recall + specificity - 1 (secondary, class-balance aware)"},
        "selection_rule": f"highest validation F1 at the model's f1_opt threshold; differences <= {TIE_TOLERANCE} are ties "
                          "resolved toward the simpler model (original LR, then tuned LR, then Random Forest)",
        "synthetic_data_note": ("The dataset is synthetic. generate_data.py draws each label from a hand-written logistic "
                                "formula of the same seven features, with no intercept, so ~88% of rows are fraud. High scores "
                                "measure how well a model re-learns that formula, not how well it would detect real UPI fraud."),
    },
    "models": models_out,
    "selection": {"winner_id": winner, "validation_f1_at_f1_opt": val_f1, "tie_tolerance": TIE_TOLERANCE,
                  "test_f1_at_f1_opt": test_f1,
                  "winner_test_f1_gap_to_best": f(best_test_f1 - test_f1[winner]),
                  "winner_within_tie_tolerance_on_test": bool(best_test_f1 - test_f1[winner] <= TIE_TOLERANCE),
                  "paired_bootstrap_vs_original_at_0.50": {"resamples": B, "differences": paired}},
    "lr_ablation_cv": ablation,
    "class_weight_effect_cv": cw_effect,
    "generator_oracle_test": oracle,
}
(RESULTS / "model_comparison.json").write_text(json.dumps(out, indent=2))

# ---------------------------------------------------------------- console summary
print(f"\nSelected by validation rule: {winner}\n")
for m in models_out:
    t = m["test"]
    print(f"{m['short']:<15} val-F1@f1_opt={m['validation']['at']['f1_opt']['f1']:.4f} | "
          f"test @0.50: acc={t['at_0.50']['accuracy']:.4f} P={t['at_0.50']['precision']:.4f} R={t['at_0.50']['recall']:.4f} "
          f"F1={t['at_0.50']['f1']:.4f} | AUC={t['ranking']['roc_auc']:.4f} AP={t['ranking']['average_precision']:.4f}")
    print(f"{'':<15} test @f1_opt(th={m['validation']['thresholds']['f1_opt']}): acc={t['at_f1_opt']['accuracy']:.4f} "
          f"P={t['at_f1_opt']['precision']:.4f} R={t['at_f1_opt']['recall']:.4f} F1={t['at_f1_opt']['f1']:.4f} "
          f"cm={t['at_f1_opt']['confusion']}")
print("\nSaved results/model_comparison.json")
