-- Emergency containment for confirmed anonymous data exposure.
-- This migration is intentionally fail-closed: tables not explicitly opened
-- below remain unavailable to browser roles.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.current_profile_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id_perfil
  FROM public."Perfil" AS p
  WHERE p.user_id = (SELECT auth.uid())
    AND p.fecha_baja IS NULL
  ORDER BY p.id_perfil
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.is_public_publication(publication_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Publicacion" AS p
    JOIN public."Historial_Estado_Publicacion" AS h
      ON h.id_publicacion = p.id_publicacion
    WHERE p.id_publicacion = publication_id
      AND h.fecha_fin IS NULL
      AND h.id_estado_publicacion = 1
  )
$$;

CREATE OR REPLACE FUNCTION private.owns_publication(publication_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Publicacion" AS p
    WHERE p.id_publicacion = publication_id
      AND p.id_perfil = private.current_profile_id()
  )
$$;

CREATE OR REPLACE FUNCTION private.owns_property(property_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Propiedad" AS p
    WHERE p.id_propiedad = property_id
      AND p.id_perfil_propietario = private.current_profile_id()
  )
$$;

CREATE OR REPLACE FUNCTION private.is_public_property(property_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Publicacion" AS p
    WHERE p.id_propiedad = property_id
      AND private.is_public_publication(p.id_publicacion)
  )
$$;

CREATE OR REPLACE FUNCTION private.can_access_property(property_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_public_property(property_id)
    OR private.owns_property(property_id)
    OR EXISTS (
      SELECT 1 FROM public."Contrato" AS c
      WHERE c.id_propiedad = property_id
        AND private.current_profile_id() IN (c.id_perfil_inquilino, c.id_perfil_propietario)
    )
$$;

CREATE OR REPLACE FUNCTION private.is_contract_participant(contract_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Contrato" AS c
    WHERE c.id_contrato = contract_id
      AND private.current_profile_id() IN (c.id_perfil_inquilino, c.id_perfil_propietario)
  )
$$;

CREATE OR REPLACE FUNCTION private.owns_contract(contract_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Contrato" AS c
    WHERE c.id_contrato = contract_id
      AND c.id_perfil_propietario = private.current_profile_id()
  )
$$;

CREATE OR REPLACE FUNCTION private.can_create_contract(
  property_id bigint,
  publication_id bigint,
  tenant_profile_id bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Publicacion" AS publication
    JOIN public."Solicitud" AS application
      ON application.id_publicacion = publication.id_publicacion
    WHERE publication.id_publicacion = publication_id
      AND publication.id_propiedad = property_id
      AND publication.id_perfil = private.current_profile_id()
      AND application.id_perfil = tenant_profile_id
  )
$$;

CREATE OR REPLACE FUNCTION private.can_edit_contract(contract_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.owns_contract(contract_id)
    AND NOT EXISTS (
      SELECT 1 FROM public."Firma_contrato" AS signature
      WHERE signature.id_contrato = contract_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public."Historial_Estado_Contrato" AS history
      WHERE history.id_contrato = contract_id
        AND history.fecha_fin IS NULL
        AND history.id_estado_contrato <> 5
    )
$$;

CREATE OR REPLACE FUNCTION private.contract_has_history(contract_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Historial_Estado_Contrato" AS history
    WHERE history.id_contrato = contract_id
  )
$$;

CREATE OR REPLACE FUNCTION private.owns_passport(passport_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."Pasaporte_habitat" AS p
    WHERE p.id_pasaporte = passport_id
      AND p.id_perfil = private.current_profile_id()
  )
$$;

CREATE OR REPLACE FUNCTION private.can_access_guarantor(guarantor_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Garante" AS g
    WHERE g.id_garante = guarantor_id
      AND (
        private.owns_passport(g.id_pasaporte)
        OR private.owns_passport(g.id_pasaporte_garante)
        OR g.id_perfil = private.current_profile_id()
      )
  )
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_public_publication(bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.owns_publication(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION private.owns_property(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_public_property(bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_property(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_contract_participant(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION private.owns_contract(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_create_contract(bigint, bigint, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_edit_contract(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION private.contract_has_history(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION private.owns_passport(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_guarantor(bigint) TO authenticated;

-- Remove all anonymous privileges, including future sequence access.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- Browser users never need table ownership, DDL-like privileges or direct
-- access to authoritative server-maintained records.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON TABLE public."Perfil", public."Pasaporte_habitat", public."Garante",
  public."Documento_garante", public."Verificacion_kyc", public."Pago_pasaporte",
  public.employment_records, public.legal_records, public.atm_records,
  public."Mensaje_Contrato", public."Contrato", public."Firma_contrato",
  public."Inventario_Digital", public."Detalle_Inventario_Item",
  public."Foto_Item_Inventario", public."Pago", public."Historial_pago",
  public."Historial_Estado_Contrato", public."Solicitud", public."Notificacion"
FROM authenticated;

-- Eliminate legacy unconditional policies everywhere, then fully reset the
-- policies on data-bearing tables addressed by this migration.
DO $$
DECLARE policy_row record;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        policyname ILIKE '%allow all%'
        OR coalesce(qual, '') IN ('true', '(true)')
        OR coalesce(with_check, '') IN ('true', '(true)')
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;

  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'Perfil','Pasaporte_habitat','Garante','Documento_garante','Verificacion_kyc',
        'Pago_pasaporte','employment_records','legal_records','atm_records',
        'Mensaje_Contrato','Contrato','Firma_contrato','Inventario_Digital',
        'Detalle_Inventario_Item','Foto_Item_Inventario','Pago','Historial_pago',
        'Historial_Estado_Contrato','Solicitud','Notificacion','Favorito',
        'Registro_visualizacion','Publicacion','Propiedad','Multimedia',
        'Propiedad_caracteristica','Politica_Mascota','Limite_mascota',
        'Historial_Precio','Historial_Estado_Publicacion'
      ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;
END $$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Perfil','Pasaporte_habitat','Garante','Documento_garante','Verificacion_kyc',
    'Pago_pasaporte','employment_records','legal_records','atm_records',
    'Mensaje_Contrato','Contrato','Firma_contrato','Inventario_Digital',
    'Detalle_Inventario_Item','Foto_Item_Inventario','Pago','Historial_pago',
    'Historial_Estado_Contrato','Solicitud','Notificacion','Favorito',
    'Registro_visualizacion','Publicacion','Propiedad','Multimedia',
    'Propiedad_caracteristica','Politica_Mascota','Limite_mascota',
    'Historial_Precio','Historial_Estado_Publicacion'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

-- Read-only public catalogs. No browser role receives write grants.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Amoblado','Antiguedad','Barrio','Caracteristica','Categoria_Caracteristica',
    'Categoria_item','Departamento','Estado_Publicacion','Estado_contrato',
    'Estado_evento','Estado_garante','Estado_item','Estado_pago','Estado_pasaporte',
    'Estado_propiedad','Estado_solicitud','Estado_sotano','Estado_ticket',
    'Estilo_arquitectonico','Indice_Actualizacion','Item','Metodo_pago','Moneda',
    'Provincia','Subtipo_propiedad','Tipo_evento','Tipo_garantia','Tipo_inventario',
    'Tipo_mascota','Tipo_multimedia','Tipo_operacion','Tipo_perfil','Tipo_propiedad',
    'Tipo_servicio_medidor','Unidad_medida','Valor_Indice_Mensual'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS vivat_public_catalog_read ON public.%I', table_name);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated', table_name);
    EXECUTE format('CREATE POLICY vivat_public_catalog_read ON public.%I FOR SELECT TO anon, authenticated USING (true)', table_name);
  END LOOP;
END $$;

-- This compatibility object is a security-invoker view over
-- Subtipo_propiedad, so its underlying RLS policy remains authoritative.
ALTER VIEW public.subtipos SET (security_invoker = true);
GRANT SELECT ON public.subtipos TO anon, authenticated;

-- Public marketplace: only currently available publications and their related
-- rows are visible anonymously. Owners retain CRUD on their own records.
GRANT SELECT ON public."Publicacion", public."Propiedad", public."Multimedia",
  public."Propiedad_caracteristica", public."Politica_Mascota", public."Limite_mascota",
  public."Historial_Precio", public."Historial_Estado_Publicacion" TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public."Publicacion", public."Propiedad", public."Multimedia",
  public."Propiedad_caracteristica", public."Politica_Mascota", public."Limite_mascota" TO authenticated;
GRANT INSERT ON public."Historial_Precio", public."Historial_Estado_Publicacion" TO authenticated;
GRANT UPDATE (fecha_fin) ON public."Historial_Estado_Publicacion" TO authenticated;
GRANT INSERT ON public."Caracteristica" TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

CREATE POLICY vivat_publication_read_public ON public."Publicacion" FOR SELECT TO anon
  USING (private.is_public_publication(id_publicacion));
CREATE POLICY vivat_publication_read_authenticated ON public."Publicacion" FOR SELECT TO authenticated
  USING (private.is_public_publication(id_publicacion) OR id_perfil = private.current_profile_id());
CREATE POLICY vivat_publication_insert_owner ON public."Publicacion" FOR INSERT TO authenticated
  WITH CHECK (id_perfil = private.current_profile_id() AND private.owns_property(id_propiedad));
CREATE POLICY vivat_publication_update_owner ON public."Publicacion" FOR UPDATE TO authenticated
  USING (id_perfil = private.current_profile_id())
  WITH CHECK (id_perfil = private.current_profile_id() AND private.owns_property(id_propiedad));
CREATE POLICY vivat_publication_delete_owner ON public."Publicacion" FOR DELETE TO authenticated
  USING (id_perfil = private.current_profile_id());

CREATE POLICY vivat_property_read_public ON public."Propiedad" FOR SELECT TO anon
  USING (private.is_public_property(id_propiedad));
CREATE POLICY vivat_property_read_authenticated ON public."Propiedad" FOR SELECT TO authenticated
  USING (private.can_access_property(id_propiedad));
CREATE POLICY vivat_property_insert_owner ON public."Propiedad" FOR INSERT TO authenticated
  WITH CHECK (id_perfil_propietario = private.current_profile_id());
CREATE POLICY vivat_property_update_owner ON public."Propiedad" FOR UPDATE TO authenticated
  USING (id_perfil_propietario = private.current_profile_id())
  WITH CHECK (id_perfil_propietario = private.current_profile_id());
CREATE POLICY vivat_property_delete_owner ON public."Propiedad" FOR DELETE TO authenticated
  USING (id_perfil_propietario = private.current_profile_id());

CREATE POLICY vivat_media_read_public ON public."Multimedia" FOR SELECT TO anon
  USING (private.is_public_publication(id_publicacion));
CREATE POLICY vivat_media_read_authenticated ON public."Multimedia" FOR SELECT TO authenticated
  USING (private.is_public_publication(id_publicacion) OR private.owns_publication(id_publicacion));
CREATE POLICY vivat_media_write_owner ON public."Multimedia" FOR ALL TO authenticated
  USING (private.owns_publication(id_publicacion)) WITH CHECK (private.owns_publication(id_publicacion));

CREATE POLICY vivat_property_feature_read_public ON public."Propiedad_caracteristica" FOR SELECT TO anon
  USING (private.is_public_property(id_propiedad));
CREATE POLICY vivat_property_feature_read_authenticated ON public."Propiedad_caracteristica" FOR SELECT TO authenticated
  USING (private.is_public_property(id_propiedad) OR private.owns_property(id_propiedad));
CREATE POLICY vivat_property_feature_write_owner ON public."Propiedad_caracteristica" FOR ALL TO authenticated
  USING (private.owns_property(id_propiedad)) WITH CHECK (private.owns_property(id_propiedad));

CREATE POLICY vivat_pet_policy_read_public ON public."Politica_Mascota" FOR SELECT TO anon
  USING (private.is_public_publication(id_publicacion));
CREATE POLICY vivat_pet_policy_read_authenticated ON public."Politica_Mascota" FOR SELECT TO authenticated
  USING (private.is_public_publication(id_publicacion) OR private.owns_publication(id_publicacion));
CREATE POLICY vivat_pet_policy_write_owner ON public."Politica_Mascota" FOR ALL TO authenticated
  USING (private.owns_publication(id_publicacion)) WITH CHECK (private.owns_publication(id_publicacion));

CREATE POLICY vivat_pet_limit_read_public ON public."Limite_mascota" FOR SELECT TO anon
  USING (private.is_public_publication(id_publicacion));
CREATE POLICY vivat_pet_limit_read_authenticated ON public."Limite_mascota" FOR SELECT TO authenticated
  USING (private.is_public_publication(id_publicacion) OR private.owns_publication(id_publicacion));
CREATE POLICY vivat_pet_limit_write_owner ON public."Limite_mascota" FOR ALL TO authenticated
  USING (private.owns_publication(id_publicacion)) WITH CHECK (private.owns_publication(id_publicacion));

CREATE POLICY vivat_price_history_read_public ON public."Historial_Precio" FOR SELECT TO anon
  USING (private.is_public_publication(id_publicacion));
CREATE POLICY vivat_price_history_read_authenticated ON public."Historial_Precio" FOR SELECT TO authenticated
  USING (private.is_public_publication(id_publicacion) OR private.owns_publication(id_publicacion));
CREATE POLICY vivat_price_history_insert_owner ON public."Historial_Precio" FOR INSERT TO authenticated
  WITH CHECK (private.owns_publication(id_publicacion));

CREATE POLICY vivat_publication_history_read_public ON public."Historial_Estado_Publicacion" FOR SELECT TO anon
  USING (private.is_public_publication(id_publicacion));
CREATE POLICY vivat_publication_history_read_authenticated ON public."Historial_Estado_Publicacion" FOR SELECT TO authenticated
  USING (private.is_public_publication(id_publicacion) OR private.owns_publication(id_publicacion));
CREATE POLICY vivat_publication_history_insert_owner ON public."Historial_Estado_Publicacion" FOR INSERT TO authenticated
  WITH CHECK (private.owns_publication(id_publicacion) AND id_estado_publicacion IN (1, 4, 5, 6));
CREATE POLICY vivat_publication_history_close_owner ON public."Historial_Estado_Publicacion" FOR UPDATE TO authenticated
  USING (private.owns_publication(id_publicacion)) WITH CHECK (private.owns_publication(id_publicacion));

DROP POLICY IF EXISTS vivat_characteristic_insert_authenticated ON public."Caracteristica";
CREATE POLICY vivat_characteristic_insert_authenticated ON public."Caracteristica" FOR INSERT TO authenticated
  WITH CHECK (length(btrim(nombre)) BETWEEN 1 AND 100);

-- Personal and authoritative data.
GRANT SELECT ON public."Perfil" TO authenticated;
GRANT UPDATE (nombre_completo, nombre_usuario, telefono, fecha_nacimiento, estado_civil,
  cbu_alias, domicilio_real, domicilio_electronico) ON public."Perfil" TO authenticated;
CREATE POLICY vivat_profile_select_own ON public."Perfil" FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY vivat_profile_update_own ON public."Perfil" FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT ON public."Pasaporte_habitat" TO authenticated;
CREATE POLICY vivat_passport_select_own ON public."Pasaporte_habitat" FOR SELECT TO authenticated
  USING (id_perfil = private.current_profile_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."Garante" TO authenticated;
CREATE POLICY vivat_guarantor_select_participant ON public."Garante" FOR SELECT TO authenticated
  USING (private.can_access_guarantor(id_garante));
CREATE POLICY vivat_guarantor_insert_owner ON public."Garante" FOR INSERT TO authenticated
  WITH CHECK (private.owns_passport(id_pasaporte));
CREATE POLICY vivat_guarantor_update_owner ON public."Garante" FOR UPDATE TO authenticated
  USING (private.owns_passport(id_pasaporte)) WITH CHECK (private.owns_passport(id_pasaporte));
CREATE POLICY vivat_guarantor_delete_owner ON public."Garante" FOR DELETE TO authenticated
  USING (private.owns_passport(id_pasaporte));

GRANT SELECT ON public."Documento_garante" TO authenticated;
CREATE POLICY vivat_guarantor_document_select_participant ON public."Documento_garante" FOR SELECT TO authenticated
  USING (private.can_access_guarantor(id_garante));

GRANT SELECT ON public.employment_records, public.legal_records, public.atm_records TO authenticated;
CREATE POLICY vivat_employment_select_own ON public.employment_records FOR SELECT TO authenticated
  USING (participant_id = private.current_profile_id());
CREATE POLICY vivat_legal_select_own ON public.legal_records FOR SELECT TO authenticated
  USING (participant_id = private.current_profile_id());
CREATE POLICY vivat_atm_select_own ON public.atm_records FOR SELECT TO authenticated
  USING (participant_id = private.current_profile_id());

GRANT SELECT ON public."Pago_pasaporte" TO authenticated;
CREATE POLICY vivat_passport_payment_select_own ON public."Pago_pasaporte" FOR SELECT TO authenticated
  USING (private.owns_passport(id_pasaporte));

-- Contract evidence is readable by participants and writable only by backend
-- service-role endpoints.
GRANT SELECT ON public."Contrato", public."Firma_contrato", public."Inventario_Digital",
  public."Detalle_Inventario_Item", public."Foto_Item_Inventario", public."Pago",
  public."Historial_pago", public."Historial_Estado_Contrato" TO authenticated;
GRANT UPDATE (interes_perdonado) ON public."Pago" TO authenticated;
GRANT INSERT (id_perfil_propietario, id_perfil_inquilino, id_propiedad, id_publicacion,
  id_tipo_garantia, "id_Indice", id_moneda, fecha_firma_contrato,
  fecha_inicio_contrato, fecha_fin_contrato, monto_cierre, descuentos_aplicados,
  porcentaje_aumento, periodo_aumento_meses, dia_vencimiento_mensual,
  monto_deposito, deposito_devuelto, tasa_punitoria_diaria, alias_cbu,
  porcentaje_honorarios_cierre, porcentaje_comision_mensual, clausulas_adicionales)
ON public."Contrato" TO authenticated;
GRANT UPDATE (id_tipo_garantia, "id_Indice", id_moneda, fecha_inicio_contrato,
  fecha_fin_contrato, monto_cierre, descuentos_aplicados, porcentaje_aumento,
  periodo_aumento_meses, dia_vencimiento_mensual, monto_deposito,
  deposito_devuelto, tasa_punitoria_diaria, alias_cbu,
  porcentaje_honorarios_cierre, porcentaje_comision_mensual, clausulas_adicionales)
ON public."Contrato" TO authenticated;
GRANT INSERT (id_contrato, id_estado_contrato, fecha_inicio)
ON public."Historial_Estado_Contrato" TO authenticated;
CREATE POLICY vivat_contract_select_participant ON public."Contrato" FOR SELECT TO authenticated
  USING (private.is_contract_participant(id_contrato));
CREATE POLICY vivat_contract_insert_owner ON public."Contrato" FOR INSERT TO authenticated
  WITH CHECK (
    id_perfil_propietario = private.current_profile_id()
    AND private.can_create_contract(id_propiedad, id_publicacion, id_perfil_inquilino)
  );
CREATE POLICY vivat_contract_update_unsigned_owner ON public."Contrato" FOR UPDATE TO authenticated
  USING (private.can_edit_contract(id_contrato))
  WITH CHECK (id_perfil_propietario = private.current_profile_id() AND private.can_edit_contract(id_contrato));
CREATE POLICY vivat_signature_select_participant ON public."Firma_contrato" FOR SELECT TO authenticated
  USING (private.is_contract_participant(id_contrato));
CREATE POLICY vivat_inventory_select_participant ON public."Inventario_Digital" FOR SELECT TO authenticated
  USING (private.is_contract_participant(id_contrato));
CREATE POLICY vivat_inventory_item_select_participant ON public."Detalle_Inventario_Item" FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public."Inventario_Digital" i
    WHERE i.id_inventario = public."Detalle_Inventario_Item".id_inventario
      AND private.is_contract_participant(i.id_contrato)
  ));
CREATE POLICY vivat_inventory_photo_select_participant ON public."Foto_Item_Inventario" FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public."Detalle_Inventario_Item" d
    JOIN public."Inventario_Digital" i ON i.id_inventario = d.id_inventario
    WHERE d.id_detalle_item = public."Foto_Item_Inventario".id_detalle_item
      AND private.is_contract_participant(i.id_contrato)
  ));
CREATE POLICY vivat_payment_select_participant ON public."Pago" FOR SELECT TO authenticated
  USING (private.is_contract_participant(id_contrato));
CREATE POLICY vivat_payment_waive_interest_owner ON public."Pago" FOR UPDATE TO authenticated
  USING (private.owns_contract(id_contrato))
  WITH CHECK (private.owns_contract(id_contrato));
CREATE POLICY vivat_payment_history_select_participant ON public."Historial_pago" FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public."Pago" p
    WHERE p.id_pago = public."Historial_pago".id_pago
      AND private.is_contract_participant(p.id_contrato)
  ));
CREATE POLICY vivat_contract_history_select_participant ON public."Historial_Estado_Contrato" FOR SELECT TO authenticated
  USING (private.is_contract_participant(id_contrato));
CREATE POLICY vivat_contract_history_initialize_owner ON public."Historial_Estado_Contrato" FOR INSERT TO authenticated
  WITH CHECK (
    id_estado_contrato = 5
    AND private.owns_contract(id_contrato)
    AND NOT private.contract_has_history(id_contrato)
  );

-- Applications and favorites are bound to the authenticated profile.
GRANT SELECT, INSERT, DELETE ON public."Favorito" TO authenticated;
CREATE POLICY vivat_favorite_own ON public."Favorito" FOR ALL TO authenticated
  USING (id_perfil = private.current_profile_id()) WITH CHECK (id_perfil = private.current_profile_id());

GRANT SELECT, INSERT ON public."Registro_visualizacion" TO authenticated;
CREATE POLICY vivat_view_read_own ON public."Registro_visualizacion" FOR SELECT TO authenticated
  USING (id_perfil = private.current_profile_id());
CREATE POLICY vivat_view_insert_own ON public."Registro_visualizacion" FOR INSERT TO authenticated
  WITH CHECK (id_perfil = private.current_profile_id() AND private.is_public_publication(id_publicacion));

GRANT SELECT, INSERT ON public."Solicitud" TO authenticated;
CREATE POLICY vivat_application_select_participant ON public."Solicitud" FOR SELECT TO authenticated
  USING (id_perfil = private.current_profile_id() OR private.owns_publication(id_publicacion));
CREATE POLICY vivat_application_insert_own ON public."Solicitud" FOR INSERT TO authenticated
  WITH CHECK (id_perfil = private.current_profile_id() AND private.is_public_publication(id_publicacion));

GRANT SELECT, UPDATE (leida) ON public."Notificacion" TO authenticated;
CREATE POLICY vivat_notification_select_recipient ON public."Notificacion" FOR SELECT TO authenticated
  USING (id_perfil_destino = private.current_profile_id());
CREATE POLICY vivat_notification_mark_read ON public."Notificacion" FOR UPDATE TO authenticated
  USING (id_perfil_destino = private.current_profile_id())
  WITH CHECK (id_perfil_destino = private.current_profile_id());

-- Chat sender identity is server-derived even for direct PostgREST inserts.
CREATE OR REPLACE FUNCTION private.enforce_contract_message_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_row public."Perfil"%ROWTYPE;
  contract_row public."Contrato"%ROWTYPE;
BEGIN
  IF (SELECT auth.role()) = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO profile_row FROM public."Perfil" WHERE user_id = (SELECT auth.uid()) LIMIT 1;
  SELECT * INTO contract_row FROM public."Contrato" WHERE id_contrato = NEW.id_contrato;
  IF profile_row.id_perfil IS NULL OR contract_row.id_contrato IS NULL
     OR profile_row.id_perfil NOT IN (contract_row.id_perfil_inquilino, contract_row.id_perfil_propietario) THEN
    RAISE EXCEPTION 'contract message sender is not a participant' USING ERRCODE = '42501';
  END IF;

  NEW.id_perfil := profile_row.id_perfil;
  NEW.remitente_nombre := profile_row.nombre_completo;
  NEW.remitente_email := profile_row.mail;
  NEW.remitente_rol := CASE
    WHEN profile_row.id_perfil = contract_row.id_perfil_propietario THEN 'OWNER'
    ELSE 'TENANT'
  END;
  NEW.created_at := now();
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION private.enforce_contract_message_identity() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS vivat_contract_message_identity ON public."Mensaje_Contrato";
CREATE TRIGGER vivat_contract_message_identity
BEFORE INSERT OR UPDATE ON public."Mensaje_Contrato"
FOR EACH ROW EXECUTE FUNCTION private.enforce_contract_message_identity();

GRANT SELECT, INSERT ON public."Mensaje_Contrato" TO authenticated;
CREATE POLICY vivat_contract_message_select ON public."Mensaje_Contrato" FOR SELECT TO authenticated
  USING (private.is_contract_participant(id_contrato));
CREATE POLICY vivat_contract_message_insert ON public."Mensaje_Contrato" FOR INSERT TO authenticated
  WITH CHECK (private.is_contract_participant(id_contrato) AND id_perfil = private.current_profile_id());

-- Storage must enforce policies; signed URLs are meaningful only for private buckets.
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

UPDATE storage.buckets SET public = false
WHERE id IN ('boveda_biometrica', 'inventario_digital', 'rag-documents', 'fotos_de_perfil');

REVOKE ALL ON storage.objects FROM anon;
REVOKE ALL ON storage.objects FROM authenticated;
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

DO $$
DECLARE policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_row.policyname);
  END LOOP;
END $$;

CREATE POLICY vivat_property_media_read_public ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'propiedades_multimedia');
CREATE POLICY vivat_property_media_insert_owner ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'propiedades_multimedia' AND (storage.foldername(name))[1] IN (
    SELECT 'prop-' || p.id_publicacion::text FROM public."Publicacion" p
    WHERE p.id_perfil = private.current_profile_id()
  ));
CREATE POLICY vivat_property_media_update_owner ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'propiedades_multimedia' AND (storage.foldername(name))[1] IN (
    SELECT 'prop-' || p.id_publicacion::text FROM public."Publicacion" p
    WHERE p.id_perfil = private.current_profile_id()
  )) WITH CHECK (bucket_id = 'propiedades_multimedia' AND (storage.foldername(name))[1] IN (
    SELECT 'prop-' || p.id_publicacion::text FROM public."Publicacion" p
    WHERE p.id_perfil = private.current_profile_id()
  ));
CREATE POLICY vivat_property_media_delete_owner ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'propiedades_multimedia' AND (storage.foldername(name))[1] IN (
    SELECT 'prop-' || p.id_publicacion::text FROM public."Publicacion" p
    WHERE p.id_perfil = private.current_profile_id()
  ));
CREATE POLICY vivat_contract_file_select_participant ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contratos_firmados' AND (storage.foldername(name))[1] IN (
    SELECT 'contrato_' || c.id_contrato::text FROM public."Contrato" c
    WHERE private.is_contract_participant(c.id_contrato)
  ));

COMMIT;
