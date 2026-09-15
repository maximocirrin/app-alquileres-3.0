BEGIN;
ALTER TABLE public."Contrato" ADD COLUMN IF NOT EXISTS garantes_fijados_at timestamptz;
CREATE TABLE public."Contrato_Garante" (
  id_contrato bigint NOT NULL REFERENCES public."Contrato"(id_contrato),
  id_garante bigint NOT NULL REFERENCES public."Garante"(id_garante),
  id_perfil bigint REFERENCES public."Perfil"(id_perfil),
  email text NOT NULL,
  datos jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_contrato, id_garante)
);
CREATE INDEX contrato_garante_profile_idx ON public."Contrato_Garante"(id_perfil, id_contrato);
CREATE INDEX contrato_garante_email_idx ON public."Contrato_Garante"(email, id_contrato);
CREATE INDEX contrato_garante_source_idx ON public."Contrato_Garante"(id_garante);
ALTER TABLE public."Contrato_Garante" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."Contrato_Garante" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public."Contrato_Garante" TO service_role;

-- Freeze the contractual participants once, using only the tenant's guarantees.
-- Only the authenticated backend calls this function, after authorization.
CREATE OR REPLACE FUNCTION public.freeze_contract_guarantors(p_contract_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE c public."Contrato"%ROWTYPE;
BEGIN
  SELECT * INTO STRICT c FROM public."Contrato" WHERE id_contrato = p_contract_id FOR UPDATE;
  IF c.garantes_fijados_at IS NOT NULL THEN RETURN; END IF;
  IF c.hash_original_sha256 IS NOT NULL OR EXISTS (
    SELECT 1 FROM public."Firma_contrato" WHERE id_contrato = p_contract_id
      AND estado_firma IN ('sellada','completada')) THEN
    RAISE EXCEPTION 'El contrato tiene evidencia anterior. Debe revisarse su version antes de iniciar nuevas firmas.' USING ERRCODE='P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."Historial_Estado_Contrato" WHERE id_contrato=p_contract_id
    AND id_estado_contrato=5 AND fecha_fin IS NULL) THEN
    RAISE EXCEPTION 'El contrato no esta pendiente de firma.' USING ERRCODE='P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public."Garante" g JOIN public."Pasaporte_habitat" p USING(id_pasaporte)
    WHERE p.id_perfil=c.id_perfil_inquilino AND (coalesce(trim(g.email),'')='' OR coalesce(trim(g.dni),'')='' OR coalesce(trim(g.nombre_completo),'')='')) THEN
    RAISE EXCEPTION 'Completa nombre, DNI y email de todos los garantes antes de firmar.' USING ERRCODE='P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public."Garante" g JOIN public."Pasaporte_habitat" p USING(id_pasaporte)
    WHERE p.id_perfil=c.id_perfil_inquilino AND (
      g.id_perfil IN (c.id_perfil_inquilino,c.id_perfil_propietario) OR EXISTS (
        SELECT 1 FROM public."Perfil" party WHERE party.id_perfil IN (c.id_perfil_inquilino,c.id_perfil_propietario)
          AND regexp_replace(upper(g.dni),'[.[:space:]-]','','g')=regexp_replace(upper(party.dni),'[.[:space:]-]','','g')))) OR
    EXISTS (SELECT 1 FROM public."Garante" g JOIN public."Pasaporte_habitat" p USING(id_pasaporte)
      WHERE p.id_perfil=c.id_perfil_inquilino GROUP BY regexp_replace(upper(g.dni),'[.[:space:]-]','','g') HAVING count(*)>1) OR
    EXISTS (SELECT 1 FROM public."Garante" g JOIN public."Pasaporte_habitat" p USING(id_pasaporte)
      WHERE p.id_perfil=c.id_perfil_inquilino GROUP BY lower(trim(g.email)) HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Cada garante debe ser una persona y cuenta distinta de las partes y de los otros garantes.' USING ERRCODE='P0001';
  END IF;
  INSERT INTO public."Contrato_Garante" (id_contrato,id_garante,id_perfil,email,datos)
    SELECT p_contract_id,g.id_garante,g.id_perfil,lower(trim(g.email)),
      jsonb_build_object('id_garante',g.id_garante,'nombre_completo',g.nombre_completo,'dni',g.dni,
        'cuit',g.cuit,'email',g.email,'relacion_inquilino',g.relacion_inquilino,'id_tipo_garantia',g.id_tipo_garantia)
    FROM public."Garante" g JOIN public."Pasaporte_habitat" p USING(id_pasaporte)
    WHERE p.id_perfil=c.id_perfil_inquilino;
  UPDATE public."Contrato" SET garantes_fijados_at=now() WHERE id_contrato=p_contract_id;
END $$;
REVOKE ALL ON FUNCTION public.freeze_contract_guarantors(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.freeze_contract_guarantors(bigint) TO service_role;

CREATE OR REPLACE FUNCTION private.protect_contract_guarantor_snapshot()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF (to_jsonb(NEW)-'id_perfil') IS DISTINCT FROM (to_jsonb(OLD)-'id_perfil')
    OR (OLD.id_perfil IS NOT NULL AND NEW.id_perfil IS DISTINCT FROM OLD.id_perfil) THEN
    RAISE EXCEPTION 'Contract guarantor evidence is immutable.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER contract_guarantor_snapshot_immutable BEFORE UPDATE ON public."Contrato_Garante"
FOR EACH ROW EXECUTE FUNCTION private.protect_contract_guarantor_snapshot();

CREATE OR REPLACE FUNCTION private.protect_sealed_signature()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF OLD.estado_firma IN ('sellada','completada') THEN
    IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['hash_contrato_sha256','url_contrato_final_pdf'])
      IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['hash_contrato_sha256','url_contrato_final_pdf']) THEN
      RAISE EXCEPTION 'Sealed signature evidence is immutable.';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sealed_signature_immutable BEFORE UPDATE OR DELETE ON public."Firma_contrato"
FOR EACH ROW EXECUTE FUNCTION private.protect_sealed_signature();

CREATE OR REPLACE FUNCTION public.finalize_signed_contract_state(p_contract_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE c public."Contrato"%ROWTYPE; h public."Historial_Estado_Contrato"%ROWTYPE;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(p_contract_id);
  SELECT * INTO STRICT c FROM public."Contrato" WHERE id_contrato=p_contract_id FOR UPDATE;
  SELECT * INTO h FROM public."Historial_Estado_Contrato" WHERE id_contrato=p_contract_id
    AND fecha_fin IS NULL ORDER BY fecha_inicio DESC,id_historial_contrato DESC LIMIT 1 FOR UPDATE;
  IF h.id_estado_contrato=1 AND c.hash_final_sha256 IS NOT NULL THEN RETURN true; END IF;
  IF h.id_estado_contrato IS DISTINCT FROM 5 OR c.garantes_fijados_at IS NULL OR c.hash_final_sha256 IS NULL THEN
    RAISE EXCEPTION 'Contract is not ready for activation.' USING ERRCODE='P0001';
  END IF;
  IF c.id_perfil_inquilino=c.id_perfil_propietario OR
    NOT EXISTS (SELECT 1 FROM public."Firma_contrato" s WHERE s.id_contrato=p_contract_id
      AND s.id_perfil_firmante=c.id_perfil_inquilino AND s.rol_firmante='inquilino' AND s.estado_firma='sellada'
      AND s.didit_status='APPROVED' AND s.hash_original_sha256=c.hash_original_sha256) OR
    NOT EXISTS (SELECT 1 FROM public."Firma_contrato" s WHERE s.id_contrato=p_contract_id
      AND s.id_perfil_firmante=c.id_perfil_propietario AND s.rol_firmante='propietario' AND s.estado_firma='sellada'
      AND s.didit_status='APPROVED' AND s.hash_original_sha256=c.hash_original_sha256) OR
    EXISTS (SELECT 1 FROM public."Contrato_Garante" g WHERE g.id_contrato=p_contract_id AND NOT EXISTS (
      SELECT 1 FROM public."Firma_contrato" s WHERE s.id_contrato=p_contract_id
        AND s.id_perfil_firmante=g.id_perfil AND s.rol_firmante='garante' AND s.estado_firma='sellada'
        AND s.didit_status='APPROVED' AND s.hash_original_sha256=c.hash_original_sha256)) THEN
    RAISE EXCEPTION 'Required signatures are missing or belong to another document.' USING ERRCODE='P0001';
  END IF;
  UPDATE public."Historial_Estado_Contrato" SET fecha_fin=now() WHERE id_historial_contrato=h.id_historial_contrato;
  INSERT INTO public."Historial_Estado_Contrato"(id_contrato,id_estado_contrato,fecha_inicio) VALUES(p_contract_id,1,now());
  UPDATE public."Contrato" SET fecha_firma_contrato=current_date WHERE id_contrato=p_contract_id;
  UPDATE public."Inventario_Digital" SET firmado_inquilino=true,firmado_propietario=true WHERE id_contrato=p_contract_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.finalize_signed_contract_state(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_signed_contract_state(bigint) TO service_role;
COMMIT;
