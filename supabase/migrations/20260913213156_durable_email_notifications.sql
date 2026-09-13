-- Durable, server-generated in-app and email notifications.
-- Email delivery is asynchronous: database writes only enqueue work and pg_net
-- invokes the Edge Function after the transaction commits.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

ALTER TABLE public."Notificacion"
  ADD COLUMN IF NOT EXISTS clave_deduplicacion text;

CREATE UNIQUE INDEX IF NOT EXISTS notificacion_clave_deduplicacion_uidx
  ON public."Notificacion" (clave_deduplicacion)
  WHERE clave_deduplicacion IS NOT NULL;

CREATE TABLE IF NOT EXISTS public."Email_notificacion_cola" (
  id_email uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_notificacion uuid NOT NULL UNIQUE
    REFERENCES public."Notificacion"(id_notificacion) ON DELETE CASCADE,
  id_perfil_destino bigint NOT NULL
    REFERENCES public."Perfil"(id_perfil) ON DELETE RESTRICT,
  destinatario_email text NOT NULL,
  destinatario_nombre text,
  asunto text NOT NULL,
  titulo text NOT NULL,
  mensaje text NOT NULL,
  enlace text,
  categoria text NOT NULL,
  frecuencia text NOT NULL DEFAULT 'instant'
    CHECK (frecuencia IN ('instant', 'daily', 'weekly')),
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'procesando', 'enviado', 'fallido')),
  intentos smallint NOT NULL DEFAULT 0 CHECK (intentos BETWEEN 0 AND 20),
  disponible_desde timestamptz NOT NULL DEFAULT now(),
  bloqueado_en timestamptz,
  enviado_en timestamptz,
  proveedor_id text,
  ultimo_error text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_notificacion_destinatario_valido CHECK (
    char_length(destinatario_email) BETWEEN 3 AND 320
    AND destinatario_email LIKE '%@%'
  )
);

CREATE INDEX IF NOT EXISTS email_notificacion_cola_pendiente_idx
  ON public."Email_notificacion_cola" (disponible_desde, creado_en)
  WHERE estado IN ('pendiente', 'procesando');

CREATE INDEX IF NOT EXISTS email_notificacion_cola_perfil_idx
  ON public."Email_notificacion_cola" (id_perfil_destino, creado_en DESC);

ALTER TABLE public."Email_notificacion_cola" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Email_notificacion_cola" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public."Email_notificacion_cola" TO service_role;

CREATE OR REPLACE FUNCTION private.notification_preference_enabled(
  preferences jsonb,
  preference_name text,
  default_value boolean DEFAULT true
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE lower(coalesce(preferences ->> preference_name, default_value::text))
    WHEN 'false' THEN false
    WHEN '0' THEN false
    WHEN 'off' THEN false
    WHEN 'no' THEN false
    ELSE true
  END;
$$;

CREATE OR REPLACE FUNCTION private.notification_delivery_time(frequency text)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  local_now timestamp := now() AT TIME ZONE 'America/Argentina/Buenos_Aires';
  local_delivery timestamp;
BEGIN
  IF frequency = 'daily' THEN
    local_delivery := date_trunc('day', local_now) + interval '9 hours';
    IF local_delivery <= local_now THEN
      local_delivery := local_delivery + interval '1 day';
    END IF;
    RETURN local_delivery AT TIME ZONE 'America/Argentina/Buenos_Aires';
  ELSIF frequency = 'weekly' THEN
    local_delivery := date_trunc('week', local_now) + interval '7 days 9 hours';
    RETURN local_delivery AT TIME ZONE 'America/Argentina/Buenos_Aires';
  END IF;

  RETURN now();
END;
$$;

CREATE OR REPLACE FUNCTION private.enqueue_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient_profile_id bigint;
  recipient_email text;
  recipient_name text;
  preferences jsonb := '{}'::jsonb;
  preference_name text := 'notif_operativas';
  frequency text := 'instant';
  delivery_time timestamptz := now();
BEGIN
  IF NEW.id_perfil_destino IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT profile.id_perfil,
         profile.mail,
         profile.nombre_completo,
         coalesce(auth_user.raw_user_meta_data -> 'notification_preferences', '{}'::jsonb)
    INTO recipient_profile_id, recipient_email, recipient_name, preferences
    FROM public."Perfil" AS profile
    LEFT JOIN auth.users AS auth_user ON auth_user.id = profile.user_id
   WHERE profile.id_perfil = NEW.id_perfil_destino
     AND profile.fecha_baja IS NULL;

  IF recipient_profile_id IS NULL
     OR recipient_email IS NULL
     OR char_length(btrim(recipient_email)) NOT BETWEEN 3 AND 320
     OR position('@' IN recipient_email) = 0
     OR NOT private.notification_preference_enabled(preferences, 'channel_email', true) THEN
    RETURN NEW;
  END IF;

  preference_name := CASE
    WHEN NEW.tipo IN ('vencimiento_pago', 'pago_vencido')
      THEN 'notif_vencimientos'
    WHEN NEW.tipo LIKE 'pago_%' OR NEW.tipo = 'interes_perdonado'
      THEN 'notif_pagos_confirm'
    WHEN NEW.tipo LIKE 'postulacion_%' OR NEW.tipo = 'application'
      THEN 'notif_postulaciones'
    WHEN NEW.tipo LIKE 'visita_%' OR NEW.tipo = 'visita'
      THEN 'notif_visitas_agenda'
    WHEN NEW.tipo LIKE 'mantenimiento_%'
      THEN 'notif_mantenimiento'
    WHEN NEW.tipo IN ('primer_mensaje', 'mensaje_chat', 'chat')
      THEN 'notif_mensajes'
    WHEN NEW.tipo LIKE 'firma_%' OR NEW.tipo LIKE 'contrato_%'
      THEN 'notif_contratos_firma'
    ELSE 'notif_operativas'
  END;

  IF NOT private.notification_preference_enabled(preferences, preference_name, true) THEN
    RETURN NEW;
  END IF;

  -- Chat stays durable in the in-app bell, but email is intentionally limited
  -- to the first human message of a new contract conversation.
  IF NEW.tipo = 'mensaje_chat' THEN
    RETURN NEW;
  END IF;

  frequency := CASE preferences ->> 'email_frequency'
    WHEN 'daily' THEN 'daily'
    WHEN 'weekly' THEN 'weekly'
    ELSE 'instant'
  END;

  -- Operational transactions are intentionally immediate. The frequency
  -- preference is applied to reminders and informational notifications.
  IF NEW.tipo IN (
    'postulacion_nueva', 'postulacion_aceptada', 'postulacion_rechazada',
    'pago_informado', 'pago_aceptado', 'pago_rechazado', 'interes_perdonado',
    'mantenimiento_nuevo', 'mantenimiento_actualizado',
    'visita_nueva', 'visita_programada', 'visita_actualizada',
    'primer_mensaje', 'firma_completada'
  ) THEN
    frequency := 'instant';
  END IF;

  delivery_time := private.notification_delivery_time(frequency);

  INSERT INTO public."Email_notificacion_cola" (
    id_notificacion,
    id_perfil_destino,
    destinatario_email,
    destinatario_nombre,
    asunto,
    titulo,
    mensaje,
    enlace,
    categoria,
    frecuencia,
    disponible_desde
  ) VALUES (
    NEW.id_notificacion,
    NEW.id_perfil_destino,
    lower(btrim(recipient_email)),
    nullif(btrim(recipient_name), ''),
    left(NEW.titulo, 200),
    NEW.titulo,
    NEW.mensaje,
    NEW.enlace,
    preference_name,
    frequency,
    delivery_time
  )
  ON CONFLICT (id_notificacion) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.notification_preference_enabled(jsonb, text, boolean)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notification_delivery_time(text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enqueue_notification_email()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS vivat_enqueue_notification_email ON public."Notificacion";
CREATE TRIGGER vivat_enqueue_notification_email
AFTER INSERT ON public."Notificacion"
FOR EACH ROW EXECUTE FUNCTION private.enqueue_notification_email();

CREATE OR REPLACE FUNCTION private.create_notification(
  target_profile_id bigint,
  sender_profile_id bigint,
  notification_title text,
  notification_message text,
  notification_type text,
  notification_icon text,
  notification_link text,
  target_role text,
  sender_role text,
  deduplication_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF target_profile_id IS NULL OR target_profile_id = sender_profile_id THEN
    RETURN;
  END IF;

  INSERT INTO public."Notificacion" (
    id_perfil_destino,
    titulo,
    mensaje,
    tipo,
    icono,
    enlace,
    rol_destino,
    rol_emisor,
    id_perfil_emisor,
    leida,
    clave_deduplicacion
  ) VALUES (
    target_profile_id,
    left(notification_title, 200),
    left(notification_message, 2000),
    notification_type,
    notification_icon,
    notification_link,
    target_role,
    sender_role,
    sender_profile_id,
    false,
    left(deduplication_key, 500)
  )
  ON CONFLICT (clave_deduplicacion)
    WHERE clave_deduplicacion IS NOT NULL
    DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION private.create_notification(
  bigint, bigint, text, text, text, text, text, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.notify_application_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_profile_id bigint;
  applicant_name text;
  property_label text;
BEGIN
  SELECT coalesce(property.id_perfil_propietario, publication.id_perfil),
         coalesce(nullif(btrim(profile.nombre_completo), ''), 'Un inquilino verificado'),
         coalesce(
           nullif(btrim(concat_ws(' ', property.calle, property.numero)), ''),
           nullif(split_part(publication.descripcion, ' | ', 1), ''),
           'tu propiedad'
         )
    INTO owner_profile_id, applicant_name, property_label
    FROM public."Publicacion" AS publication
    LEFT JOIN public."Propiedad" AS property
      ON property.id_propiedad = publication.id_propiedad
    LEFT JOIN public."Perfil" AS profile
      ON profile.id_perfil = NEW.id_perfil
   WHERE publication.id_publicacion = NEW.id_publicacion;

  PERFORM private.create_notification(
    owner_profile_id,
    NEW.id_perfil,
    'Nueva postulación recibida',
    format('%s se postuló para alquilar %s.', applicant_name, property_label),
    'postulacion_nueva',
    'person_add',
    'administrador.html#postulaciones',
    'OWNER',
    'TENANT',
    format('application:new:%s', NEW.id_solicitud)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.notify_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  application_id bigint;
  applicant_profile_id bigint;
  owner_profile_id bigint;
  property_label text;
BEGIN
  IF NEW.id_estado_solicitud NOT IN (2, 3) THEN
    RETURN NEW;
  END IF;

  SELECT application.id_solicitud,
         application.id_perfil,
         coalesce(property.id_perfil_propietario, publication.id_perfil),
         coalesce(
           nullif(btrim(concat_ws(' ', property.calle, property.numero)), ''),
           nullif(split_part(publication.descripcion, ' | ', 1), ''),
           'la propiedad'
         )
    INTO application_id, applicant_profile_id, owner_profile_id, property_label
    FROM public."Solicitud" AS application
    LEFT JOIN public."Publicacion" AS publication
      ON publication.id_publicacion = application.id_publicacion
    LEFT JOIN public."Propiedad" AS property
      ON property.id_propiedad = publication.id_propiedad
   WHERE application.id_solicitud = NEW.id_solicitud;

  IF application_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id_estado_solicitud = 2 THEN
    PERFORM private.create_notification(
      applicant_profile_id,
      owner_profile_id,
      'Tu postulación fue aceptada',
      format('El propietario aceptó tu postulación para %s. Ya podés revisar los próximos pasos y el contrato.', property_label),
      'postulacion_aceptada',
      'check_circle',
      'tu-alquiler.html#postulaciones',
      'TENANT',
      'OWNER',
      format('application:accepted:%s', application_id)
    );
  ELSE
    PERFORM private.create_notification(
      applicant_profile_id,
      owner_profile_id,
      'Tu postulación fue actualizada',
      format('La postulación para %s no fue seleccionada. Podés seguir explorando otras propiedades.', property_label),
      'postulacion_rechazada',
      'cancel',
      'tu-alquiler.html#postulaciones',
      'TENANT',
      'OWNER',
      format('application:rejected:%s', application_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.notify_punitive_interest_waived()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  contract_row public."Contrato"%ROWTYPE;
BEGIN
  IF NEW.interes_perdonado IS NOT TRUE OR OLD.interes_perdonado IS TRUE THEN
    RETURN NEW;
  END IF;

  SELECT * INTO contract_row
    FROM public."Contrato"
   WHERE id_contrato = NEW.id_contrato;

  PERFORM private.create_notification(
    contract_row.id_perfil_inquilino,
    contract_row.id_perfil_propietario,
    'Intereses punitorios perdonados',
    format('El propietario perdonó los intereses punitorios del alquiler de %s.', coalesce(NEW.periodo, 'este período')),
    'interes_perdonado',
    'volunteer_activism',
    'tu-alquiler.html#alquiler',
    'TENANT',
    'OWNER',
    format('payment:interest-waived:%s', NEW.id_pago)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.notify_maintenance_ticket_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  contract_row public."Contrato"%ROWTYPE;
  target_profile_id bigint;
  target_role text;
  sender_role text;
BEGIN
  SELECT * INTO contract_row
    FROM public."Contrato"
   WHERE id_contrato = NEW.id_contrato;

  IF NEW.id_perfil = contract_row.id_perfil_propietario THEN
    target_profile_id := contract_row.id_perfil_inquilino;
    target_role := 'TENANT';
    sender_role := 'OWNER';
  ELSE
    target_profile_id := contract_row.id_perfil_propietario;
    target_role := 'OWNER';
    sender_role := 'TENANT';
  END IF;

  PERFORM private.create_notification(
    target_profile_id,
    NEW.id_perfil,
    'Nuevo ticket de mantenimiento',
    format('%s: %s', coalesce(nullif(NEW.titulo, ''), 'Solicitud de mantenimiento'), coalesce(nullif(NEW.descripcion, ''), 'Revisá el detalle del ticket.')),
    'mantenimiento_nuevo',
    'home_repair_service',
    CASE WHEN target_role = 'OWNER' THEN 'administrador.html#alquiler-activo' ELSE 'tu-alquiler.html#alquiler' END,
    target_role,
    sender_role,
    format('maintenance:new:%s', NEW.id_ticket)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.notify_maintenance_ticket_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  contract_row public."Contrato"%ROWTYPE;
  actor_profile_id bigint;
  target_profile_id bigint;
  target_role text;
BEGIN
  IF NEW.id_estado_ticket IS NOT DISTINCT FROM OLD.id_estado_ticket
     AND NEW.estado IS NOT DISTINCT FROM OLD.estado
     AND NEW.respuesta_propietario IS NOT DISTINCT FROM OLD.respuesta_propietario
     AND NEW.monto_descuento_alquiler IS NOT DISTINCT FROM OLD.monto_descuento_alquiler THEN
    RETURN NEW;
  END IF;

  SELECT * INTO contract_row
    FROM public."Contrato"
   WHERE id_contrato = NEW.id_contrato;

  actor_profile_id := private.current_profile_id();
  IF actor_profile_id = contract_row.id_perfil_inquilino THEN
    target_profile_id := contract_row.id_perfil_propietario;
    target_role := 'OWNER';
  ELSE
    actor_profile_id := coalesce(actor_profile_id, contract_row.id_perfil_propietario);
    target_profile_id := coalesce(NEW.id_perfil, contract_row.id_perfil_inquilino);
    target_role := 'TENANT';
  END IF;

  PERFORM private.create_notification(
    target_profile_id,
    actor_profile_id,
    'Ticket de mantenimiento actualizado',
    format(
      'El ticket “%s” fue actualizado a %s.%s',
      coalesce(NEW.titulo, 'Mantenimiento'),
      coalesce(NEW.estado, 'un nuevo estado'),
      CASE WHEN nullif(btrim(coalesce(NEW.respuesta_propietario, '')), '') IS NOT NULL
        THEN format(' Respuesta: %s', left(NEW.respuesta_propietario, 500))
        ELSE ''
      END
    ),
    'mantenimiento_actualizado',
    'engineering',
    CASE WHEN target_role = 'OWNER' THEN 'administrador.html#alquiler-activo' ELSE 'tu-alquiler.html#alquiler' END,
    target_role,
    CASE WHEN target_role = 'OWNER' THEN 'TENANT' ELSE 'OWNER' END,
    format(
      'maintenance:update:%s:%s',
      NEW.id_ticket,
      md5(concat_ws('|', NEW.id_estado_ticket, NEW.estado, NEW.respuesta_propietario, NEW.monto_descuento_alquiler))
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.notify_visit_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_profile_id bigint;
  property_label text;
  visit_at text;
BEGIN
  SELECT coalesce(property.id_perfil_propietario, property.id_perfil_captador),
         coalesce(nullif(btrim(concat_ws(' ', property.calle, property.numero)), ''), 'la propiedad')
    INTO owner_profile_id, property_label
    FROM public."Propiedad" AS property
   WHERE property.id_propiedad = NEW.id_propiedad;

  visit_at := to_char(NEW.fecha_evento AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI');

  PERFORM private.create_notification(
    owner_profile_id,
    NEW.id_perfil,
    'Nueva visita programada',
    format('%s programó una visita a %s para el %s.', coalesce(nullif(NEW.nombre_visitante, ''), 'Un interesado'), property_label, visit_at),
    'visita_nueva',
    'calendar_month',
    'administrador.html#visitas',
    'OWNER',
    'TENANT',
    format('visit:new:owner:%s', NEW.id_evento)
  );

  PERFORM private.create_notification(
    NEW.id_perfil,
    owner_profile_id,
    'Visita programada',
    format('Tu visita a %s quedó programada para el %s.', property_label, visit_at),
    'visita_programada',
    'event_available',
    'tu-alquiler.html#visitas',
    'TENANT',
    'OWNER',
    format('visit:new:tenant:%s', NEW.id_evento)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.notify_visit_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_profile_id bigint;
  actor_profile_id bigint;
  target_profile_id bigint;
  target_role text;
  property_label text;
BEGIN
  IF NEW.fecha_evento IS NOT DISTINCT FROM OLD.fecha_evento
     AND NEW.hora_evento IS NOT DISTINCT FROM OLD.hora_evento
     AND NEW.id_estado_evento IS NOT DISTINCT FROM OLD.id_estado_evento THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(property.id_perfil_propietario, property.id_perfil_captador),
         coalesce(nullif(btrim(concat_ws(' ', property.calle, property.numero)), ''), 'la propiedad')
    INTO owner_profile_id, property_label
    FROM public."Propiedad" AS property
   WHERE property.id_propiedad = NEW.id_propiedad;

  actor_profile_id := private.current_profile_id();
  IF actor_profile_id = NEW.id_perfil THEN
    target_profile_id := owner_profile_id;
    target_role := 'OWNER';
  ELSE
    actor_profile_id := coalesce(actor_profile_id, owner_profile_id);
    target_profile_id := NEW.id_perfil;
    target_role := 'TENANT';
  END IF;

  PERFORM private.create_notification(
    target_profile_id,
    actor_profile_id,
    'Visita actualizada',
    format('La visita a %s fue actualizada. Revisá la fecha, el horario y el estado en tu agenda.', property_label),
    'visita_actualizada',
    'edit_calendar',
    CASE WHEN target_role = 'OWNER' THEN 'administrador.html#visitas' ELSE 'tu-alquiler.html#visitas' END,
    target_role,
    CASE WHEN target_role = 'OWNER' THEN 'TENANT' ELSE 'OWNER' END,
    format(
      'visit:update:%s:%s',
      NEW.id_evento,
      md5(concat_ws('|', NEW.fecha_evento, NEW.hora_evento, NEW.id_estado_evento))
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.notify_first_contract_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  contract_row public."Contrato"%ROWTYPE;
  target_profile_id bigint;
  target_role text;
  conversation_key text;
  previous_messages bigint;
BEGIN
  IF upper(coalesce(NEW.remitente_rol, '')) = 'SISTEMA' THEN
    RETURN NEW;
  END IF;

  conversation_key := coalesce(NEW.id_contrato::text, NEW.contract_ref_id);
  IF conversation_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('vivat-chat:' || conversation_key, 0));

  SELECT count(*) INTO previous_messages
    FROM public."Mensaje_Contrato" AS message
   WHERE message.id_mensaje <> NEW.id_mensaje
     AND upper(coalesce(message.remitente_rol, '')) <> 'SISTEMA'
     AND (
       (NEW.id_contrato IS NOT NULL AND message.id_contrato = NEW.id_contrato)
       OR (NEW.id_contrato IS NULL AND message.contract_ref_id = NEW.contract_ref_id)
     );

  IF NEW.id_contrato IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO contract_row
    FROM public."Contrato"
   WHERE id_contrato = NEW.id_contrato;

  IF NEW.id_perfil = contract_row.id_perfil_inquilino THEN
    target_profile_id := contract_row.id_perfil_propietario;
    target_role := 'OWNER';
  ELSE
    target_profile_id := contract_row.id_perfil_inquilino;
    target_role := 'TENANT';
  END IF;

  PERFORM private.create_notification(
    target_profile_id,
    NEW.id_perfil,
    CASE WHEN previous_messages = 0
      THEN format('Primer mensaje de %s', coalesce(nullif(NEW.remitente_nombre, ''), 'otro usuario'))
      ELSE format('Nuevo mensaje de %s', coalesce(nullif(NEW.remitente_nombre, ''), 'otro usuario'))
    END,
    left(coalesce(nullif(NEW.mensaje, ''), 'Tenés una nueva propuesta en el chat del contrato.'), 500),
    CASE WHEN previous_messages = 0 THEN 'primer_mensaje' ELSE 'mensaje_chat' END,
    'forum',
    CASE WHEN target_role = 'OWNER' THEN 'administrador.html#chat-negociacion' ELSE 'tu-alquiler.html#chat-negociacion' END,
    target_role,
    upper(coalesce(NEW.remitente_rol, 'USER')),
    format('contract:message:%s', NEW.id_mensaje)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.notify_contract_signature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  contract_row public."Contrato"%ROWTYPE;
  target_profile_id bigint;
  target_role text;
BEGIN
  IF NOT (
    lower(coalesce(NEW.estado_firma, '')) IN ('sellada', 'completada', 'firmada')
    OR upper(coalesce(NEW.didit_status, '')) = 'APPROVED'
  ) OR (
    TG_OP = 'UPDATE'
    AND (
      lower(coalesce(OLD.estado_firma, '')) IN ('sellada', 'completada', 'firmada')
      OR upper(coalesce(OLD.didit_status, '')) = 'APPROVED'
    )
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO contract_row
    FROM public."Contrato"
   WHERE id_contrato = NEW.id_contrato;

  IF NEW.id_perfil_firmante = contract_row.id_perfil_inquilino THEN
    target_profile_id := contract_row.id_perfil_propietario;
    target_role := 'OWNER';
  ELSE
    target_profile_id := contract_row.id_perfil_inquilino;
    target_role := 'TENANT';
  END IF;

  PERFORM private.create_notification(
    target_profile_id,
    NEW.id_perfil_firmante,
    'Firma de contrato completada',
    format('La contraparte completó su firma del contrato CTR-2026-%s.', lpad(NEW.id_contrato::text, 4, '0')),
    'firma_completada',
    'draw',
    format('contratos.html?contract=CTR-2026-%s&role=%s', lpad(NEW.id_contrato::text, 4, '0'), target_role),
    target_role,
    upper(coalesce(NEW.rol_firmante, 'USER')),
    format('contract:signature:%s:%s', NEW.id_contrato, NEW.id_perfil_firmante)
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.notify_application_created() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notify_application_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notify_punitive_interest_waived() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notify_maintenance_ticket_created() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notify_maintenance_ticket_updated() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notify_visit_created() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notify_visit_updated() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notify_first_contract_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.notify_contract_signature() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS vivat_notify_application_created ON public."Solicitud";
CREATE TRIGGER vivat_notify_application_created
AFTER INSERT ON public."Solicitud"
FOR EACH ROW EXECUTE FUNCTION private.notify_application_created();

DROP TRIGGER IF EXISTS vivat_notify_application_status ON public."Historial_estado_solicitud";
CREATE TRIGGER vivat_notify_application_status
AFTER INSERT ON public."Historial_estado_solicitud"
FOR EACH ROW EXECUTE FUNCTION private.notify_application_status();

DROP TRIGGER IF EXISTS vivat_notify_punitive_interest_waived ON public."Pago";
CREATE TRIGGER vivat_notify_punitive_interest_waived
AFTER UPDATE OF interes_perdonado ON public."Pago"
FOR EACH ROW EXECUTE FUNCTION private.notify_punitive_interest_waived();

DROP TRIGGER IF EXISTS vivat_notify_maintenance_ticket_created ON public."Ticket_mantenimiento";
CREATE TRIGGER vivat_notify_maintenance_ticket_created
AFTER INSERT ON public."Ticket_mantenimiento"
FOR EACH ROW EXECUTE FUNCTION private.notify_maintenance_ticket_created();

DROP TRIGGER IF EXISTS vivat_notify_maintenance_ticket_updated ON public."Ticket_mantenimiento";
CREATE TRIGGER vivat_notify_maintenance_ticket_updated
AFTER UPDATE OF id_estado_ticket, estado, respuesta_propietario, monto_descuento_alquiler
ON public."Ticket_mantenimiento"
FOR EACH ROW EXECUTE FUNCTION private.notify_maintenance_ticket_updated();

DROP TRIGGER IF EXISTS vivat_notify_visit_created ON public."Evento";
CREATE TRIGGER vivat_notify_visit_created
AFTER INSERT ON public."Evento"
FOR EACH ROW EXECUTE FUNCTION private.notify_visit_created();

DROP TRIGGER IF EXISTS vivat_notify_visit_updated ON public."Evento";
CREATE TRIGGER vivat_notify_visit_updated
AFTER UPDATE OF fecha_evento, hora_evento, id_estado_evento ON public."Evento"
FOR EACH ROW EXECUTE FUNCTION private.notify_visit_updated();

DROP TRIGGER IF EXISTS vivat_notify_first_contract_message ON public."Mensaje_Contrato";
CREATE TRIGGER vivat_notify_first_contract_message
AFTER INSERT ON public."Mensaje_Contrato"
FOR EACH ROW EXECUTE FUNCTION private.notify_first_contract_message();

DROP TRIGGER IF EXISTS vivat_notify_contract_signature ON public."Firma_contrato";
CREATE TRIGGER vivat_notify_contract_signature
AFTER INSERT OR UPDATE OF estado_firma, didit_status ON public."Firma_contrato"
FOR EACH ROW EXECUTE FUNCTION private.notify_contract_signature();

CREATE OR REPLACE FUNCTION public.claim_notification_email_batch(
  p_queue_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS SETOF public."Email_notificacion_cola"
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH candidates AS (
    SELECT queue.id_email
      FROM public."Email_notificacion_cola" AS queue
     WHERE (p_queue_id IS NULL OR queue.id_email = p_queue_id)
       AND queue.disponible_desde <= now()
       AND (
         queue.estado = 'pendiente'
         OR (queue.estado = 'procesando' AND queue.bloqueado_en < now() - interval '10 minutes')
       )
       AND queue.intentos < 6
     ORDER BY queue.disponible_desde, queue.creado_en
     LIMIT least(greatest(p_limit, 1), 50)
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public."Email_notificacion_cola" AS queue
     SET estado = 'procesando',
         bloqueado_en = now(),
         intentos = queue.intentos + 1,
         actualizado_en = now()
    FROM candidates
   WHERE queue.id_email = candidates.id_email
  RETURNING queue.*;
$$;

CREATE OR REPLACE FUNCTION public.complete_notification_email(
  p_queue_id uuid,
  p_success boolean,
  p_provider_id text DEFAULT NULL,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public."Email_notificacion_cola" AS queue
     SET estado = CASE
           WHEN p_success THEN 'enviado'
           WHEN queue.intentos >= 6 THEN 'fallido'
           ELSE 'pendiente'
         END,
         enviado_en = CASE WHEN p_success THEN now() ELSE queue.enviado_en END,
         proveedor_id = CASE WHEN p_success THEN left(p_provider_id, 200) ELSE queue.proveedor_id END,
         ultimo_error = CASE WHEN p_success THEN NULL ELSE left(coalesce(p_error, 'Error de envío'), 1000) END,
         disponible_desde = CASE
           WHEN p_success OR queue.intentos >= 6 THEN queue.disponible_desde
           ELSE now() + make_interval(mins => least(60, (power(2, queue.intentos)::integer)))
         END,
         bloqueado_en = NULL,
         actualizado_en = now()
   WHERE queue.id_email = p_queue_id
     AND queue.estado = 'procesando';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_email_batch(uuid, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_notification_email(uuid, boolean, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_email_batch(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_notification_email(uuid, boolean, text, text) TO service_role;

CREATE OR REPLACE FUNCTION private.invoke_notification_email_worker(queue_id uuid DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  project_url text;
  webhook_secret text;
  request_id bigint;
BEGIN
  SELECT decrypted_secret INTO project_url
    FROM vault.decrypted_secrets
   WHERE name = 'notification_email_project_url'
   LIMIT 1;

  SELECT decrypted_secret INTO webhook_secret
    FROM vault.decrypted_secrets
   WHERE name = 'notification_email_webhook_secret'
   LIMIT 1;

  IF nullif(btrim(project_url), '') IS NULL OR nullif(webhook_secret, '') IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-email-secret', webhook_secret
    ),
    body := jsonb_build_object('queue_id', queue_id),
    timeout_milliseconds := 10000
  ) INTO request_id;

  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.dispatch_new_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.disponible_desde <= now() THEN
    PERFORM private.invoke_notification_email_worker(NEW.id_email);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.invoke_notification_email_worker(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.dispatch_new_notification_email()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS vivat_dispatch_new_notification_email ON public."Email_notificacion_cola";
CREATE TRIGGER vivat_dispatch_new_notification_email
AFTER INSERT ON public."Email_notificacion_cola"
FOR EACH ROW EXECUTE FUNCTION private.dispatch_new_notification_email();

CREATE OR REPLACE FUNCTION private.create_rent_due_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  payment record;
BEGIN
  FOR payment IN
    SELECT pay.id_pago,
           pay.periodo,
           pay.fecha_vencimiento,
           contract.id_perfil_inquilino,
           contract.id_perfil_propietario
      FROM public."Pago" AS pay
      JOIN public."Contrato" AS contract ON contract.id_contrato = pay.id_contrato
     WHERE pay.fecha_pago IS NULL
       AND pay.fecha_vencimiento BETWEEN current_date - 1 AND current_date + 5
  LOOP
    IF payment.fecha_vencimiento = current_date + 5 THEN
      PERFORM private.create_notification(
        payment.id_perfil_inquilino,
        payment.id_perfil_propietario,
        'Tu alquiler vence en 5 días',
        format('El pago de %s vence el %s.', coalesce(payment.periodo, 'este período'), to_char(payment.fecha_vencimiento, 'DD/MM/YYYY')),
        'vencimiento_pago',
        'event_upcoming',
        'tu-alquiler.html#alquiler',
        'TENANT',
        'SYSTEM',
        format('payment:due-five-days:%s', payment.id_pago)
      );
    ELSIF payment.fecha_vencimiento = current_date THEN
      PERFORM private.create_notification(
        payment.id_perfil_inquilino,
        payment.id_perfil_propietario,
        'El alquiler vence hoy',
        format('Recordatorio: el pago de %s vence hoy.', coalesce(payment.periodo, 'este período')),
        'vencimiento_pago',
        'today',
        'tu-alquiler.html#alquiler',
        'TENANT',
        'SYSTEM',
        format('payment:due-today:%s', payment.id_pago)
      );
    ELSIF payment.fecha_vencimiento = current_date - 1 THEN
      PERFORM private.create_notification(
        payment.id_perfil_inquilino,
        payment.id_perfil_propietario,
        'Pago de alquiler vencido',
        format('El pago de %s está vencido. Informalo si ya realizaste la transferencia.', coalesce(payment.periodo, 'este período')),
        'pago_vencido',
        'warning',
        'tu-alquiler.html#alquiler',
        'TENANT',
        'SYSTEM',
        format('payment:overdue:tenant:%s', payment.id_pago)
      );
      PERFORM private.create_notification(
        payment.id_perfil_propietario,
        payment.id_perfil_inquilino,
        'Alquiler pendiente de pago',
        format('El pago de %s venció y todavía no fue confirmado.', coalesce(payment.periodo, 'este período')),
        'pago_vencido',
        'warning',
        'administrador.html#alquiler-activo',
        'OWNER',
        'SYSTEM',
        format('payment:overdue:owner:%s', payment.id_pago)
      );
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION private.create_rent_due_notifications()
  FROM PUBLIC, anon, authenticated, service_role;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT jobid INTO existing_job_id FROM cron.job WHERE jobname = 'vivat-notification-email-worker';
    IF existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(existing_job_id);
    END IF;
    PERFORM cron.schedule(
      'vivat-notification-email-worker',
      '* * * * *',
      'SELECT private.invoke_notification_email_worker(NULL);'
    );

    SELECT jobid INTO existing_job_id FROM cron.job WHERE jobname = 'vivat-rent-due-notifications';
    IF existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(existing_job_id);
    END IF;
    PERFORM cron.schedule(
      'vivat-rent-due-notifications',
      '0 12 * * *',
      'SELECT private.create_rent_due_notifications();'
    );
  END IF;
END;
$$;

COMMIT;
