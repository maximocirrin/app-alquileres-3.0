-- Authentication resolves one application profile from auth.users. Enforce
-- that invariant and make the lookup index-backed.
CREATE UNIQUE INDEX IF NOT EXISTS perfil_user_id_uidx
  ON public."Perfil" (user_id)
  WHERE user_id IS NOT NULL;

-- Owner/tenant dashboards always filter contracts by participant and render
-- newest contracts first.
CREATE INDEX IF NOT EXISTS contrato_propietario_reciente_idx
  ON public."Contrato" (id_perfil_propietario, id_contrato DESC);

CREATE INDEX IF NOT EXISTS contrato_inquilino_reciente_idx
  ON public."Contrato" (id_perfil_inquilino, id_contrato DESC);

-- Batch payment and maintenance summaries by contract.
CREATE INDEX IF NOT EXISTS pago_contrato_reciente_idx
  ON public."Pago" (id_contrato, id_pago DESC);

CREATE INDEX IF NOT EXISTS ticket_mantenimiento_contrato_estado_idx
  ON public."Ticket_mantenimiento" (id_contrato, id_estado_ticket);

-- Reverse relations frequently embedded by the rental dashboards.
CREATE INDEX IF NOT EXISTS firma_contrato_contrato_idx
  ON public."Firma_contrato" (id_contrato);

CREATE INDEX IF NOT EXISTS historial_estado_contrato_reciente_idx
  ON public."Historial_Estado_Contrato" (id_contrato, id_historial_contrato DESC);

CREATE INDEX IF NOT EXISTS publicacion_propiedad_idx
  ON public."Publicacion" (id_propiedad);

CREATE INDEX IF NOT EXISTS multimedia_publicacion_idx
  ON public."Multimedia" (id_publicacion);

CREATE INDEX IF NOT EXISTS propiedad_caracteristica_propiedad_idx
  ON public."Propiedad_caracteristica" (id_propiedad);
