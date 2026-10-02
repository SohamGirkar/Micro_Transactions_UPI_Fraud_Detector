import pandas as pd

df = pd.read_csv("transactions1.csv")

amount_threshold = 50
frequency_threshold = 10

fraud_flags = []
reasons = []
risk_scores = []

for index, row in df.iterrows():
    score = 0
    reason = []
    if row["amount"] <= amount_threshold:
        score += 0.4
        reason.append("Low transaction amount")
    if row["txns_last_24h"] >= frequency_threshold:
        score += 0.4
        reason.append("High transaction frequency in last 24 hours")

    receiver_count = df[df["receiver_id"] == row["receiver_id"]]["user_id"].nunique()
    if receiver_count >= 3:
        score += 0.2
        reason.append("Multiple users sending to same receiver")
    if score >= 0.7:
        fraud_flags.append("FRAUD")
    else:
        fraud_flags.append("NORMAL")

    reasons.append("; ".join(reason))
    risk_scores.append(round(score, 2))

df["fraud_status"] = fraud_flags
df["risk_score"] = risk_scores
df["explanation"] = reasons

print("Total transactions:", len(df))
print("Fraud cases detected:", df[df['fraud_status'] == 'FRAUD'].shape[0])

df.to_csv("fraud_output1.csv", index=False)
print("Fraud detection completed. Results saved to fraud_output.csv")
