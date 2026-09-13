-- Read-only verification for the 2026-09-12 security migrations.
-- Run in Supabase SQL Editor after applying all five migrations.

-- 1. No anonymous access may remain on sensitive tables.
SELECT grant_item.table_name, grant_item.privilege_type
FROM information_schema.role_table_grants AS grant_item
WHERE grant_item.table_schema = 'public'
  AND grant_item.grantee = 'anon'
  AND grant_item.table_name = ANY (ARRAY[
    'Perfil','Pasaporte_habitat','Garante','Documento_garante','Verificacion_kyc',
    'Pago_pasaporte','employment_records','legal_records','atm_records',
    'Mensaje_Contrato','Contrato','Firma_contrato','Inventario_Digital',
    'Detalle_Inventario_Item','Foto_Item_Inventario','Pago','Historial_pago',
    'Historial_Estado_Contrato','Solicitud','Notificacion'
  ])
ORDER BY grant_item.table_name, grant_item.privilege_type;
-- Expected: 0 rows.

-- 2. RLS must be enabled on every sensitive table.
SELECT namespace.nspname AS schema_name, relation.relname AS table_name
FROM pg_catalog.pg_class AS relation
JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relkind IN ('r', 'p')
  AND relation.relname = ANY (ARRAY[
    'Perfil','Pasaporte_habitat','Garante','Documento_garante','Verificacion_kyc',
    'Pago_pasaporte','employment_records','legal_records','atm_records',
    'Mensaje_Contrato','Contrato','Firma_contrato','Inventario_Digital',
    'Detalle_Inventario_Item','Foto_Item_Inventario','Pago','Historial_pago',
    'Historial_Estado_Contrato','Solicitud','Notificacion'
  ])
  AND NOT relation.relrowsecurity
ORDER BY relation.relname;
-- Expected: 0 rows.

-- 3. Contract documents must be private and constrained.
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('contratos_firmados', 'propiedades_multimedia')
ORDER BY id;
-- Expected: contratos_firmados.public = false with a 100 MiB limit and the
-- configured document/media MIME list; propiedades_multimedia remains public
-- with a 10 MiB image-only limit.

-- 4. Browser roles must not execute authoritative server functions.
SELECT routine.routine_name, routine.grantee, routine.privilege_type
FROM information_schema.role_routine_grants AS routine
WHERE routine.specific_schema = 'public'
  AND routine.routine_name IN ('finalize_signed_contract_state', 'consume_api_rate_limit')
  AND routine.grantee IN ('PUBLIC', 'anon', 'authenticated')
ORDER BY routine.routine_name, routine.grantee;
-- Expected: 0 rows.

-- 5. The private rate-limit table must also have RLS enabled.
SELECT namespace.nspname AS schema_name, relation.relname AS table_name
FROM pg_catalog.pg_class AS relation
JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'private'
  AND relation.relname = 'api_rate_limits'
  AND relation.relkind IN ('r', 'p')
  AND NOT relation.relrowsecurity;
-- Expected: 0 rows.

-- 6. Guarantor invite material must be hashed, expiring and never stored raw.
SELECT
  count(*) FILTER (WHERE token_hash IS NULL) AS missing_hash,
  count(*) FILTER (WHERE token_expires_at IS NULL) AS missing_expiry,
  count(*) FILTER (WHERE token_invitacion NOT LIKE 'redacted_%') AS raw_tokens_remaining
FROM public."Garante";
-- Expected: all three values are 0.

-- 7. Confirm the expected security policies exist.
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_catalog.pg_policies
WHERE schemaname IN ('public', 'storage')
  AND policyname LIKE 'vivat_%'
ORDER BY schemaname, tablename, policyname;

-- 8. Consolidated result. Every column must be true.
WITH sensitive(table_name) AS (
  VALUES
    ('Perfil'),('Pasaporte_habitat'),('Garante'),('Documento_garante'),('Verificacion_kyc'),
    ('Pago_pasaporte'),('employment_records'),('legal_records'),('atm_records'),
    ('Mensaje_Contrato'),('Contrato'),('Firma_contrato'),('Inventario_Digital'),
    ('Detalle_Inventario_Item'),('Foto_Item_Inventario'),('Pago'),('Historial_pago'),
    ('Historial_Estado_Contrato'),('Solicitud'),('Notificacion')
), required_policies(policyname) AS (
  VALUES
    ('vivat_profile_select_own'),
    ('vivat_profile_update_own'),
    ('vivat_passport_select_own'),
    ('vivat_guarantor_select_participant'),
    ('vivat_contract_select_participant'),
    ('vivat_signature_select_participant'),
    ('vivat_inventory_select_participant'),
    ('vivat_payment_select_participant'),
    ('vivat_contract_message_insert'),
    ('vivat_contract_file_select_participant'),
    ('vivat_property_media_read_public')
)
SELECT
  NOT EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants AS grant_item
    JOIN sensitive ON sensitive.table_name = grant_item.table_name
    WHERE grant_item.table_schema = 'public'
      AND grant_item.grantee = 'anon'
  ) AS anon_sin_acceso_sensible,
  NOT EXISTS (
    SELECT 1
    FROM sensitive
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname = sensitive.table_name
        AND relation.relkind IN ('r', 'p')
        AND relation.relrowsecurity
    )
  ) AS rls_sensible_activo,
  coalesce((
    SELECT NOT bucket.public
      AND bucket.file_size_limit = 104857600
      AND bucket.allowed_mime_types = ARRAY[
        'application/pdf','image/jpeg','image/png','image/webp','video/mp4','video/webm'
      ]::text[]
    FROM storage.buckets AS bucket
    WHERE bucket.id = 'contratos_firmados'
  ), false) AS contratos_bucket_privado,
  NOT EXISTS (
    SELECT 1
    FROM information_schema.role_routine_grants AS routine
    WHERE routine.specific_schema = 'public'
      AND routine.routine_name IN ('finalize_signed_contract_state', 'consume_api_rate_limit')
      AND lower(routine.grantee) IN ('public', 'anon', 'authenticated')
  ) AS funciones_autoritativas_privadas,
  coalesce((
    SELECT relation.relrowsecurity
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'private' AND relation.relname = 'api_rate_limits'
  ), false) AS rate_limit_con_rls,
  NOT EXISTS (
    SELECT 1 FROM public."Garante"
    WHERE token_hash IS NULL
       OR token_expires_at IS NULL
       OR token_invitacion NOT LIKE 'redacted_%'
  ) AS tokens_garante_protegidos,
  NOT EXISTS (
    SELECT policyname FROM required_policies
    EXCEPT
    SELECT policy.policyname
    FROM pg_catalog.pg_policies AS policy
    WHERE policy.schemaname IN ('public', 'storage')
  ) AS politicas_clave_presentes;
