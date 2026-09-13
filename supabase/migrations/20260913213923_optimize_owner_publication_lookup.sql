-- Owner listings are filtered by author and displayed newest first.
CREATE INDEX IF NOT EXISTS publicacion_perfil_reciente_idx
  ON public."Publicacion" (id_perfil, created_at DESC);

-- Several owner views also resolve inventory by the property's owner/capturer.
CREATE INDEX IF NOT EXISTS propiedad_propietario_reciente_idx
  ON public."Propiedad" (id_perfil_propietario, created_at DESC);

CREATE INDEX IF NOT EXISTS propiedad_captador_reciente_idx
  ON public."Propiedad" (id_perfil_captador, created_at DESC);
