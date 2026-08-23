import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)

# ==========================================
# 1. LOAD DATA
# ==========================================

df = pd.read_csv("../dataset/transactions.csv")

print("Dataset loaded successfully!")
print(f"Total transactions: {len(df)}")


# ==========================================
# 2. SEPARATE FEATURES AND TARGET
# ==========================================

# Features = information the model uses
X = df.drop("is_fraud", axis=1)

# Target = what the model must predict
y = df["is_fraud"]


# ==========================================
# 3. SPLIT DATA
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print(f"\nTraining transactions: {len(X_train)}")
print(f"Testing transactions: {len(X_test)}")


# ==========================================
# 4. CREATE THE MODEL
# ==========================================

model = LogisticRegression(
    max_iter=1000
)


# ==========================================
# 5. TRAIN THE MODEL
# ==========================================

print("\nTraining model...")

model.fit(X_train, y_train)

print("Model training complete!")


# ==========================================
# 6. MAKE PREDICTIONS
# ==========================================

y_pred = model.predict(X_test)


# ==========================================
# 7. EVALUATE MODEL
# ==========================================

accuracy = accuracy_score(y_test, y_pred)

precision = precision_score(
    y_test,
    y_pred,
    zero_division=0
)

recall = recall_score(
    y_test,
    y_pred,
    zero_division=0
)

f1 = f1_score(
    y_test,
    y_pred,
    zero_division=0
)

cm = confusion_matrix(
    y_test,
    y_pred
)


# ==========================================
# 8. DISPLAY RESULTS
# ==========================================

print("\n===================================")
print("       MODEL PERFORMANCE")
print("===================================")

print(f"Accuracy  : {accuracy:.4f}")
print(f"Precision : {precision:.4f}")
print(f"Recall    : {recall:.4f}")
print(f"F1 Score  : {f1:.4f}")

print("\nConfusion Matrix:")
print(cm)


# ==========================================
# 9. SAVE MODEL
# ==========================================

joblib.dump(
    model,
    "../models/fraud_model.pkl"
)

print("\nModel saved successfully!")
print("../models/fraud_model.pkl")