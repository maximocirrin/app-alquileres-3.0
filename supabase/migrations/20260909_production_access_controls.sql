-- Production access-control hardening only.
-- This migration changes RLS, grants, and existing Storage bucket settings.
-- It does not create/delete application tables, columns, or application rows.

BEGIN;

-- Enable RLS and remove any legacy permissive policies on personal/legal data.
-- Replacements are installed below in the same transaction.
DO $$
DECLARE
  target_table text;
  existing_policy record;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'Perfil',
    'Pasaporte_habitat',
    'Pasaporte_vivat',
    'Garante',
    'Documento_garante',
    'Verificacion_kyc',
    'Firma_contrato',
    'Contrato',
    'Inventario_Digital',
    'Notificacion'
  ]
  LOOP
    IF to_regclass(format('public.%I', target_table)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    FOR existing_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', existing_policy.policyname, target_table);
    END LOOP;

    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', target_table);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', target_table);
  END LOOP;
END $$;

DO $$
DECLARE
  passport_table text;
  guarantor_predicate text;
  guarantor_predicate_with_alias text;
  has_guarantor_profile boolean;
  has_guarantor_passport boolean;
BEGIN
  IF to_regclass('public."Perfil"') IS NOT NULL THEN
    GRANT SELECT, UPDATE ON TABLE public."Perfil" TO authenticated;
    CREATE POLICY "vivat_profile_select_own"
      ON public."Perfil" FOR SELECT TO authenticated
      USING (user_id = auth.uid());
    CREATE POLICY "vivat_profile_update_own"
      ON public."Perfil" FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  passport_table := CASE
    WHEN to_regclass('public."Pasaporte_habitat"') IS NOT NULL THEN 'Pasaporte_habitat'
    WHEN to_regclass('public."Pasaporte_vivat"') IS NOT NULL THEN 'Pasaporte_vivat'
    ELSE NULL
  END;

  IF passport_table IS NOT NULL AND to_regclass('public."Perfil"') IS NOT NULL THEN
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', passport_table);
    EXECUTE format(
      'CREATE POLICY "vivat_passport_select_own" ON public.%I FOR SELECT TO authenticated USING (id_perfil IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid()))',
      passport_table
    );
  END IF;

  IF passport_table IS NOT NULL
     AND to_regclass('public."Perfil"') IS NOT NULL
     AND to_regclass('public."Garante"') IS NOT NULL THEN
    has_guarantor_profile := EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Garante' AND column_name = 'id_perfil'
    );
    has_guarantor_passport := EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Garante' AND column_name = 'id_pasaporte_garante'
    );

    guarantor_predicate := format(
      'id_pasaporte IN (SELECT id_pasaporte FROM public.%I WHERE id_perfil IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid()))',
      passport_table
    );
    guarantor_predicate_with_alias := format(
      'g.id_pasaporte IN (SELECT id_pasaporte FROM public.%I WHERE id_perfil IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid()))',
      passport_table
    );

    IF has_guarantor_passport THEN
      guarantor_predicate := guarantor_predicate || format(
        ' OR id_pasaporte_garante IN (SELECT id_pasaporte FROM public.%I WHERE id_perfil IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid()))',
        passport_table
      );
      guarantor_predicate_with_alias := guarantor_predicate_with_alias || format(
        ' OR g.id_pasaporte_garante IN (SELECT id_pasaporte FROM public.%I WHERE id_perfil IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid()))',
        passport_table
      );
    END IF;
    IF has_guarantor_profile THEN
      guarantor_predicate := guarantor_predicate || ' OR id_perfil IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())';
      guarantor_predicate_with_alias := guarantor_predicate_with_alias || ' OR g.id_perfil IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())';
    END IF;

    GRANT SELECT ON TABLE public."Garante" TO authenticated;
    EXECUTE format(
      'CREATE POLICY "vivat_guarantor_select_participant" ON public."Garante" FOR SELECT TO authenticated USING (%s)',
      guarantor_predicate
    );

    IF to_regclass('public."Documento_garante"') IS NOT NULL THEN
      GRANT SELECT ON TABLE public."Documento_garante" TO authenticated;
      EXECUTE format(
        'CREATE POLICY "vivat_guarantor_document_select_participant" ON public."Documento_garante" FOR SELECT TO authenticated USING (id_garante IN (SELECT g.id_garante FROM public."Garante" g WHERE %s))',
        guarantor_predicate_with_alias
      );
    END IF;
  END IF;

  -- KYC evidence is server-only. RLS stays enabled with no browser policy.

  IF to_regclass('public."Contrato"') IS NOT NULL AND to_regclass('public."Perfil"') IS NOT NULL THEN
    GRANT SELECT ON TABLE public."Contrato" TO authenticated;
    CREATE POLICY "vivat_contract_select_participant"
      ON public."Contrato" FOR SELECT TO authenticated
      USING (
        id_perfil_inquilino IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())
        OR id_perfil_propietario IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())
      );
  END IF;

  IF to_regclass('public."Firma_contrato"') IS NOT NULL
     AND to_regclass('public."Contrato"') IS NOT NULL
     AND to_regclass('public."Perfil"') IS NOT NULL THEN
    GRANT SELECT ON TABLE public."Firma_contrato" TO authenticated;
    CREATE POLICY "vivat_signature_select_contract_participant"
      ON public."Firma_contrato" FOR SELECT TO authenticated
      USING (
        id_contrato IN (
          SELECT c.id_contrato FROM public."Contrato" c
          WHERE c.id_perfil_inquilino IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())
             OR c.id_perfil_propietario IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())
        )
      );
  END IF;

  IF to_regclass('public."Inventario_Digital"') IS NOT NULL
     AND to_regclass('public."Contrato"') IS NOT NULL
     AND to_regclass('public."Perfil"') IS NOT NULL THEN
    GRANT SELECT ON TABLE public."Inventario_Digital" TO authenticated;
    CREATE POLICY "vivat_inventory_select_contract_participant"
      ON public."Inventario_Digital" FOR SELECT TO authenticated
      USING (
        id_contrato IN (
          SELECT c.id_contrato FROM public."Contrato" c
          WHERE c.id_perfil_inquilino IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())
             OR c.id_perfil_propietario IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())
        )
      );
  END IF;

  IF to_regclass('public."Notificacion"') IS NOT NULL AND to_regclass('public."Perfil"') IS NOT NULL THEN
    GRANT SELECT, UPDATE (leida) ON TABLE public."Notificacion" TO authenticated;
    CREATE POLICY "vivat_notification_select_recipient"
      ON public."Notificacion" FOR SELECT TO authenticated
      USING (id_perfil_destino IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid()));
    CREATE POLICY "vivat_notification_mark_read_recipient"
      ON public."Notificacion" FOR UPDATE TO authenticated
      USING (id_perfil_destino IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid()))
      WITH CHECK (id_perfil_destino IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Remove global/legacy Storage policies that permit arbitrary browser access
-- to private evidence, contracts, inventory, biometric vault, or RAG material.
DO $$
DECLARE existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        policyname ILIKE '%allow all%'
        OR policyname ILIKE '%contrato%'
        OR policyname ILIKE '%inventario%'
        OR policyname ILIKE '%biometr%'
        OR policyname ILIKE '%rag%'
        OR coalesce(qual, '') ILIKE '%contratos_firmados%'
        OR coalesce(qual, '') ILIKE '%inventario_digital%'
        OR coalesce(qual, '') ILIKE '%boveda_biometrica%'
        OR coalesce(qual, '') ILIKE '%rag-documents%'
        OR coalesce(with_check, '') ILIKE '%contratos_firmados%'
        OR coalesce(with_check, '') ILIKE '%inventario_digital%'
        OR coalesce(with_check, '') ILIKE '%boveda_biometrica%'
        OR coalesce(with_check, '') ILIKE '%rag-documents%'
        OR coalesce(qual, '') IN ('true', '(true)')
        OR coalesce(with_check, '') IN ('true', '(true)')
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', existing_policy.policyname);
  END LOOP;
END $$;

REVOKE ALL ON storage.objects FROM anon;
REVOKE ALL ON storage.objects FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

DROP POLICY IF EXISTS "vivat_property_media_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "vivat_property_media_update_owner" ON storage.objects;
DROP POLICY IF EXISTS "vivat_property_media_delete_owner" ON storage.objects;
DROP POLICY IF EXISTS "vivat_contract_file_select_participant" ON storage.objects;

CREATE POLICY "vivat_property_media_insert_owner"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'propiedades_multimedia'
    AND (storage.foldername(name))[1] IN (
      SELECT 'prop-' || p.id_publicacion::text
      FROM public."Publicacion" p
      WHERE p.id_perfil IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "vivat_property_media_update_owner"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'propiedades_multimedia'
    AND (storage.foldername(name))[1] IN (
      SELECT 'prop-' || p.id_publicacion::text
      FROM public."Publicacion" p
      WHERE p.id_perfil IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    bucket_id = 'propiedades_multimedia'
    AND (storage.foldername(name))[1] IN (
      SELECT 'prop-' || p.id_publicacion::text
      FROM public."Publicacion" p
      WHERE p.id_perfil IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "vivat_property_media_delete_owner"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'propiedades_multimedia'
    AND (storage.foldername(name))[1] IN (
      SELECT 'prop-' || p.id_publicacion::text
      FROM public."Publicacion" p
      WHERE p.id_perfil IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "vivat_contract_file_select_participant"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contratos_firmados'
    AND (storage.foldername(name))[1] IN (
      SELECT 'contrato_' || c.id_contrato::text
      FROM public."Contrato" c
      WHERE c.id_perfil_inquilino IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())
         OR c.id_perfil_propietario IN (SELECT id_perfil FROM public."Perfil" WHERE user_id = auth.uid())
    )
  );

-- Only existing buckets are updated; no bucket rows are created or deleted.
UPDATE storage.buckets
SET public = false,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
WHERE id = 'contratos_firmados';

UPDATE storage.buckets
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'propiedades_multimedia';

UPDATE storage.buckets
SET public = false
WHERE id IN ('boveda_biometrica', 'inventario_digital', 'rag-documents');

COMMIT;
