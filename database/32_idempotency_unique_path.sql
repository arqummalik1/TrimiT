-- 32: Idempotency unique key must include request_path (HIGH-08)

ALTER TABLE public.idempotency_keys
  DROP CONSTRAINT IF EXISTS idempotency_keys_user_id_idempotency_key_key;

DROP INDEX IF EXISTS idempotency_keys_user_id_idempotency_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_idempotency_user_key_path
  ON public.idempotency_keys (user_id, idempotency_key, request_path);

SELECT 'Migration 32 applied: idempotency unique (user_id, key, path)' AS status;
