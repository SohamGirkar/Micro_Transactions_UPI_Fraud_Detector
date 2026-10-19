import pandas as pd
import numpy as np

# Make the random data reproducible
np.random.seed(42)

# Number of transactions we want to create
N = 10000

# -----------------------------
# Generate transaction features
# -----------------------------

# Transaction amount
amount = np.random.lognormal(
    mean=4,
    sigma=1,
    size=N
).round(2)

# Number of transactions made by the user in the last hour
transactions_last_hour = np.random.poisson(
    lam=3,
    size=N
)

# Age of the account in days
account_age_days = np.random.randint(
    1,
    1500,
    size=N
)

# Whether the user is using a new device
# 0 = No, 1 = Yes
new_device = np.random.binomial(
    1,
    0.15,
    size=N
)

# Whether the transaction location has changed
# 0 = No, 1 = Yes
location_changed = np.random.binomial(
    1,
    0.10,
    size=N
)

# Number of failed attempts recently
failed_attempts = np.random.poisson(
    lam=0.5,
    size=N
)

# Seconds since the user's previous transaction
time_since_last_transaction = np.random.exponential(
    scale=1800,
    size=N
).round(0)

# -----------------------------
# Create a fraud risk score
# -----------------------------

risk_score = (
    0.0005 * amount
    + 0.20 * transactions_last_hour
    + 1.2 * new_device
    + 1.0 * location_changed
    + 0.35 * failed_attempts
    - 0.0003 * account_age_days
    - 0.0003 * time_since_last_transaction
)

# Convert risk score into probability
fraud_probability = 1 / (1 + np.exp(-risk_score))

# Create fraud labels
# 0 = Legitimate
# 1 = Fraud
is_fraud = np.random.binomial(
    1,
    fraud_probability
)

# -----------------------------
# Create the dataset
# -----------------------------

df = pd.DataFrame({
    "amount": amount,
    "transactions_last_hour": transactions_last_hour,
    "account_age_days": account_age_days,
    "new_device": new_device,
    "location_changed": location_changed,
    "failed_attempts": failed_attempts,
    "time_since_last_transaction": time_since_last_transaction,
    "is_fraud": is_fraud
})

# -----------------------------
# Save the dataset
# -----------------------------

df.to_csv(
    "../dataset/transactions.csv",
    index=False
)

# -----------------------------
# Display results
# -----------------------------

print("===================================")
print("  UPI Fraud Detector - V1")
print("===================================")

print("\nDataset created successfully!")

print(f"Total transactions: {len(df)}")

print(
    f"Fraudulent transactions: "
    f"{df['is_fraud'].sum()}"
)

print(
    f"Legitimate transactions: "
    f"{(df['is_fraud'] == 0).sum()}"
)

print("\nFirst 5 transactions:")
print(df.head())

print("\nDataset saved to:")
print("../dataset/transactions.csv")