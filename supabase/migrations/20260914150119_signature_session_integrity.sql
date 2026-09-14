BEGIN;

-- Preserve historical evidence, including duplicated legacy records. New
-- sessions all carry server-written consent evidence and are unique.
CREATE UNIQUE INDEX IF NOT EXISTS firma_contrato_session_unique
  ON public."Firma_contrato" (didit_session_id)
  WHERE didit_session_id IS NOT NULL AND didit_scores ? 'consent_version';
CREATE UNIQUE INDEX IF NOT EXISTS firma_contrato_signer_active_unique
  ON public."Firma_contrato" (id_contrato, id_perfil_firmante)
  WHERE estado_firma IN ('iniciada', 'biometria_pendiente', 'biometria_aprobada', 'sellada', 'completada')
    AND didit_scores ? 'consent_version';

COMMIT;
