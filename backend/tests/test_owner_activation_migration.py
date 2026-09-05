from pathlib import Path


SQL = (
    Path(__file__).resolve().parents[2]
    / "database"
    / "64_atomic_owner_salon_activation.sql"
).read_text(encoding="utf-8")


def test_owner_activation_is_one_database_function_transaction():
    assert "FUNCTION public.activate_owner_and_create_salon_v1" in SQL
    assert "FOR UPDATE" in SQL
    assert "SET role = 'owner'" in SQL
    assert "INSERT INTO public.salons" in SQL
    assert "RETURNING * INTO v_salon" in SQL


def test_owner_activation_rpc_is_backend_only():
    signature = "public.activate_owner_and_create_salon_v1(UUID, UUID, JSONB)"
    assert f"REVOKE ALL ON FUNCTION {signature}" in SQL
    assert "FROM PUBLIC, anon, authenticated" in SQL
    assert f"GRANT EXECUTE ON FUNCTION {signature}" in SQL
    assert "TO service_role" in SQL


def test_recovery_refuses_salon_and_paid_history():
    assert "FUNCTION public.cancel_empty_owner_workspace_v1" in SQL
    assert "OWNER_RECOVERY_HAS_SALON" in SQL
    assert "OWNER_RECOVERY_HAS_BILLING_HISTORY" in SQL
    assert "status IN ('authorized', 'captured')" in SQL


def test_migration_does_not_touch_booking_contract():
    assert "ALTER TABLE public.bookings" not in SQL
    assert "DROP TABLE" not in SQL
    assert "DROP CONSTRAINT" not in SQL
