"""
public.users profile helpers — safe upsert and role preservation.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from core.supabase import supabase

logger = logging.getLogger("trimit")

VALID_ROLES = frozenset({"customer", "owner"})


def normalize_role(value: Any) -> str:
    """
    Validate and normalise a role string.

    Raises ValueError for any value that is not 'customer' or 'owner'.
    This is intentional — callers must always supply an explicit, validated
    role. Silently defaulting to 'customer' masks bugs and was the root
    cause of the onboarding role-assignment issue.
    """
    if isinstance(value, str):
        r = value.strip().lower()
        if r in VALID_ROLES:
            return r
    raise ValueError(
        f"Invalid role value {value!r}. Must be one of: {sorted(VALID_ROLES)}"
    )


def normalize_role_safe(value: Any, default: str = "customer") -> str:
    """
    Normalise a role string with a fallback default.

    Use ONLY for existing-profile repair paths (resolve_profile_for_user)
    where the DB row already has a role that may be slightly malformed.
    Do NOT use for new profile creation — use normalize_role() instead.
    """
    try:
        return normalize_role(value)
    except ValueError:
        logger.warning("normalize_role_safe: unexpected role value %r, using %r", value, default)
        return default


def role_from_user_metadata(metadata: Optional[Dict[str, Any]]) -> Optional[str]:
    if not isinstance(metadata, dict):
        return None
    role = metadata.get("role")
    if isinstance(role, str) and role.strip().lower() in VALID_ROLES:
        return role.strip().lower()
    return None


async def fetch_profile_service_role(user_id: str) -> Optional[Dict[str, Any]]:
    resp = await supabase.request(
        "GET",
        f"rest/v1/users?id=eq.{user_id}&select=*",
        service_role=True,
    )
    if resp.status_code == 200 and resp.json():
        return resp.json()[0]
    return None


def merge_profile_fields(
    existing: Optional[Dict[str, Any]],
    incoming: Dict[str, Any],
    *,
    prefer_incoming_role: bool = False,
) -> Dict[str, Any]:
    """
    Merge profile updates without clobbering owner → customer on repair paths.
    When prefer_incoming_role=True (signup), the requested role wins over customer default.
    """
    patch = {k: v for k, v in incoming.items() if k != "id" and v is not None}
    inc_role = normalize_role_safe(patch.get("role", "customer"))
    if existing:
        ex_role = normalize_role_safe(existing.get("role"))
        if prefer_incoming_role:
            if inc_role == "owner":
                patch["role"] = "owner"
            else:
                patch["role"] = ex_role if ex_role == "owner" else inc_role
        else:
            if ex_role == "owner" and inc_role == "customer":
                patch["role"] = "owner"
            else:
                patch["role"] = inc_role
    else:
        patch["role"] = inc_role
    return patch


async def upsert_user_profile(
    user_id: str,
    profile_data: Dict[str, Any],
    *,
    prefer_incoming_role: bool = False,
    _retry_count: int = 0,
) -> Dict[str, Any]:
    """
    Insert or update public.users. Returns the canonical profile row.

    `_retry_count` is internal; it caps the recursive 409 retry at one extra
    attempt so a persistent constraint mismatch cannot infinite-loop.
    """
    existing = await fetch_profile_service_role(user_id)
    if existing:
        patch = merge_profile_fields(
            existing, profile_data, prefer_incoming_role=prefer_incoming_role
        )
        patch_resp = await supabase.request(
            "PATCH",
            f"rest/v1/users?id=eq.{user_id}",
            json=patch,
            service_role=True,
        )
        if patch_resp.status_code not in (200, 201, 204):
            logger.error(
                "Profile PATCH failed user=%s status=%s body=%s",
                user_id,
                patch_resp.status_code,
                patch_resp.text,
            )
            raise RuntimeError(f"Profile upsert failed: {patch_resp.status_code}")
        updated = await fetch_profile_service_role(user_id)
        return updated or {**existing, **patch}

    insert_resp = await supabase.request(
        "POST",
        "rest/v1/users",
        json=profile_data,
        service_role=True,
    )
    if insert_resp.status_code in (200, 201):
        if insert_resp.json():
            row = insert_resp.json()
            if isinstance(row, list) and row:
                return row[0]
            if isinstance(row, dict):
                return row
        fetched = await fetch_profile_service_role(user_id)
        return fetched or profile_data

    if insert_resp.status_code == 409 and _retry_count < 1:
        # Concurrent insert won the race — re-read and PATCH on the next pass.
        return await upsert_user_profile(
            user_id,
            profile_data,
            prefer_incoming_role=prefer_incoming_role,
            _retry_count=_retry_count + 1,
        )

    logger.error(
        "Profile INSERT failed user=%s status=%s retries=%s body=%s",
        user_id,
        insert_resp.status_code,
        _retry_count,
        insert_resp.text,
    )
    raise RuntimeError(f"Profile insert failed: {insert_resp.status_code}")


async def create_new_profile(
    user_id: str,
    email: str,
    role: str,
    name: str,
    phone: Optional[str],
) -> Dict[str, Any]:
    """
    Create a brand-new profile row in public.users.

    This is the ONLY entry point for new profile creation. It is called
    exclusively by POST /auth/complete-profile after the user is authenticated
    but has no profile row yet.

    Idempotent: if a row already exists for this user_id, returns it without
    error. This handles retries and the case where the user calls the endpoint
    twice (e.g. after a network timeout on the first call).

    Raises:
        ValueError: if role is not 'customer' or 'owner'.
        RuntimeError: if the database insert fails.
    """
    # Validate role before any DB call. normalize_role raises for invalid values.
    validated_role = normalize_role(role)

    existing = await fetch_profile_service_role(user_id)
    if existing:
        logger.info(
            "create_new_profile: profile already exists for user=%s role=%s — returning existing",
            user_id[:8] if user_id else "?",
            existing.get("role"),
        )
        return existing

    profile_data = {
        "id": user_id,
        "email": email or "",
        "role": validated_role,
        "name": name.strip(),
        "phone": phone.strip() if phone else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    logger.info(
        "create_new_profile: inserting profile user=%s role=%s",
        user_id[:8] if user_id else "?",
        validated_role,
    )
    return await upsert_user_profile(user_id, profile_data, prefer_incoming_role=True)


async def resolve_profile_for_user(
    user_id: str,
    email: str,
    user_metadata: Optional[Dict[str, Any]] = None,
    *,
    user_jwt: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Definitive profile for login /auth/me: service-role read first, then user JWT.
    If the profile is missing in the database, returns None (onboarding/profile completion required).
    """
    row = await fetch_profile_service_role(user_id)
    if row:
        meta_role = role_from_user_metadata(user_metadata)
        if meta_role == "owner" and normalize_role_safe(row.get("role")) == "customer":
            logger.warning(
                "resolve_profile_for_user: upgrading customer→owner from metadata user=%s",
                user_id[:8] if user_id else "?",
            )
            row = await upsert_user_profile(
                user_id,
                {
                    "id": user_id,
                    "role": "owner",
                    "email": row.get("email") or email,
                    "name": row.get("name") or (email.split("@")[0] if email else "User"),
                },
                prefer_incoming_role=True,
            )
        return row

    if user_jwt:
        resp = await supabase.request(
            "GET",
            f"rest/v1/users?id=eq.{user_id}&select=*",
            token=user_jwt,
        )
        if resp.status_code == 200 and resp.json():
            return resp.json()[0]

    # No profile exists in public.users yet. Return None to require /complete-profile step.
    return None

