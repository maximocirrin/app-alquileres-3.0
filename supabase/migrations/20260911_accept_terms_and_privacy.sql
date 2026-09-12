-- Migración: Registro de Aceptación de Términos y Condiciones y Política de Privacidad
-- Fecha: 2026-09-11

-- 1. Agregar columnas de aceptación de privacidad a public."Perfil"
ALTER TABLE public."Perfil" 
ADD COLUMN IF NOT EXISTS acepto_politica_privacidad BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS acepto_privacidad BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_aceptacion_privacidad TIMESTAMPTZ;

-- Comentarios explicativos para auditoría y cumplimiento normativo
COMMENT ON COLUMN public."Perfil".acepto_terminos IS 'Indica si el usuario aceptó los Términos y Condiciones Generales de Uso de Vivat';
COMMENT ON COLUMN public."Perfil".fecha_aceptacion_terminos IS 'Fecha y hora exacta en que el usuario prestó conformidad a los Términos y Condiciones';
COMMENT ON COLUMN public."Perfil".acepto_politica_privacidad IS 'Indica si el usuario aceptó la Política de Privacidad y Tratamiento de Datos Personales';
COMMENT ON COLUMN public."Perfil".acepto_privacidad IS 'Alias de compatibilidad para acepto_politica_privacidad';
COMMENT ON COLUMN public."Perfil".fecha_aceptacion_privacidad IS 'Fecha y hora exacta en que el usuario prestó conformidad a la Política de Privacidad';

-- 2. Actualizar función trigger handle_new_user() para persistir las aceptaciones desde auth.users metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_tipo_perfil BIGINT;
    v_nombre TEXT;
    v_nombre_usuario TEXT;
    v_acepto_terminos BOOLEAN;
    v_fecha_terminos TIMESTAMPTZ;
    v_acepto_privacidad BOOLEAN;
    v_fecha_privacidad TIMESTAMPTZ;
BEGIN
    IF NEW.email_confirmed_at IS NULL THEN
        RETURN NEW;
    END IF;

    -- Determinar tipo de perfil seguro (Prevenir autoasignación de Admin id:4)
    v_tipo_perfil := CASE 
        WHEN LOWER(NEW.raw_user_meta_data->>'role') IN ('profesional', 'corredor', 'broker') THEN 3
        WHEN (NEW.raw_user_meta_data->>'id_tipo_perfil')::BIGINT = 3 THEN 3
        WHEN LOWER(NEW.raw_user_meta_data->>'role') IN ('propietario', 'owner') THEN 2
        WHEN (NEW.raw_user_meta_data->>'id_tipo_perfil')::BIGINT = 2 THEN 2
        ELSE 1 -- Inquilino / Particular por defecto
    END;

    v_nombre := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    v_nombre_usuario := COALESCE(
        NEW.raw_user_meta_data->>'nombre_usuario',
        NEW.raw_user_meta_data->>'user_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    v_acepto_terminos := COALESCE(
        (NEW.raw_user_meta_data->>'acepto_terminos')::BOOLEAN,
        true
    );

    v_fecha_terminos := COALESCE(
        (NEW.raw_user_meta_data->>'fecha_aceptacion_terminos')::TIMESTAMPTZ,
        now()
    );

    v_acepto_privacidad := COALESCE(
        (NEW.raw_user_meta_data->>'acepto_politica_privacidad')::BOOLEAN,
        (NEW.raw_user_meta_data->>'acepto_privacidad')::BOOLEAN,
        true
    );

    v_fecha_privacidad := COALESCE(
        (NEW.raw_user_meta_data->>'fecha_aceptacion_privacidad')::TIMESTAMPTZ,
        (NEW.raw_user_meta_data->>'fecha_aceptacion_politica_privacidad')::TIMESTAMPTZ,
        now()
    );

    INSERT INTO public."Perfil" (
        user_id,
        id_tipo_perfil,
        nombre_completo,
        nombre_usuario,
        mail,
        cuenta_verificada,
        fecha_verificacion,
        acepto_terminos,
        fecha_aceptacion_terminos,
        acepto_politica_privacidad,
        acepto_privacidad,
        fecha_aceptacion_privacidad
    )
    VALUES (
        NEW.id,
        v_tipo_perfil,
        v_nombre,
        v_nombre_usuario,
        NEW.email,
        true,
        NEW.email_confirmed_at,
        v_acepto_terminos,
        v_fecha_terminos,
        v_acepto_privacidad,
        v_acepto_privacidad,
        v_fecha_privacidad
    )
    ON CONFLICT (mail) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        id_tipo_perfil = CASE 
            WHEN public."Perfil".id_tipo_perfil = 1 AND EXCLUDED.id_tipo_perfil <> 1 AND EXCLUDED.id_tipo_perfil <> 4 THEN EXCLUDED.id_tipo_perfil
            ELSE public."Perfil".id_tipo_perfil
        END,
        nombre_usuario = COALESCE(public."Perfil".nombre_usuario, EXCLUDED.nombre_usuario),
        cuenta_verificada = true,
        fecha_verificacion = EXCLUDED.fecha_verificacion,
        acepto_terminos = COALESCE(public."Perfil".acepto_terminos, EXCLUDED.acepto_terminos),
        fecha_aceptacion_terminos = COALESCE(public."Perfil".fecha_aceptacion_terminos, EXCLUDED.fecha_aceptacion_terminos),
        acepto_politica_privacidad = COALESCE(public."Perfil".acepto_politica_privacidad, EXCLUDED.acepto_politica_privacidad),
        acepto_privacidad = COALESCE(public."Perfil".acepto_privacidad, EXCLUDED.acepto_privacidad),
        fecha_aceptacion_privacidad = COALESCE(public."Perfil".fecha_aceptacion_privacidad, EXCLUDED.fecha_aceptacion_privacidad);

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error en handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;
