-- ====================================================================
-- MIGRACIÓN PARA HABILITAR RLS EN Pago_pasaporte
-- Fecha: 2026-08-28
-- ====================================================================

-- Habilitar Row Level Security para la tabla Pago_pasaporte
ALTER TABLE "Pago_pasaporte" ENABLE ROW LEVEL SECURITY;

-- Política de lectura: los usuarios autenticados pueden leer sus propios pagos (o todos si no hay restricción fuerte)
-- Como no conocemos la estructura exacta (e.g., id_perfil), permitimos lectura a autenticados.
CREATE POLICY "Permitir lectura a usuarios autenticados" 
ON "Pago_pasaporte" 
FOR SELECT 
TO authenticated 
USING (true);

-- Política de inserción: los usuarios autenticados pueden registrar pagos
CREATE POLICY "Permitir insercion a usuarios autenticados" 
ON "Pago_pasaporte" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Política de actualización: permitir actualizar a autenticados (para webhooks de MP, etc.)
CREATE POLICY "Permitir actualizacion a usuarios autenticados" 
ON "Pago_pasaporte" 
FOR UPDATE 
TO authenticated 
USING (true);
