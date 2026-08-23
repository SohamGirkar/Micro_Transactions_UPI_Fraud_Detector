import joblib
import pandas as pd
import shap

# ==========================================
# LOAD TRAINED MODEL
# ==========================================

model = joblib.load("../models/fraud_model.pkl")

# Load dataset to provide SHAP with background data
background_data = pd.read_csv("../dataset/transactions.csv")

# Remove the target column
background_data = background_data.drop("is_fraud", axis=1)

# Create SHAP explainer
explainer = shap.Explainer(
    model,
    background_data
)

print("===================================")
print("       UPI FRAUD DETECTOR V2")
print("===================================")


# ==========================================
# GET TRANSACTION DETAILS
# ==========================================

amount = float(input("\nTransaction amount: "))

transactions_last_hour = int(
    input("Transactions in last hour: ")
)

account_age_days = int(
    input("Account age (days): ")
)

new_device = int(
    input("New device? (1 = Yes, 0 = No): ")
)

location_changed = int(
    input("Location changed? (1 = Yes, 0 = No): ")
)

failed_attempts = int(
    input("Failed attempts: ")
)

time_since_last_transaction = float(
    input("Seconds since last transaction: ")
)


# ==========================================
# CREATE TRANSACTION
# ==========================================

transaction = pd.DataFrame([{
    "amount": amount,
    "transactions_last_hour": transactions_last_hour,
    "account_age_days": account_age_days,
    "new_device": new_device,
    "location_changed": location_changed,
    "failed_attempts": failed_attempts,
    "time_since_last_transaction": time_since_last_transaction
}])


# ==========================================
# MAKE PREDICTION
# ==========================================

prediction = model.predict(transaction)[0]

probabilities = model.predict_proba(transaction)[0]

fraud_probability = probabilities[1] * 100


# ==========================================
# DETERMINE RISK LEVEL
# ==========================================

if fraud_probability >= 70:
    risk_level = "HIGH RISK"
elif fraud_probability >= 40:
    risk_level = "MEDIUM RISK"
else:
    risk_level = "LOW RISK"


# ==========================================
# SHAP EXPLANATION
# ==========================================

shap_values = explainer(transaction)

values = shap_values.values

# Handle SHAP output for binary classification
if len(values.shape) == 3:
    fraud_shap_values = values[0, :, 1]
else:
    fraud_shap_values = values[0]

feature_contributions = pd.DataFrame({
    "feature": transaction.columns,
    "value": transaction.iloc[0].values,
    "shap_value": fraud_shap_values
})

# Sort by strongest contribution
feature_contributions["absolute_shap"] = (
    feature_contributions["shap_value"].abs()
)

feature_contributions = feature_contributions.sort_values(
    "absolute_shap",
    ascending=False
)


# ==========================================
# DISPLAY RESULT
# ==========================================

print("\n===================================")
print("           FRAUD ANALYSIS")
print("===================================")

print(f"Fraud probability : {fraud_probability:.2f}%")
print(f"Risk level        : {risk_level}")

if prediction == 1:
    print("Prediction        : FRAUDULENT")
else:
    print("Prediction        : LEGITIMATE")


# ==========================================
# DISPLAY SHAP EXPLANATION
# ==========================================

print("\n===================================")
print("       WHY THIS PREDICTION?")
print("===================================")

print("Top factors influencing the model:\n")

for _, row in feature_contributions.head(3).iterrows():

    if row["shap_value"] > 0:
        direction = "towards FRAUD"
    else:
        direction = "towards LEGITIMATE"

    print(
        f"{row['feature']}: "
        f"{direction} "
        f"(impact: {row['shap_value']:.4f})"
    )

print("===================================")