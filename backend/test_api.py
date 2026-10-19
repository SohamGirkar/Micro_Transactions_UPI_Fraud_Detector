"""Contract tests for the API. NEW FILE (the project had no automated tests).

Run from the repo root:   pip install -r backend/requirements-dev.txt && python -m pytest backend -q
(use `python -m pytest`, not bare `pytest`, so the repo root is on the import path)
"""
import warnings
from fastapi.testclient import TestClient

warnings.filterwarnings("ignore")
from backend.main import app  # noqa: E402

client = TestClient(app)
SAMPLE = {"amount": 49, "transactions_last_hour": 14, "account_age_days": 30, "new_device": 1,
          "location_changed": 1, "failed_attempts": 3, "time_since_last_transaction": 12}


def test_predict_contract_unchanged():
    r = client.post("/api/predict", json=SAMPLE)
    assert r.status_code == 200
    j = r.json()
    assert set(j) == {"fraud_probability", "risk_level", "prediction", "shap_explanations"}
    assert j["risk_level"] in {"LOW RISK", "MEDIUM RISK", "HIGH RISK"}
    assert len(j["shap_explanations"]) == 7        # one SHAP contribution per feature


def test_predict_rejects_invalid_input():
    assert client.post("/api/predict", json={**SAMPLE, "amount": -1}).status_code == 422


def test_risk_thresholds():
    p = client.post("/api/predict", json=SAMPLE).json()["fraud_probability"]
    level = client.post("/api/predict", json=SAMPLE).json()["risk_level"]
    assert level == ("HIGH RISK" if p >= 70 else "MEDIUM RISK" if p >= 40 else "LOW RISK")


def test_model_comparison_schema():
    r = client.get("/api/model-comparison")
    assert r.status_code == 200
    j = r.json()
    assert [m["id"] for m in j["models"]] == ["lr_original", "lr_tuned", "rf_tuned"]
    for m in j["models"]:
        for view in ("at_0.50", "at_f1_opt", "at_youden"):
            t = m["test"][view]
            assert {"accuracy", "precision", "recall", "f1", "threshold", "confusion"} <= set(t)
            c = t["confusion"]
            assert c["tn"] + c["fp"] + c["fn"] + c["tp"] == j["meta"]["split"]["test_rows"]
        assert 0 <= m["test"]["ranking"]["roc_auc"] <= 1
    assert j["serving"]["model_id"] == "lr_original"
    assert j["serving"]["artifact_matches_evaluated"] is True   # the file served is the file that was evaluated


def test_model_comparison_selection_is_from_validation():
    j = client.get("/api/model-comparison").json()
    assert j["selection"]["winner_id"] in {m["id"] for m in j["models"]}
    assert j["meta"]["split"]["test_rows"] == 2000
