import joblib
import pandas as pd

# ==========================================
# LOAD TRAINED MODEL
# ==========================================

model = joblib.load("../models/fraud_model.pkl")

print("===================================")
print("       UPI FRAUD DETECTOR V1")
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

print("===================================")