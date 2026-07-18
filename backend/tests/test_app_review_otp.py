"""App Store Review fixed-OTP allowlist."""

from fastapi import status
from httpx import Response

from config import settings
from services import app_review_otp


REVIEW_EMAIL = "arqummalik1@gmail.com"
OWNER_EMAIL = "arqumwpem@gmail.com"
REVIEW_CODE = "654321"


def _enable_review_otp(monkeypatch):
    monkeypatch.setattr(
        settings,
        "APP_REVIEW_OTP_EMAILS",
        f"{REVIEW_EMAIL},{OWNER_EMAIL}",
    )
    monkeypatch.setattr(settings, "APP_REVIEW_OTP_CODE", REVIEW_CODE)


def test_review_otp_helpers(monkeypatch):
    _enable_review_otp(monkeypatch)
    assert app_review_otp.is_app_review_otp_email(REVIEW_EMAIL)
    assert app_review_otp.is_app_review_otp_email(OWNER_EMAIL.upper())
    assert not app_review_otp.is_app_review_otp_email("random@gmail.com")
    assert app_review_otp.review_otp_matches(REVIEW_EMAIL, REVIEW_CODE)
    assert not app_review_otp.review_otp_matches(REVIEW_EMAIL, "000000")


def test_send_otp_skips_supabase_for_review_email(client, mock_supabase, monkeypatch):
    _enable_review_otp(monkeypatch)
    resp = client.post("/api/v1/auth/send-otp", json={"email": REVIEW_EMAIL})
    assert resp.status_code == status.HTTP_200_OK
    # Must not call real Supabase OTP for allowlisted review emails.
    assert not any(c[0] == "POST" and "auth/v1/otp" in c[1] for c in mock_supabase.called)


def test_verify_otp_review_mints_session(client, mock_supabase, monkeypatch):
    _enable_review_otp(monkeypatch)
    mock_supabase.post("/auth/v1/admin/generate_link").mock(
        return_value=Response(
            200,
            json={"properties": {"hashed_token": "hash_abc"}, "user": {"id": "u-review"}},
        )
    )
    mock_supabase.post("/auth/v1/verify").mock(
        return_value=Response(
            200,
            json={
                "access_token": "atk",
                "refresh_token": "rtk",
                "token_type": "bearer",
                "expires_in": 3600,
                "user": {"id": "u-review", "email": REVIEW_EMAIL},
            },
        )
    )
    mock_supabase.get("/rest/v1/users").mock(
        return_value=Response(
            200,
            json=[{"id": "u-review", "email": REVIEW_EMAIL, "role": "customer", "name": "Review"}],
        )
    )

    resp = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": REVIEW_EMAIL, "token": REVIEW_CODE, "type": "magiclink"},
    )
    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["access_token"] == "atk"
    assert body["user"]["id"] == "u-review"


def test_verify_otp_review_wrong_code(client, mock_supabase, monkeypatch):
    _enable_review_otp(monkeypatch)
    resp = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": REVIEW_EMAIL, "token": "000000", "type": "magiclink"},
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.json()["error"]["details"]["code"] == "INVALID_OTP"
    assert not any(
        c[0] == "POST" and "generate_link" in c[1] for c in mock_supabase.called
    )


def test_verify_otp_non_review_unchanged(client, mock_supabase, monkeypatch):
    _enable_review_otp(monkeypatch)
    mock_supabase.post("/auth/v1/verify").mock(
        return_value=Response(400, json={"error_description": "Invalid token"})
    )
    resp = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "normal@example.com", "token": REVIEW_CODE, "type": "magiclink"},
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
