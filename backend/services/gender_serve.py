"""Salon gender serve + discovery filter helpers."""

from typing import Optional

VALID_SALON_GENDER_SERVE = frozenset({"men", "women", "unisex"})
VALID_SERVICE_AUDIENCE = frozenset({"men", "women", "both"})
VALID_USER_GENDER = frozenset({"male", "female"})
VALID_DISCOVERY_AUDIENCE = frozenset({"auto", "men", "women", "all"})


def normalize_discover_filter(value: Optional[str]) -> Optional[str]:
    """API query gender_serve: men | women | None (all)."""
    if not value:
        return None
    v = str(value).strip().lower()
    if v in ("men", "women"):
        return v
    return None


def salon_matches_discover_filter(gender_serve: Optional[str], filter_kind: Optional[str]) -> bool:
    serve = (gender_serve or "unisex").lower()
    if not filter_kind:
        return True
    if filter_kind == "men":
        return serve in ("men", "unisex")
    if filter_kind == "women":
        return serve in ("women", "unisex")
    return True


def default_service_audience_for_salon(gender_serve: Optional[str]) -> str:
    serve = (gender_serve or "unisex").lower()
    if serve == "men":
        return "men"
    if serve == "women":
        return "women"
    return "both"
