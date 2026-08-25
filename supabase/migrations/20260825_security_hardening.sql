-- ====================================================================
-- MIGRACIÓN DE ENDURECIMIENTO DE SEGURIDAD Y POLÍTICAS RLS EN SUPABASE
-- Fecha: 2026-08-25
-- ====================================================================

-- 1. CORREGIR POLÍTICAS EN Garante Y Documento_garante
DROP POLICY IF EXISTS "Allow All Access" ON "Garante";
DROP POLICY IF EXISTS "Gestionar garantes propios" ON "Garante";
DROP POLICY IF EXISTS "Acceso por token garante" ON "Garante";

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

DROP POLICY IF EXISTS "Allow All Access" ON "Documento_garante";
DROP POLICY IF EXISTS "Gestionar documentos garante propios" ON "Documento_garante";
DROP POLICY IF EXISTS "Insertar documentos garante invitado" ON "Documento_garante";

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

-- 2. CORREGIR POLÍTICAS EN Verificacion_kyc
DROP POLICY IF EXISTS "Allow All Access" ON "Verificacion_kyc";
DROP POLICY IF EXISTS "Lectura KYC propia" ON "Verificacion_kyc";
DROP POLICY IF EXISTS "Insertar KYC propia" ON "Verificacion_kyc";

CREATE POLICY "Lectura KYC propia" ON "Verificacion_kyc"
    FOR SELECT
    TO authenticated
    USING (
        id_pasaporte IN (
            SELECT p.id_pasaporte FROM "Pasaporte_habitat" p
            JOIN "Perfil" perf ON p.id_perfil = perf.id_perfil
            WHERE perf.user_id = auth.uid()
        )
    );

CREATE POLICY "Insertar KYC propia" ON "Verificacion_kyc"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        id_pasaporte IN (
            SELECT p.id_pasaporte FROM "Pasaporte_habitat" p
            JOIN "Perfil" perf ON p.id_perfil = perf.id_perfil
            WHERE perf.user_id = auth.uid()
        )
    );

-- 3. CORREGIR POLÍTICAS EN employment_records, legal_records, atm_records
DROP POLICY IF EXISTS "Acceso seguro employment_records" ON "employment_records";
DROP POLICY IF EXISTS "employment_records_auth_policy" ON "employment_records";

CREATE POLICY "employment_records_auth_policy" ON "employment_records"
    FOR ALL
    TO authenticated
    USING (
        participant_id IN (
            SELECT perf.id_perfil FROM "Perfil" perf
            WHERE perf.user_id = auth.uid()
        )
    )
    WITH CHECK (
        participant_id IN (
            SELECT perf.id_perfil FROM "Perfil" perf
            WHERE perf.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Acceso seguro legal_records" ON "legal_records";
DROP POLICY IF EXISTS "legal_records_auth_policy" ON "legal_records";

CREATE POLICY "legal_records_auth_policy" ON "legal_records"
    FOR ALL
    TO authenticated
    USING (
        participant_id IN (
            SELECT perf.id_perfil FROM "Perfil" perf
            WHERE perf.user_id = auth.uid()
        )
    )
    WITH CHECK (
        participant_id IN (
            SELECT perf.id_perfil FROM "Perfil" perf
            WHERE perf.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Acceso seguro atm_records" ON "atm_records";
DROP POLICY IF EXISTS "atm_records_auth_policy" ON "atm_records";

CREATE POLICY "atm_records_auth_policy" ON "atm_records"
    FOR ALL
    TO authenticated
    USING (
        participant_id IN (
            SELECT perf.id_perfil FROM "Perfil" perf
            WHERE perf.user_id = auth.uid()
        )
    )
    WITH CHECK (
        participant_id IN (
            SELECT perf.id_perfil FROM "Perfil" perf
            WHERE perf.user_id = auth.uid()
        )
    );

-- 4. CORREGIR POLÍTICAS EN Mensaje_Contrato
DROP POLICY IF EXISTS "Permitir envio de mensajes" ON "Mensaje_Contrato";
DROP POLICY IF EXISTS "Permitir lectura general de mensajes" ON "Mensaje_Contrato";
DROP POLICY IF EXISTS "Lectura de mensajes del contrato propio" ON "Mensaje_Contrato";
DROP POLICY IF EXISTS "Envio de mensajes al contrato propio" ON "Mensaje_Contrato";

CREATE POLICY "Lectura de mensajes del contrato propio" ON "Mensaje_Contrato"
    FOR SELECT
    TO authenticated
    USING (
        id_contrato IN (
            SELECT c.id_contrato FROM "Contrato" c
            WHERE c.id_perfil_propietario IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
               OR c.id_perfil_inquilino IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
        )
    );

CREATE POLICY "Envio de mensajes al contrato propio" ON "Mensaje_Contrato"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        id_contrato IN (
            SELECT c.id_contrato FROM "Contrato" c
            WHERE c.id_perfil_propietario IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
               OR c.id_perfil_inquilino IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
        )
    );

-- 5. CORREGIR POLÍTICAS EN Ticket_mantenimiento
DROP POLICY IF EXISTS "Allow All Access" ON "Ticket_mantenimiento";
DROP POLICY IF EXISTS "Gestionar tickets de contrato propio" ON "Ticket_mantenimiento";

CREATE POLICY "Gestionar tickets de contrato propio" ON "Ticket_mantenimiento"
    FOR ALL
    TO authenticated
    USING (
        id_contrato IN (
            SELECT c.id_contrato FROM "Contrato" c
            WHERE c.id_perfil_propietario IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
               OR c.id_perfil_inquilino IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
        )
    )
    WITH CHECK (
        id_contrato IN (
            SELECT c.id_contrato FROM "Contrato" c
            WHERE c.id_perfil_propietario IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
               OR c.id_perfil_inquilino IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
        )
    );

-- 6. CORREGIR POLÍTICAS EN Inventario_Digital
DROP POLICY IF EXISTS "Allow All Access" ON "Inventario_Digital";
DROP POLICY IF EXISTS "Gestionar inventario de contrato propio" ON "Inventario_Digital";

CREATE POLICY "Gestionar inventario de contrato propio" ON "Inventario_Digital"
    FOR ALL
    TO authenticated
    USING (
        id_contrato IN (
            SELECT c.id_contrato FROM "Contrato" c
            WHERE c.id_perfil_propietario IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
               OR c.id_perfil_inquilino IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
        )
    )
    WITH CHECK (
        id_contrato IN (
            SELECT c.id_contrato FROM "Contrato" c
            WHERE c.id_perfil_propietario IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
               OR c.id_perfil_inquilino IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
        )
    );

-- 7. CORREGIR POLÍTICAS EN Tasacion
DROP POLICY IF EXISTS "Allow All Access" ON "Tasacion";
DROP POLICY IF EXISTS "Lectura tasaciones propias" ON "Tasacion";
DROP POLICY IF EXISTS "Insertar tasaciones propias" ON "Tasacion";

CREATE POLICY "Lectura tasaciones propias" ON "Tasacion"
    FOR SELECT
    TO authenticated
    USING (
        id_perfil_solicitante IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
        OR id_perfil_corredor IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
    );

CREATE POLICY "Insertar tasaciones propias" ON "Tasacion"
    FOR INSERT
    TO authenticated
    WITH CHECK (
        id_perfil_solicitante IN (SELECT perf.id_perfil FROM "Perfil" perf WHERE perf.user_id = auth.uid())
        OR id_perfil_solicitante IS NULL
    );

-- 8. CORREGIR POLÍTICAS EN Disputa_lead
DROP POLICY IF EXISTS "Allow All Access Disputa_lead" ON "Disputa_lead";
DROP POLICY IF EXISTS "Gestionar disputas propias" ON "Disputa_lead";

CREATE POLICY "Gestionar disputas propias" ON "Disputa_lead"
    FOR ALL
    TO authenticated
    USING (
        id_perfil_corredor IN (
            SELECT perf.id_perfil FROM "Perfil" perf
            WHERE perf.user_id = auth.uid()
        )
    )
    WITH CHECK (
        id_perfil_corredor IN (
            SELECT perf.id_perfil FROM "Perfil" perf
            WHERE perf.user_id = auth.uid()
        )
    );

-- 9. CORREGIR POLÍTICA DE STORAGE PARA contratos_firmados
DROP POLICY IF EXISTS "Permitir a usuarios autenticados leer sus contratos_firmados" ON storage.objects;

CREATE POLICY "Permitir a usuarios autenticados leer sus contratos_firmados" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'contratos_firmados' AND (
            (storage.foldername(name))[1] IN (
                SELECT 'contrato_' || c.id_contrato::text
                FROM "Contrato" c
                JOIN "Perfil" p_inq ON c.id_perfil_inquilino = p_inq.id_perfil
                WHERE p_inq.user_id = auth.uid()
                UNION
                SELECT 'contrato_' || c.id_contrato::text
                FROM "Contrato" c
                JOIN "Perfil" p_prop ON c.id_perfil_propietario = p_prop.id_perfil
                WHERE p_prop.user_id = auth.uid()
            )
        )
    );
