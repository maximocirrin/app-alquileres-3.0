BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public."Garante"
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS token_used_at timestamptz;

UPDATE public."Garante"
SET token_hash = encode(extensions.digest(token_invitacion, 'sha256'), 'hex'),
    token_expires_at = coalesce(token_expires_at, now() + interval '7 days'),
    token_invitacion = 'redacted_' || id_garante::text || '_' || encode(extensions.gen_random_bytes(12), 'hex')
WHERE token_hash IS NULL
  AND token_invitacion IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS garante_token_hash_unique
  ON public."Garante" (token_hash)
  WHERE token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS garante_active_token_lookup
  ON public."Garante" (token_hash, token_expires_at)
  WHERE token_used_at IS NULL;

REVOKE INSERT, UPDATE, DELETE ON public."Garante" FROM authenticated;
DROP POLICY IF EXISTS vivat_guarantor_insert_owner ON public."Garante";
DROP POLICY IF EXISTS vivat_guarantor_update_owner ON public."Garante";
DROP POLICY IF EXISTS vivat_guarantor_delete_owner ON public."Garante";

COMMIT;
