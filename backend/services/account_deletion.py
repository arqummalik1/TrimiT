"""Account-deletion cleanup shared by the authenticated delete endpoint."""

from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
import logging
from typing import Iterable

import httpx
import jwt

from config import settings
from core.supabase import supabase

logger = logging.getLogger("trimit")

APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token"
APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke"
MEDIA_BUCKET = "salon-images"
MEDIA_PREFIXES = ("services", "staff")


class AccountDeletionCleanupError(RuntimeError):
    """Raised when account-owned data cannot be safely removed."""


@dataclass(frozen=True)
class AuthProviderContext:
    providers: frozenset[str]
    apple_subject: str | None = None


def _apple_configuration() -> tuple[str, str, str, str] | None:
    values = (
        settings.APPLE_CLIENT_ID,
        settings.APPLE_TEAM_ID,
        settings.APPLE_KEY_ID,
        settings.APPLE_PRIVATE_KEY,
    )
    if not all(values):
        return None
    client_id, team_id, key_id, private_key = values
    return str(client_id), str(team_id), str(key_id), str(private_key).replace("\\n", "\n")


def build_apple_client_secret(now: datetime | None = None) -> tuple[str, str] | None:
    """Return (client_id, signed client secret), or None when unconfigured."""
    config = _apple_configuration()
    if not config:
        return None
    client_id, team_id, key_id, private_key = config
    issued_at = now or datetime.now(timezone.utc)
    claims = {
        "iss": team_id,
        "iat": int(issued_at.timestamp()),
        "exp": int((issued_at + timedelta(minutes=10)).timestamp()),
        "aud": "https://appleid.apple.com",
        "sub": client_id,
    }
    secret = jwt.encode(claims, private_key, algorithm="ES256", headers={"kid": key_id})
    return client_id, secret


async def revoke_apple_authorization_code(
    code: str,
    *,
    expected_subject: str | None = None,
) -> None:
    """Exchange a fresh Apple code and revoke the resulting refresh token."""
    credentials = build_apple_client_secret()
    if not credentials:
        raise AccountDeletionCleanupError(
            "Sign in with Apple deletion is not configured on the server. Please contact support."
        )
    client_id, client_secret = credentials

    async with httpx.AsyncClient(timeout=15.0) as client:
        exchange = await client.post(
            APPLE_TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
            },
        )
        if exchange.status_code != 200:
            logger.error("[account_deletion] Apple code exchange failed status=%s", exchange.status_code)
            raise AccountDeletionCleanupError(
                "Apple could not confirm account deletion. Please try again."
            )

        exchange_body = exchange.json()
        if expected_subject:
            identity_token = exchange_body.get("id_token")
            try:
                claims = jwt.decode(
                    identity_token,
                    options={"verify_signature": False, "verify_aud": False},
                )
            except (jwt.PyJWTError, TypeError):
                claims = {}
            if claims.get("sub") != expected_subject:
                raise AccountDeletionCleanupError(
                    "Please confirm deletion with the same Apple ID used for this account."
                )

        refresh_token = exchange_body.get("refresh_token")
        if not refresh_token:
            logger.error("[account_deletion] Apple exchange returned no refresh token")
            raise AccountDeletionCleanupError(
                "Apple could not confirm account deletion. Please try again."
            )

        revoke = await client.post(
            APPLE_REVOKE_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "token": refresh_token,
                "token_type_hint": "refresh_token",
            },
        )
        if revoke.status_code != 200:
            logger.error("[account_deletion] Apple token revoke failed status=%s", revoke.status_code)
            raise AccountDeletionCleanupError(
                "Apple could not revoke account access. Please try again."
            )


async def auth_provider_context_for_user(user_id: str) -> AuthProviderContext:
    response = await supabase.request(
        "GET", f"auth/v1/admin/users/{user_id}", service_role=True
    )
    if response.status_code != 200:
        logger.error(
            "[account_deletion] Could not inspect providers user=%s status=%s",
            user_id,
            response.status_code,
        )
        raise AccountDeletionCleanupError(
            "Could not verify your sign-in provider. Please try again."
        )
    body = response.json()
    identities = [item for item in body.get("identities", []) if isinstance(item, dict)]
    providers = {
        str(item.get("provider", "")).lower()
        for item in identities
        if item.get("provider")
    }
    app_metadata = body.get("app_metadata") or {}
    providers.update(str(value).lower() for value in app_metadata.get("providers", []) if value)
    if app_metadata.get("provider"):
        providers.add(str(app_metadata["provider"]).lower())
    apple_subject = next(
        (
            str((item.get("identity_data") or {}).get("sub"))
            for item in identities
            if str(item.get("provider", "")).lower() == "apple"
            and (item.get("identity_data") or {}).get("sub")
        ),
        None,
    )
    return AuthProviderContext(frozenset(providers), apple_subject)


async def _remove_storage_paths(paths: Iterable[str]) -> None:
    batch = list(paths)
    if not batch:
        return
    response = await supabase.request(
        "DELETE",
        f"storage/v1/object/{MEDIA_BUCKET}",
        service_role=True,
        json={"prefixes": batch},
    )
    if response.status_code not in (200, 204):
        raise AccountDeletionCleanupError("Could not remove account images. Please try again.")


async def delete_account_media(user_id: str) -> None:
    """Delete every uploaded service/staff image under this owner's prefixes."""
    for folder in MEDIA_PREFIXES:
        prefix = f"{folder}/{user_id}"
        while True:
            response = await supabase.request(
                "POST",
                f"storage/v1/object/list/{MEDIA_BUCKET}",
                service_role=True,
                json={
                    "prefix": prefix,
                    "limit": 1000,
                    "offset": 0,
                    "sortBy": {"column": "name", "order": "asc"},
                },
            )
            if response.status_code == 404:
                break
            if response.status_code != 200:
                raise AccountDeletionCleanupError("Could not inspect account images. Please try again.")
            entries = response.json()
            paths = [
                f"{prefix}/{item['name']}"
                for item in entries
                if isinstance(item, dict) and item.get("name") and item.get("id") is not None
            ]
            if not paths:
                break
            await _remove_storage_paths(paths)
            if len(paths) < 1000:
                break


async def delete_email_leads(email: str | None) -> None:
    """Remove pre-account marketing/waitlist rows tied to the account email."""
    if not email:
        return
    for table in ("early_access_emails", "waitlist_leads"):
        response = await supabase.request(
            "DELETE",
            f"rest/v1/{table}",
            service_role=True,
            params={"email": f"eq.{email}"},
        )
        if response.status_code not in (200, 204, 404):
            raise AccountDeletionCleanupError(
                "Could not remove all account data. Please try again."
            )
