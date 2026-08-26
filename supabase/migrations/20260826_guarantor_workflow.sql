-- ====================================================================
-- MIGRACIÓN DE GESTIÓN INTEGRAL DE GARANTES Y PASAPORTE HÁBITAT
-- Fecha: 2026-08-26
-- ====================================================================

-- 1. EXTENDER ESTADOS DE GARANTES (Estado_garante)
-- Normalizar a los 7 estados requeridos:
-- 1: BORRADOR, 2: INVITADO, 3: KYC_PENDIENTE, 4: DOCUMENTACION_SUBIDA, 5: EN_REVISION, 6: APROBADO, 7: RECHAZADO

INSERT INTO "Estado_garante" (id_estado_garante, nombre, descripcion)
VALUES 
    (1, 'Borrador', 'Garantía creada en borrador'),
    (2, 'Invitado', 'Invitación enviada al garante por enlace o email'),
    (3, 'KYC Pendiente', 'Pendiente de validación biométrica de identidad Didit'),
    (4, 'Documentación Subida', 'El garante completó la carga de datos y documentos requeridos'),
    (5, 'En Revisión', 'Documentación y solvencia en proceso de análisis'),
    (6, 'Aprobado', 'Garantía y solvencia verificadas y aprobadas'),
    (7, 'Rechazado', 'Garantía rechazada con observaciones')
ON CONFLICT (id_estado_garante) DO UPDATE 
SET 
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion;

-- Asegurar secuencia si existe
SELECT setval(pg_get_serial_sequence('"Estado_garante"', 'id_estado_garante'), coalesce(max(id_estado_garante), 1)) FROM "Estado_garante";

-- 2. EXTENDER TABLA Garante
ALTER TABLE "Garante" 
    ADD COLUMN IF NOT EXISTS id_pasaporte_garante bigint REFERENCES "Pasaporte_habitat"(id_pasaporte) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS id_perfil bigint REFERENCES "Perfil"(id_perfil) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS dni text,
    ADD COLUMN IF NOT EXISTS cuit text,
    ADD COLUMN IF NOT EXISTS datos_garantia jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS kyc_verificado boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS didit_session_id text,
    ADD COLUMN IF NOT EXISTS scoring numeric DEFAULT 10.0,
    ADD COLUMN IF NOT EXISTS observaciones_revision text,
    ADD COLUMN IF NOT EXISTS motivo_rechazo text;

-- 3. EXTENDER TABLA Documento_garante
ALTER TABLE "Documento_garante"
    ADD COLUMN IF NOT EXISTS estado_documento text DEFAULT 'PENDIENTE',
    ADD COLUMN IF NOT EXISTS observacion text;

-- 4. EXTENDER TABLA Verificacion_kyc
ALTER TABLE "Verificacion_kyc"
    ADD COLUMN IF NOT EXISTS id_garante bigint REFERENCES "Garante"(id_garante) ON DELETE CASCADE;

ALTER TABLE "Verificacion_kyc"
    ALTER COLUMN id_pasaporte DROP NOT NULL;

-- 5. POLÍTICAS DE SEGURIDAD RLS (Garante, Documento_garante, Verificacion_kyc)

-- Garante: Permitir lectura pública por token_invitacion o para usuarios autenticados dueños del pasaporte
DROP POLICY IF EXISTS "Acceso por token garante" ON "Garante";
DROP POLICY IF EXISTS "Actualizacion por token garante" ON "Garante";
DROP POLICY IF EXISTS "Gestionar garantes propios" ON "Garante";

CREATE POLICY "Gestionar garantes propios" ON "Garante"
    FOR ALL
    TO authenticated
    USING (
        id_pasaporte IN (
            SELECT p.id_pasaporte FROM "Pasaporte_habitat" p
            JOIN "Perfil" perf ON p.id_perfil = perf.id_perfil
            WHERE perf.user_id = auth.uid()
        )
    )
    WITH CHECK (
        id_pasaporte IN (
            SELECT p.id_pasaporte FROM "Pasaporte_habitat" p
            JOIN "Perfil" perf ON p.id_perfil = perf.id_perfil
            WHERE perf.user_id = auth.uid()
        )
    );

CREATE POLICY "Acceso por token garante" ON "Garante"
    FOR SELECT
    TO public
    USING (token_invitacion IS NOT NULL);

CREATE POLICY "Actualizacion por token garante" ON "Garante"
    FOR UPDATE
    TO public
    USING (token_invitacion IS NOT NULL)
    WITH CHECK (token_invitacion IS NOT NULL);

-- Documento_garante
DROP POLICY IF EXISTS "Gestionar documentos garante propios" ON "Documento_garante";
DROP POLICY IF EXISTS "Insertar documentos garante invitado" ON "Documento_garante";
DROP POLICY IF EXISTS "Lectura documentos garante invitado" ON "Documento_garante";

CREATE POLICY "Gestionar documentos garante propios" ON "Documento_garante"
    FOR ALL
    TO authenticated
    USING (
        id_garante IN (
            SELECT g.id_garante FROM "Garante" g
            JOIN "Pasaporte_habitat" p ON g.id_pasaporte = p.id_pasaporte
            JOIN "Perfil" perf ON p.id_perfil = perf.id_perfil
            WHERE perf.user_id = auth.uid()
        )
    )
    WITH CHECK (
        id_garante IN (
            SELECT g.id_garante FROM "Garante" g
            JOIN "Pasaporte_habitat" p ON g.id_pasaporte = p.id_pasaporte
            JOIN "Perfil" perf ON p.id_perfil = perf.id_perfil
            WHERE perf.user_id = auth.uid()
        )
    );

CREATE POLICY "Insertar documentos garante invitado" ON "Documento_garante"
    FOR INSERT
    TO public
    WITH CHECK (
        id_garante IN (
            SELECT g.id_garante FROM "Garante" g
            WHERE g.token_invitacion IS NOT NULL
        )
    );

CREATE POLICY "Lectura documentos garante invitado" ON "Documento_garante"
    FOR SELECT
    TO public
    USING (
        id_garante IN (
            SELECT g.id_garante FROM "Garante" g
            WHERE g.token_invitacion IS NOT NULL
        )
    );

-- Verificacion_kyc
DROP POLICY IF EXISTS "Insertar KYC garante" ON "Verificacion_kyc";
DROP POLICY IF EXISTS "Lectura KYC garante" ON "Verificacion_kyc";

CREATE POLICY "Insertar KYC garante" ON "Verificacion_kyc"
    FOR INSERT
    TO public
    WITH CHECK (
        id_garante IS NOT NULL OR id_pasaporte IS NOT NULL
    );

CREATE POLICY "Lectura KYC garante" ON "Verificacion_kyc"
    FOR SELECT
    TO public
    USING (
        id_garante IS NOT NULL OR id_pasaporte IS NOT NULL
    );

-- Crear índices para optimizar consultas de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_garante_pasaporte ON "Garante"(id_pasaporte);
CREATE INDEX IF NOT EXISTS idx_garante_token ON "Garante"(token_invitacion);
CREATE INDEX IF NOT EXISTS idx_garante_pasaporte_garante ON "Garante"(id_pasaporte_garante);
CREATE INDEX IF NOT EXISTS idx_documento_garante_id ON "Documento_garante"(id_garante);
CREATE INDEX IF NOT EXISTS idx_verificacion_kyc_garante ON "Verificacion_kyc"(id_garante);
