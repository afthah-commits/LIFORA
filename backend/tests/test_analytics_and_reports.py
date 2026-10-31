import httpx
import pytest


@pytest.mark.asyncio
async def test_analytics_and_reports_export(client: httpx.AsyncClient, auth_headers: dict):
    # Analytics overview
    overview_resp = await client.get("/api/v1/analytics/overview?days=7", headers=auth_headers)
    assert overview_resp.status_code == 200
    overview = overview_resp.json()
    assert "nutrition_trend" in overview
    assert "activity_trend" in overview
    assert "weight_trend" in overview
    assert overview["total_days_in_period"] == 7

    # Report Data
    rep_resp = await client.get("/api/v1/reports/data?days=7", headers=auth_headers)
    assert rep_resp.status_code == 200
    report_data = rep_resp.json()
    assert report_data["report_type"] == "weekly"

    # CSV Export
    csv_resp = await client.get("/api/v1/reports/export/csv?days=7", headers=auth_headers)
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert "FITPULSE AI" in csv_resp.text

    # JSON Export
    json_resp = await client.get("/api/v1/reports/export/json?days=7", headers=auth_headers)
    assert json_resp.status_code == 200
    assert "application/json" in json_resp.headers["content-type"]

    # PDF Export
    pdf_resp = await client.get("/api/v1/reports/export/pdf?days=7", headers=auth_headers)
    assert pdf_resp.status_code == 200
    assert "application/pdf" in pdf_resp.headers["content-type"]
    assert len(pdf_resp.content) > 1000 # Valid generated PDF bytes
