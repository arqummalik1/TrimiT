"""Tests for gender serve discovery filter helpers."""

from services.gender_serve import (
    normalize_discover_filter,
    salon_matches_discover_filter,
    default_service_audience_for_salon,
)


def test_normalize_discover_filter():
    assert normalize_discover_filter("men") == "men"
    assert normalize_discover_filter("women") == "women"
    assert normalize_discover_filter("all") is None
    assert normalize_discover_filter(None) is None


def test_salon_matches_discover_filter():
    assert salon_matches_discover_filter("men", "men") is True
    assert salon_matches_discover_filter("women", "men") is False
    assert salon_matches_discover_filter("unisex", "men") is True
    assert salon_matches_discover_filter("unisex", "women") is True
    assert salon_matches_discover_filter("women", None) is True


def test_default_service_audience_for_salon():
    assert default_service_audience_for_salon("men") == "men"
    assert default_service_audience_for_salon("women") == "women"
    assert default_service_audience_for_salon("unisex") == "both"
