-- Owner applicant lists filter by publication and sort by newest first.
-- These indexes also cover the tenant's own application lookup used by RLS.
CREATE INDEX IF NOT EXISTS solicitud_publicacion_reciente_idx
  ON public."Solicitud" (id_publicacion, fecha_solicitud DESC);

CREATE INDEX IF NOT EXISTS solicitud_perfil_reciente_idx
  ON public."Solicitud" (id_perfil, fecha_solicitud DESC);
