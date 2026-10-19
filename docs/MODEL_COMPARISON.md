# Model comparison: Logistic Regression vs Random Forest

> All numbers in this document are copied from `UPI_Fraud_Detector/MTF/results/model_comparison.json`
> and `baseline_metrics.json`, which are produced by the scripts below. None were typed in by hand.
> Regenerating the results (same seed) reproduces every metric and both model files exactly (only wall-clock timings vary). The interpretation text describes the run recorded here;
> revisit it if the data or code change.

## 1. Summary

| Question | Answer (measured) |
|---|---|
| Did tuning improve Logistic Regression? | **No measurable improvement.** CV search chose `C=1`, L2, no class weights (the original setting plus a scaler). Paired bootstrap on the test set: no measurable F1 or ROC-AUC difference. |
| Is Random Forest better? | **No.** ROC-AUC is measurably lower, F1 is statistically indistinguishable. |
| Model selected by the validation rule | **Original Logistic Regression** (ties go to the simpler model). |
| Model used by `/api/predict` and SHAP | Unchanged: the original Logistic Regression (`fraud_model.pkl`). |
| Why no improvement? | The labels are noisy draws from a hand-written formula. The formula's own true probabilities score ROC-AUC 0.8368 on the test rows, essentially the same as the models, so there is nothing left to learn. |

## 2. Dataset

| Property | Value |
|---|---|
| Rows | 10,000 |
| Features | 7: `amount`, `transactions_last_hour`, `account_age_days`, `new_device`, `location_changed`, `failed_attempts`, `time_since_last_transaction` |
| Fraudulent / legitimate | 8,822 / 1,178 (88.22% fraud) |
| Positive class | `is_fraud == 1`. Precision, recall and F1 below are all for the **fraud** class. |
| Train / test split | train_test_split, 80/20, stratified on is_fraud, `random_state=42`: 8,000 train / 2,000 test (1,764 fraud, 236 legitimate in test) |
| Majority-class accuracy on test | 88.20% (predict "fraud" for everything) |

This is the same split `train_model.py` has always used, so the test rows are exactly the ones the original model was evaluated on.

### Feature definitions

| Feature | Meaning | Generator distribution |
|---|---|---|
| `amount` | Transaction amount (₹) | LogNormal(8, 1) |
| `transactions_last_hour` | Transactions by the user in the last hour | Poisson(6) |
| `account_age_days` | Account age | Uniform integer [1, 1500) |
| `new_device` | 1 if from a new device | Bernoulli(0.15) |
| `location_changed` | 1 if location changed | Bernoulli(0.10) |
| `failed_attempts` | Recent failed attempts | Poisson(0.5) |
| `time_since_last_transaction` | Seconds since previous transaction | Exponential(1800) |

### How the labels are produced (important limitation)

`src/generate_data.py` computes a risk score
`0.0005·amount + 0.20·txns_last_hour + 1.2·new_device + 1.0·location_changed + 0.35·failed_attempts − 0.0003·account_age − 0.0003·secs_since_last`
(**no intercept**), converts it with a sigmoid, and draws `is_fraud ~ Bernoulli(probability)`.
Consequences:

* The label is a known function of the same seven features the model sees, plus random noise. A logistic model has the right form to learn it, so it can recover it, and nothing more complex can recover more than the noise allows.
* The score is positive for almost every row, which is why ~88% of rows are fraud.
* **A high score here measures how well a model re-learns this synthetic formula. It does not measure how well it would detect real UPI fraud.** Do not quote these numbers as real-world fraud detection performance.
* The dataset has few low-value transactions (the median amount is far above ₹500) and the formula makes large amounts *more* fraudulent, which is the opposite of a micro-transaction attack pattern.

## 3. Models

| Candidate | Description | Hyper-parameters |
|---|---|---|
| **A. Original Logistic Regression** | The saved `models/fraud_model.pkl`, never modified. Raw unscaled features. | `LogisticRegression(max_iter=1000)` defaults |
| **B. Tuned Logistic Regression** | `Pipeline(StandardScaler → LogisticRegression)`, saved as `models/tuned_logistic_model.pkl` | `C=1.0`, `class_weight=None`, `l1_ratio=0` |
| **C. Random Forest** | `RandomForestClassifier`, saved as `models/random_forest_model.pkl` (no scaling needed) | `n_estimators=200`, `min_samples_split=2`, `min_samples_leaf=1`, `max_features=0.5`, `max_depth=6`, `class_weight=None` |

### Search spaces

* **Logistic Regression** (full grid, 44 settings × 5 folds): `l1_ratio ∈ {0 (L2), 1 (L1)}`, `C ∈ logspace(-3, 2, 11)`, `class_weight ∈ {None, "balanced"}`, solver `liblinear`.
* **Random Forest** (randomized, 24 sampled settings × 5 folds): `n_estimators ∈ {200, 300}`, `max_depth ∈ {None, 6, 10, 16}`, `min_samples_split ∈ {2, 10, 30}`, `min_samples_leaf ∈ {1, 5, 15, 40}`, `max_features ∈ {sqrt, 0.5, 1.0}`, `class_weight ∈ {None, balanced, balanced_subsample}`.

## 4. Procedure (leakage controls)

1. Same 80/20 stratified split for every model. The test rows are used **only** in the final evaluation block, once per model.
2. Hyper-parameters are tuned with 5-fold stratified CV on the **training rows only**. The search criterion is the F1 of the fraud class (it balances precision and recall); precision, recall, average precision and ROC-AUC are recorded for every setting.
3. `StandardScaler` is inside the `Pipeline`, so it is fit on training folds only, never on validation folds or test rows.
4. **Thresholds are chosen on validation data:** out-of-fold probabilities for the training rows, produced by fold models that never saw the rows they score.
   * `0.50`: the common default, reported for all models.
   * `f1_opt`: maximises validation F1 (the primary validation-selected threshold).
   * `youden`: maximises validation recall + specificity − 1 (secondary, reported because with 88% fraud, maximising F1 alone pushes the threshold down until nearly everything is flagged).
5. **Model selection rule (fixed before test results were seen):** highest validation F1 at the model's own `f1_opt` threshold; differences ≤ 0.001 are ties resolved toward the simpler model (A, then B, then C).
6. No synthetic oversampling, no relabelling, no duplicated rows. A guard in `common.py` asserts that train and test indices are disjoint.
7. Paired bootstrap (2,000 resamples of the test rows) is used **for reporting only** to judge whether test differences exceed sampling noise. It does not feed any selection.

Known small caveat: out-of-fold predictions come from models trained on 80% of the training rows, while the final models use 100% of them, and the hyper-parameters were chosen on the same folds. This can make validation numbers slightly optimistic, equally for all candidates.

## 5. Results (held-out test set, 2,000 transactions)

### 5.1 Common threshold 0.50

| Model | Threshold | Accuracy | Precision | Recall | F1 | Specificity | ROC-AUC | Avg. precision | TN | FP | FN | TP | Flagged |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Original Logistic Regression | 0.500 | 89.45% | 89.92% | 99.15% | 94.31% | 16.95% | 0.8382 | 0.9745 | 40 | 196 | 15 | 1,749 | 97.25% |
| Tuned Logistic Regression | 0.500 | 89.35% | 89.83% | 99.15% | 94.26% | 16.10% | 0.8379 | 0.9745 | 38 | 198 | 15 | 1,749 | 97.35% |
| Random Forest | 0.500 | 88.85% | 88.93% | 99.77% | 94.04% | 7.20% | 0.8242 | 0.9722 | 17 | 219 | 4 | 1,760 | 98.95% |

### 5.2 Validation-selected threshold, F1-optimal

| Model | Threshold | Accuracy | Precision | Recall | F1 | Specificity | ROC-AUC | Avg. precision | TN | FP | FN | TP | Flagged |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Original Logistic Regression | 0.445 | 89.30% | 89.62% | 99.38% | 94.25% | 13.98% | 0.8382 | 0.9745 | 33 | 203 | 11 | 1,753 | 97.80% |
| Tuned Logistic Regression | 0.455 | 89.40% | 89.71% | 99.38% | 94.30% | 14.83% | 0.8379 | 0.9745 | 35 | 201 | 11 | 1,753 | 97.70% |
| Random Forest | 0.520 | 89.00% | 89.11% | 99.72% | 94.11% | 8.90% | 0.8242 | 0.9722 | 21 | 215 | 5 | 1,759 | 98.70% |

### 5.3 Validation-selected threshold, balanced (Youden)

| Model | Threshold | Accuracy | Precision | Recall | F1 | Specificity | ROC-AUC | Avg. precision | TN | FP | FN | TP | Flagged |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Original Logistic Regression | 0.875 | 73.10% | 96.16% | 72.39% | 82.60% | 78.39% | 0.8382 | 0.9745 | 185 | 51 | 487 | 1,277 | 66.40% |
| Tuned Logistic Regression | 0.860 | 75.55% | 96.03% | 75.40% | 84.47% | 76.69% | 0.8379 | 0.9745 | 181 | 55 | 434 | 1,330 | 69.25% |
| Random Forest | 0.870 | 68.60% | 96.10% | 67.12% | 79.04% | 79.66% | 0.8242 | 0.9722 | 188 | 48 | 580 | 1,184 | 61.60% |

"Flagged" is the share of all test transactions predicted fraud. At 0.50 and at the F1-optimal threshold, every model flags 97-99% of transactions and clears few legitimate ones (low specificity). That is what maximising F1 does when 88% of rows are fraud. The balanced threshold gives a very different operating point: far fewer false positives, at the cost of missing many frauds. Which one is right depends on the relative cost of a blocked legitimate payment versus a missed fraud, which this project does not define.

### 5.4 Confusion matrices at 0.50 (rows = actual, columns = predicted; fraud is positive)

**Original Logistic Regression**

| | Pred. legitimate | Pred. fraud |
|---|---|---|
| **Actual legitimate** | 40 | 196 |
| **Actual fraud** | 15 | 1,749 |

**Tuned Logistic Regression**

| | Pred. legitimate | Pred. fraud |
|---|---|---|
| **Actual legitimate** | 38 | 198 |
| **Actual fraud** | 15 | 1,749 |

**Random Forest**

| | Pred. legitimate | Pred. fraud |
|---|---|---|
| **Actual legitimate** | 17 | 219 |
| **Actual fraud** | 4 | 1,760 |

### 5.5 Selection by validation

| Model | Validation threshold (F1-opt) | Validation F1 | Test F1 at that threshold |
|---|---|---|---|
| Original Logistic Regression | 0.445 | 0.9401 | 0.9425 |
| Tuned Logistic Regression | 0.455 | 0.9401 | 0.9430 |
| Random Forest | 0.52 | 0.9391 | 0.9411 |

Selected by the stated rule: **Original Logistic Regression**. Test gap between the selected model and the best test F1: 0.0005 (within the 0.001 tolerance: True).

### 5.6 Are the test differences real? (paired bootstrap vs original LR at 0.50, 95% CI)

| Model | ΔF1 | ΔROC-AUC |
|---|---|---|
| Tuned Logistic Regression | -0.0005 [-0.0013, +0.0000] | -0.0003 [-0.0011, +0.0005] |
| Random Forest | -0.0027 [-0.0059, +0.0002] | -0.0140 [-0.0237, -0.0049] |

A difference is only treated as real if its interval excludes zero. Tuned LR: no measurable difference. Random Forest: ROC-AUC measurably lower; F1 not distinguishable.

### 5.7 What each Logistic Regression change contributed (CV on training rows)

| Step | F1 (mean ± std) | Precision | Recall | ROC-AUC |
|---|---|---|---|---|
| A: original (unscaled, C=1, L2) | 0.9395 ± 0.0019 | 0.8959 | 0.9875 | 0.8424 |
| A + StandardScaler (C=1, L2) | 0.9399 ± 0.0013 | 0.8960 | 0.9884 | 0.8424 |
| B: tuned (scaler + best C / L1-L2 / class weight) | 0.9400 ± 0.0014 | 0.8959 | 0.9887 | 0.8423 |
| class_weight = None (best C = 1, L2) | 0.9400 | 0.8959 | 0.9887 | 0.8423 |
| class_weight = balanced (best C = 3.16, L2) | 0.8199 | 0.9673 | 0.7115 | 0.8422 |

* **Scaling** changes the CV F1 by less than 0.001, which is within noise. It does not change what a logistic model can learn, but it makes coefficients comparable and regularisation meaningful.
* **`class_weight="balanced"`** was measured, not assumed. It raises precision but cuts recall sharply and lowers F1, because it makes the model treat the 12% legitimate class as equally important.
* **Regularisation strength / L1 vs L2:** the search settled on the default `C=1` with L2. There is no overfitting to remove with 8,000 rows and 7 features.

### 5.8 Training time (single fit on the 8,000 training rows)

| Model | Fit time | Search time |
|---|---|---|
| Original Logistic Regression | 0.087s | n/a |
| Tuned Logistic Regression | 0.012s | 5s |
| Random Forest | 1.227s | 137s |

Wall-clock times are the one thing that is **not** reproduced exactly: they depend on the machine and its load (these were measured on a 2-core cloud container). Every metric and both saved model files are byte-identical across re-runs.

## 6. Interpretation

* The data sets the ceiling. On the test rows the generator's own true probabilities score ROC-AUC 0.8368 and average precision 0.9743; the original model scores 0.8382 and 0.9745. No model can meaningfully exceed the noise in the labels.
* Random Forest is a flexible learner, but the true relationship is a smooth logistic function of the features. A forest approximates it with piecewise-constant steps, and extra flexibility only fits label noise, which is consistent with what cross-validation showed: a separate same-folds check on the training rows (other settings fixed, 5-fold CV) gave ROC-AUC 0.805 for unlimited depth, 0.817 at depth 3, **0.825 at depth 6**, 0.822 at depth 10 and 0.812 at depth 16, so the forest does worse the more freely it can fit. The forest's ROC-AUC on the test set is also lower than the logistic models'.
* Accuracy alone is insufficient: always predicting "fraud" already gives 88.20%. Compare precision, recall, specificity, the confusion matrix and the precision-recall curve instead.
* The only lever that clearly changes behaviour is the **decision threshold**, which trades false positives against false negatives (section 5.3). It should be chosen from the business cost of each error.

## 7. Limitations

* Synthetic data with a known, formula-generated label: results show recovery of a formula, not real fraud detection.
* One dataset, one split, one seed. CV and bootstrap measure sampling noise only.
* Extreme class imbalance in the opposite direction from real fraud (88% fraud; real fraud is typically well under 1%).
* No time ordering, user history or receiver identity, so drift, delayed labels and collusion cannot be studied.
* The 0.50 label and the 40/70 dashboard risk tiers are independent rules (`predict.py`); they can disagree.
* SHAP explanations in the dashboard are for the original Logistic Regression only. The Random Forest is evaluation-only and is not wired into `/api/predict`.
* The saved `.pkl` files depend on the scikit-learn version. Re-run the scripts if loading warns about versions.

## 8. Proposed robustness experiment (not run)

To test robustness to *changed fraud patterns* without touching the existing test set:

1. Write a second generator, `generate_shifted_data.py`, with a different seed and deliberately different fraud behaviour: (a) an intercept giving a realistic prevalence (e.g. 1-5%), (b) a micro-payment burst pattern (small amounts, high frequency, many payers to one receiver), (c) shifted coefficient signs/sizes for 2-3 features.
2. Train every candidate on the **current** training split only; evaluate on the shifted data, which is never used for tuning or threshold selection.
3. Report average precision, recall at a fixed false-positive rate, and degradation relative to in-distribution performance, with bootstrap intervals.
4. State plainly that this measures sensitivity to the author's assumptions, not real-world performance. Real validation would need real, labelled transactions.

## 9. Reproduce

```bash
# from the repository root
pip install -r backend/requirements.txt            # pandas, numpy, scikit-learn, joblib, shap, fastapi, uvicorn
python UPI_Fraud_Detector/MTF/src/baseline_metrics.py     # -> results/baseline_metrics.json   (seconds)
python UPI_Fraud_Detector/MTF/src/model_comparison.py     # -> results/model_comparison.json + 2 model files (~3 min on 2 cores)
```

Run on scikit-learn 1.9.1, seed 42. The scripts do not modify `dataset/transactions.csv`, `models/fraud_model.pkl`, `generate_data.py`, `train_model.py` or `predict.py`.

| File | Purpose |
|---|---|
| `UPI_Fraud_Detector/MTF/src/common.py` | Shared split, seed and metric helpers |
| `UPI_Fraud_Detector/MTF/src/baseline_metrics.py` | Baseline of the saved original model |
| `UPI_Fraud_Detector/MTF/src/model_comparison.py` | Tuning, threshold selection, evaluation, artifacts |
| `UPI_Fraud_Detector/MTF/results/*.json` | Saved results consumed by the API |
| `UPI_Fraud_Detector/MTF/models/tuned_logistic_model.pkl`, `random_forest_model.pkl` | New model artifacts |
| `backend/main.py` | Adds `GET /api/model-comparison` (reads saved JSON; no retraining) |
| `frontend/src/components/ModelComparison.tsx` | Comparison UI inside the Model Performance page |
