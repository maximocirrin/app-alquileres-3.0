import { parsePositiveInteger } from '../api/_auth.js';

/**
 * This projection is intentionally explicit because the query runs with the
 * service role. Applicant identity is returned only after the publication is
 * constrained to the authenticated owner.
 */
export const OWNER_APPLICATION_SELECT = `
  id_solicitud,
  fecha_solicitud,
  id_perfil,
  ingreso_mensual_declarado,
  mensaje,
  comprobante_ingreso,
  telefono,
  id_publicacion,
  Historial_estado_solicitud (
    id_historial_estado_solicitud,
    id_estado_solicitud,
    fecha_inicio,
    Estado_solicitud (
      id_estado_solicitud,
      nombre
    )
  ),
  Publicacion!inner (
    id_publicacion,
    id_propiedad,
    id_perfil,
    precio,
    descripcion,
    Multimedia (
      url_archivo,
      orden_visualizacion
    ),
    Propiedad (
      id_propiedad,
      id_perfil_propietario,
      id_perfil_captador,
      calle,
      numero,
      piso_dpto,
      expensas_mensuales,
      superficie_cubierta,
      superficie_lote,
      habitaciones_total,
      dormitorios,
      banos_completos
    ),
    Contrato (
      id_contrato,
      id_propiedad,
      id_publicacion,
      id_perfil_inquilino
    )
  ),
  Perfil (
    id_perfil,
    nombre_completo,
    mail,
    telefono,
    dni,
    fecha_nacimiento,
    edad,
    Pasaporte_habitat (
      id_pasaporte,
      codigo_pasaporte,
      cuit,
      razon_social,
      condicion_fiscal,
      situacion_crediticia,
      dni,
      fecha_nacimiento,
      edad,
      ingreso_mensual_declarado
    )
  )
`;

function rows(value) {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
  return value && typeof value === 'object' ? [value] : [];
}

function row(value) {
  return rows(value)[0] || null;
}

function nullableText(value, maxLength = 4_096) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function latestPassport(value) {
  return rows(value).sort((left, right) => (
    (parsePositiveInteger(right.id_pasaporte) || 0) - (parsePositiveInteger(left.id_pasaporte) || 0)
  ))[0] || null;
}

function applicationStatus(value) {
  const history = rows(value).sort((left, right) => {
    const dateDifference = Date.parse(right.fecha_inicio || '') - Date.parse(left.fecha_inicio || '');
    if (Number.isFinite(dateDifference) && dateDifference !== 0) return dateDifference;
    return (parsePositiveInteger(right.id_historial_estado_solicitud) || 0)
      - (parsePositiveInteger(left.id_historial_estado_solicitud) || 0);
  });
  const latest = history[0];
  if (!latest) return 'pendiente';

  const statusId = parsePositiveInteger(latest.id_estado_solicitud);
  const statusName = nullableText(row(latest.Estado_solicitud)?.nombre, 80)?.toLowerCase() || '';
  if (statusId === 2 || ['aceptada', 'aprobada'].includes(statusName)) return 'aceptada';
  if (statusId === 3 || statusName === 'rechazada') return 'rechazada';
  return 'pendiente';
}

function normalizedPhotos(value) {
  return rows(value)
    .map((media) => ({
      url: nullableText(media.url_archivo, 2_048),
      order: nullableNumber(media.orden_visualizacion)
    }))
    .filter((media) => media.url)
    .sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER))
    .map((media) => media.url);
}

function matchingContract(publication, applicantProfileId) {
  return rows(publication?.Contrato).find((contract) => (
    parsePositiveInteger(contract.id_perfil_inquilino) === applicantProfileId
  )) || null;
}

/**
 * Maps a service-role row to the exact browser DTO. No unselected database
 * columns can accidentally be serialized if the schema grows later.
 */
export function normalizeOwnerApplication(application) {
  if (!application || typeof application !== 'object') return null;

  const applicationId = parsePositiveInteger(application.id_solicitud);
  const applicantProfileId = parsePositiveInteger(application.id_perfil);
  const publication = row(application.Publicacion);
  const publicationId = parsePositiveInteger(publication?.id_publicacion)
    || parsePositiveInteger(application.id_publicacion);
  const property = row(publication?.Propiedad);
  if (!applicationId || !applicantProfileId || !publicationId || !publication) return null;

  const applicant = row(application.Perfil);
  const passport = latestPassport(applicant?.Pasaporte_habitat);
  const photos = [...new Set(normalizedPhotos(publication.Multimedia))];
  const contract = matchingContract(publication, applicantProfileId);
  const contractId = parsePositiveInteger(contract?.id_contrato);
  const status = applicationStatus(application.Historial_estado_solicitud);
  const cuit = nullableText(passport?.cuit, 32);
  let dni = nullableText(applicant?.dni, 32) || nullableText(passport?.dni, 32);
  const cleanCuit = cuit?.replace(/\D/g, '') || '';
  if (!dni && cleanCuit.length === 11) dni = cleanCuit.slice(2, -1);

  const propertyId = parsePositiveInteger(property?.id_propiedad)
    || parsePositiveInteger(publication.id_propiedad);
  const contractCode = contractId
    ? `CTR-2026-${String(contractId).padStart(4, '0')}`
    : (status === 'aceptada' ? `CTR-2026-${String(applicationId).padStart(4, '0')}` : null);
  const description = nullableText(publication.descripcion, 8_000);
  const street = nullableText(property?.calle, 300) || 'Dirección';
  const streetNumber = nullableText(property?.numero, 80) || '';
  const applicantName = nullableText(applicant?.nombre_completo, 300)
    || nullableText(passport?.razon_social, 300)
    || 'Postulante Verificado';

  return {
    id: applicationId,
    id_solicitud: applicationId,
    contract_id: contractCode,
    contractId: contractCode,
    property_id: propertyId ? String(propertyId) : '',
    propertyId: propertyId ? String(propertyId) : '',
    id_propiedad: propertyId ? String(propertyId) : '',
    publication_id: publicationId,
    publicationId,
    id_publicacion: publicationId,
    id_perfil_propietario: parsePositiveInteger(property?.id_perfil_propietario)
      || parsePositiveInteger(publication.id_perfil),
    owner_profile_id: parsePositiveInteger(property?.id_perfil_propietario)
      || parsePositiveInteger(publication.id_perfil),
    property_title: description ? description.split(' | Detalles: ')[0] : `Propiedad en ${street} ${streetNumber}`.trim(),
    property_address: `${street} ${streetNumber}`.trim(),
    property_price: nullableNumber(publication.precio),
    property_expenses: nullableNumber(property?.expensas_mensuales),
    property_image: photos[0] || 'img/hero-marketplace.jpg',
    property_photos: photos.length > 0 ? photos : ['img/hero-marketplace.jpg'],
    property_m2: nullableNumber(property?.superficie_cubierta) || nullableNumber(property?.superficie_lote),
    property_rooms: nullableNumber(property?.habitaciones_total),
    property_beds: nullableNumber(property?.dormitorios),
    property_baths: nullableNumber(property?.banos_completos),
    tenant_id: applicantProfileId,
    tenant_name: applicantName,
    tenant_email: nullableText(applicant?.mail, 320) || '',
    tenant_phone: nullableText(application.telefono, 80) || nullableText(applicant?.telefono, 80) || '',
    tenant_dni: dni,
    tenant_cuit: cuit,
    tenant_edad: nullableNumber(applicant?.edad) || nullableNumber(passport?.edad),
    tenant_fecha_nacimiento: nullableText(applicant?.fecha_nacimiento, 100)
      || nullableText(passport?.fecha_nacimiento, 100),
    edad: nullableNumber(applicant?.edad) || nullableNumber(passport?.edad),
    age: nullableNumber(applicant?.edad) || nullableNumber(passport?.edad),
    fecha_nacimiento: nullableText(applicant?.fecha_nacimiento, 100)
      || nullableText(passport?.fecha_nacimiento, 100),
    passport_id: parsePositiveInteger(passport?.id_pasaporte),
    passport_code: nullableText(passport?.codigo_pasaporte, 160),
    condicion_fiscal: nullableText(passport?.condicion_fiscal, 160),
    situacion_crediticia: nullableText(passport?.situacion_crediticia, 160),
    monthly_income: nullableNumber(application.ingreso_mensual_declarado)
      || nullableNumber(passport?.ingreso_mensual_declarado)
      || 0,
    income_proof: nullableText(application.comprobante_ingreso, 1_000) || 'Pasaporte Vivat',
    income_proof_url: '#',
    message: nullableText(application.mensaje, 4_000) || 'Interesado en alquilar la propiedad.',
    status,
    created_at: nullableText(application.fecha_solicitud, 100)
  };
}

/**
 * The ownership predicate is part of the database query because this client
 * bypasses RLS. A caller can only receive applicants to their publications.
 */
export async function getOwnerApplicationsForProfile(supabase, profileId) {
  const ownerProfileId = parsePositiveInteger(profileId);
  if (!ownerProfileId) return [];

  const query = supabase
    .from('Solicitud')
    .select(OWNER_APPLICATION_SELECT)
    .eq('Publicacion.id_perfil', ownerProfileId)
    .order('fecha_solicitud', { ascending: false });
  if (typeof query.retry === 'function') query.retry(false);
  const { data, error } = await query;

  if (error) throw error;
  return rows(data).map(normalizeOwnerApplication).filter(Boolean);
}
