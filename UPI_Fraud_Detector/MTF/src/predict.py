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
# HUMAN-READABLE SHAP EXPLANATION
# ==========================================

print("\n===================================")
print("       WHY THIS PREDICTION?")
print("===================================")

print("Top factors influencing the model:\n")


def explain_feature(feature, value, shap_value):
    """
    Convert a technical SHAP result into
    a human-readable explanation.
    """

    if feature == "transactions_last_hour":

        if shap_value > 0:
            return (
                f"High transaction frequency: "
                f"{int(value)} transactions occurred "
                f"in the last hour."
            )
        else:
            return (
                f"Normal transaction frequency: "
                f"{int(value)} transactions occurred "
                f"in the last hour."
            )

    elif feature == "failed_attempts":

        if shap_value > 0:
            return (
                f"Multiple failed attempts: "
                f"{int(value)} failed attempts were detected."
            )
        else:
            return (
                f"Low number of failed attempts: "
                f"{int(value)} failed attempts were detected."
            )

    elif feature == "new_device":

        if value == 1:
            if shap_value > 0:
                return (
                    "New device detected: "
                    "the transaction was made from a new device."
                )
            else:
                return (
                    "New device detected, but this feature "
                    "did not strongly increase the fraud prediction."
                )
        else:
            return (
                "Known device: the transaction was made "
                "from a previously recognized device."
            )

    elif feature == "location_changed":

        if value == 1:
            return (
                "Location change detected: "
                "the transaction occurred from a changed location."
            )
        else:
            return (
                "No location change was detected."
            )

    elif feature == "amount":

        if shap_value > 0:
            return (
                f"Transaction amount of ₹{value:.2f} "
                "increased the fraud prediction."
            )
        else:
            return (
                f"Transaction amount of ₹{value:.2f} "
                "did not increase the fraud prediction."
            )

    elif feature == "account_age_days":

        if shap_value > 0:
            return (
                f"Account age of {int(value)} days "
                "increased the fraud prediction."
            )
        else:
            return (
                f"Account age of {int(value)} days "
                "reduced the fraud prediction."
            )

    elif feature == "time_since_last_transaction":

        if shap_value > 0:
            return (
                f"Only {value:.1f} seconds since the previous "
                "transaction increased the fraud prediction."
            )
        else:
            return (
                f"{value:.1f} seconds since the previous "
                "transaction reduced the fraud prediction."
            )

    return (
        f"{feature} influenced the model's prediction."
    )


# Display the three strongest SHAP contributors
for rank, (_, row) in enumerate(
    feature_contributions.head(3).iterrows(),
    start=1
):

    explanation = explain_feature(
        row["feature"],
        row["value"],
        row["shap_value"]
    )

    if row["shap_value"] > 0:
        direction = "↑ FRAUD RISK"
    else:
        direction = "↓ FRAUD RISK"

    print(f"{rank}. {explanation}")
    print(f"   {direction}")
    print(
        f"   SHAP impact: "
        f"{row['shap_value']:.4f}\n"
    )

print("===================================")