# Explainable AI for UPI Micro-Transaction Fraud

This project is a prototype of an Explainable AI (XAI) system to detect low-value,
high-frequency fraudulent transactions in UPI systems.

## Features
- Detects micro-transaction fraud using behavioral rules
- Cross-user correlation (multiple users to same receiver)
- Human-readable explanations for each fraud case
- Generates risk score and explanations

## Tech Stack
- Python
- Pandas, NumPy
- CSV-based simulated dataset

## How to Run
```bash
pip install pandas numpy
python fraud_detector.py
