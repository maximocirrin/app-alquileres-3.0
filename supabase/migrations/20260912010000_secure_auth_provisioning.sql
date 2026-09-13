-- Separate email confirmation from identity verification and record only
-- explicit consent with server-generated timestamps.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  requested_role text;
  profile_type bigint;
  full_name text;
  user_name text;
  accepted_terms boolean;
  accepted_privacy boolean;
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  requested_role := lower(coalesce(
    NEW.raw_user_meta_data->>'role',
    NEW.raw_user_meta_data->>'id_tipo_perfil',
    ''
  ));

  -- Owner is a product preference. Broker/admin are privileged roles and
  -- require a separate server-side approval process.
  profile_type := CASE
    WHEN requested_role IN ('propietario', 'owner', '2') THEN 2
    ELSE 1
  END;

  full_name := left(coalesce(
    nullif(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  ), 240);
  user_name := left(coalesce(
    nullif(btrim(NEW.raw_user_meta_data->>'nombre_usuario'), ''),
    nullif(btrim(NEW.raw_user_meta_data->>'user_name'), ''),
    full_name
  ), 120);

  accepted_terms := lower(coalesce(NEW.raw_user_meta_data->>'acepto_terminos', 'false')) = 'true';
  accepted_privacy :=
    lower(coalesce(NEW.raw_user_meta_data->>'acepto_politica_privacidad', 'false')) = 'true'
    AND lower(coalesce(NEW.raw_user_meta_data->>'acepto_privacidad', 'false')) = 'true';

  INSERT INTO public."Perfil" (
    user_id, id_tipo_perfil, nombre_completo, nombre_usuario, mail,
    cuenta_verificada, fecha_verificacion,
    acepto_terminos, fecha_aceptacion_terminos,
    acepto_politica_privacidad, acepto_privacidad, fecha_aceptacion_privacidad
  ) VALUES (
    NEW.id, profile_type, full_name, user_name, NEW.email,
    false, NULL,
    accepted_terms, CASE WHEN accepted_terms THEN now() ELSE NULL END,
    accepted_privacy, accepted_privacy, CASE WHEN accepted_privacy THEN now() ELSE NULL END
  )
  ON CONFLICT (mail) DO UPDATE
  SET user_id = EXCLUDED.user_id,
      nombre_completo = coalesce(public."Perfil".nombre_completo, EXCLUDED.nombre_completo),
      nombre_usuario = coalesce(public."Perfil".nombre_usuario, EXCLUDED.nombre_usuario),
      acepto_terminos = public."Perfil".acepto_terminos OR EXCLUDED.acepto_terminos,
      fecha_aceptacion_terminos = CASE
        WHEN public."Perfil".acepto_terminos THEN public."Perfil".fecha_aceptacion_terminos
        WHEN EXCLUDED.acepto_terminos THEN EXCLUDED.fecha_aceptacion_terminos
        ELSE NULL
      END,
      acepto_politica_privacidad = public."Perfil".acepto_politica_privacidad OR EXCLUDED.acepto_politica_privacidad,
      acepto_privacidad = public."Perfil".acepto_privacidad OR EXCLUDED.acepto_privacidad,
      fecha_aceptacion_privacidad = CASE
        WHEN public."Perfil".acepto_politica_privacidad THEN public."Perfil".fecha_aceptacion_privacidad
        WHEN EXCLUDED.acepto_politica_privacidad THEN EXCLUDED.fecha_aceptacion_privacidad
        ELSE NULL
      END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for auth user % (SQLSTATE %)', NEW.id, SQLSTATE;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Quarantine profiles whose verification timestamp was copied directly from
-- email confirmation and that have no approved KYC evidence.
UPDATE public."Perfil" AS profile
SET cuenta_verificada = false,
    fecha_verificacion = NULL
FROM auth.users AS auth_user
WHERE profile.user_id = auth_user.id
  AND profile.cuenta_verificada = true
  AND profile.fecha_verificacion IS NOT DISTINCT FROM auth_user.email_confirmed_at
  AND NOT EXISTS (
    SELECT 1
    FROM public."Pasaporte_habitat" AS passport
    JOIN public."Verificacion_kyc" AS verification
      ON verification.id_pasaporte = passport.id_pasaporte
    WHERE passport.id_perfil = profile.id_perfil
      AND lower(verification.status) IN ('approved', 'success', 'passed')
  );

COMMIT;
