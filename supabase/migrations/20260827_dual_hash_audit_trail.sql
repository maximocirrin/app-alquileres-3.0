-- ====================================================================
-- MIGRACIÓN DE DOBLE HASH CRIPTOGRÁFICO Y CADENA DE CUSTODIA FORENSE (AUDIT TRAIL)
-- Cumplimiento: Ley Nacional N° 25.506 y Código Civil y Comercial de la Nación
-- Fecha: 2026-08-27
-- ====================================================================

-- 1. EXTENDER TABLA Contrato
ALTER TABLE "Contrato"
    ADD COLUMN IF NOT EXISTS hash_original_sha256 text,
    ADD COLUMN IF NOT EXISTS url_contrato_original_pdf text,
    ADD COLUMN IF NOT EXISTS hash_final_sha256 text,
    ADD COLUMN IF NOT EXISTS url_contrato_final_pdf text;

-- 2. EXTENDER TABLA Firma_contrato
ALTER TABLE "Firma_contrato"
    ADD COLUMN IF NOT EXISTS hash_original_sha256 text,
    ADD COLUMN IF NOT EXISTS hash_audit_trail_sha256 text,
    ADD COLUMN IF NOT EXISTS hash_contrato_sha256 text,
    ADD COLUMN IF NOT EXISTS url_audit_trail_pdf text,
    ADD COLUMN IF NOT EXISTS url_contrato_final_pdf text;

-- 3. CREAR O ASEGURAR BUCKET 'contratos_originales' Y 'contratos_firmados'
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos_originales', 'contratos_originales', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos_firmados', 'contratos_firmados', false)
ON CONFLICT (id) DO NOTHING;
