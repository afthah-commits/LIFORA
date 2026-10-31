import httpx
import pytest


@pytest.mark.asyncio
async def test_health_check(client: httpx.AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_login_success(client: httpx.AsyncClient, test_user):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "testuser@fitpulse.ai",
        "password": "password123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "testuser@fitpulse.ai"

@pytest.mark.asyncio
async def test_login_invalid_password(client: httpx.AsyncClient, test_user):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "testuser@fitpulse.ai",
        "password": "wrongpassword"
    })
    assert resp.status_code == 401

@pytest.mark.asyncio
async def test_refresh_token_rotation(client: httpx.AsyncClient, test_user):
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": "testuser@fitpulse.ai",
        "password": "password123"
    })
    refresh_token = login_resp.json()["refresh_token"]

    # Rotate
    refresh_resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert refresh_resp.status_code == 200
    new_data = refresh_resp.json()
    assert "access_token" in new_data
    assert "refresh_token" in new_data
    assert new_data["refresh_token"] != refresh_token

    # Reusing the old refresh token must be rejected
    reuse_resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert reuse_resp.status_code == 401

@pytest.mark.asyncio
async def test_get_current_user_me(client: httpx.AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "testuser@fitpulse.ai"
    assert data["profile"]["age"] == 19
    assert data["goals"]["daily_protein_target_g"] == 85.0
