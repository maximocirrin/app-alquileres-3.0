BEGIN;

-- Complete the database portion of contract finalization under one advisory
-- lock. Only the backend service role may call this RPC.
CREATE OR REPLACE FUNCTION public.finalize_signed_contract_state(p_contract_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_state public."Historial_Estado_Contrato"%ROWTYPE;
  sealed_roles integer;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(p_contract_id);

  SELECT *
    INTO current_state
    FROM public."Historial_Estado_Contrato"
   WHERE id_contrato = p_contract_id
   ORDER BY fecha_inicio DESC, id_historial_contrato DESC
   LIMIT 1
   FOR UPDATE;

  IF current_state.id_historial_contrato IS NULL THEN
    RAISE EXCEPTION 'Contract has no state history.' USING ERRCODE = 'P0001';
  END IF;

  IF current_state.id_estado_contrato = 1 AND current_state.fecha_fin IS NULL THEN
    RETURN false;
  END IF;

  IF current_state.id_estado_contrato <> 5 OR current_state.fecha_fin IS NOT NULL THEN
    RAISE EXCEPTION 'Contract is not awaiting signatures.' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(DISTINCT lower(rol_firmante))
    INTO sealed_roles
    FROM public."Firma_contrato"
   WHERE id_contrato = p_contract_id
     AND estado_firma = 'sellada'
     AND upper(coalesce(didit_status, '')) IN ('APPROVED', 'SUCCESS', 'PASSED')
     AND lower(rol_firmante) IN ('inquilino', 'propietario');

  IF sealed_roles <> 2 THEN
    RAISE EXCEPTION 'Required signatures are not sealed.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public."Historial_Estado_Contrato"
     SET fecha_fin = now()
   WHERE id_historial_contrato = current_state.id_historial_contrato
     AND fecha_fin IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract state changed concurrently.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public."Historial_Estado_Contrato" (
    id_contrato,
    id_estado_contrato,
    fecha_inicio
  ) VALUES (
    p_contract_id,
    1,
    now()
  );

  UPDATE public."Contrato"
     SET fecha_firma_contrato = current_date
   WHERE id_contrato = p_contract_id;

  UPDATE public."Inventario_Digital"
     SET firmado_inquilino = true,
         firmado_propietario = true
   WHERE id_contrato = p_contract_id;

  RETURN true;
END
$$;

REVOKE ALL ON FUNCTION public.finalize_signed_contract_state(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_signed_contract_state(bigint) TO service_role;

COMMIT;
