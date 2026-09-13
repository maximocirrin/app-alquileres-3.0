import { parsePositiveInteger } from '../api/_auth.js';

/**
 * Keep this projection deliberately small. This route runs with the service
 * role, so selecting `*` from Perfil, Contrato, or related tables would turn
 * an otherwise authorized dashboard request into an unnecessary data leak.
 *
 * Publicacion is reached through Propiedad because that relationship is used
 * by the deployed schema. A property can have more than one publication, so
 * the response mapper selects the one referenced by the contract.
 */
export const OWNER_CONTRACT_SELECT = `
  id_contrato,
  id_propiedad,
  id_publicacion,
  id_perfil_inquilino,
  id_perfil_propietario,
  fecha_inicio_contrato,
  fecha_fin_contrato,
  fecha_firma_contrato,
  monto_cierre,
  monto_deposito,
  deposito_devuelto,
  id_moneda,
  id_Indice,
  periodo_aumento_meses,
  dia_vencimiento_mensual,
  tasa_punitoria_diaria,
  alias_cbu,
  url_contrato_original_pdf,
  url_contrato_final_pdf,
  hash_original_sha256,
  hash_final_sha256,
  Propiedad (
    calle,
    numero,
    piso_dpto,
    expensas_mensuales,
    Publicacion (
      id_publicacion,
      descripcion,
      precio,
      Multimedia (
        url_archivo,
        orden_visualizacion
      )
    )
  ),
  Inquilino:Perfil!id_perfil_inquilino (
    id_perfil,
    nombre_completo,
    mail,
    telefono
  ),
  Firma_contrato (
    rol_firmante,
    estado_firma,
    didit_status
  ),
  Historial_Estado_Contrato (
    id_historial_contrato,
    id_estado_contrato,
    fecha_inicio
  )
`;

function rows(value) {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
  return value && typeof value === 'object' ? [value] : [];
}

function row(value) {
  return rows(value)[0] || null;
}

function nullableId(value) {
  return parsePositiveInteger(value);
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

function nullableBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function matchingPublication(property, publicationId) {
  const publications = rows(property?.Publicacion);
  if (publications.length === 0) return null;

  if (publicationId) {
    const matching = publications.find((publication) => nullableId(publication.id_publicacion) === publicationId);
    // A one-to-one relationship can be returned without its id in legacy
    // rows. Do not guess from the first row when there are multiple options.
    return matching || (publications.length === 1 ? publications[0] : null);
  }

  return publications[0];
}

function normalizeMedia(value) {
  return rows(value)
    .map((media) => ({
      url_archivo: nullableText(media.url_archivo),
      orden_visualizacion: nullableNumber(media.orden_visualizacion)
    }))
    .filter((media) => media.url_archivo)
    .sort((left, right) => {
      const leftOrder = left.orden_visualizacion ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.orden_visualizacion ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
}

function normalizeSignatures(value) {
  return rows(value).map((signature) => ({
    rol_firmante: nullableText(signature.rol_firmante, 80),
    estado_firma: nullableText(signature.estado_firma, 80),
    didit_status: nullableText(signature.didit_status, 80)
  }));
}

function normalizeHistory(value) {
  return rows(value)
    .map((history) => ({
      id_historial_contrato: nullableId(history.id_historial_contrato),
      id_estado_contrato: nullableId(history.id_estado_contrato),
      fecha_inicio: nullableText(history.fecha_inicio, 100)
    }))
    .sort((left, right) => (right.id_historial_contrato || 0) - (left.id_historial_contrato || 0));
}

/**
 * Maps a database row to the exact owner-dashboard DTO. Besides keeping the
 * browser independent from the database relation names, this is a second
 * guard against accidentally returning columns added to a selected relation.
 */
export function normalizeOwnerContract(contract) {
  if (!contract || typeof contract !== 'object') return null;

  const idContrato = nullableId(contract.id_contrato);
  if (!idContrato) return null;

  const property = row(contract.Propiedad);
  const requestedPublicationId = nullableId(contract.id_publicacion);
  const publicationRow = matchingPublication(property, requestedPublicationId);
  const publicationId = requestedPublicationId || nullableId(publicationRow?.id_publicacion);
  const multimedia = normalizeMedia(publicationRow?.Multimedia);
  const photos = [...new Set(multimedia.map((media) => media.url_archivo))];
  const tenant = row(contract.Inquilino);
  const signatures = normalizeSignatures(contract.Firma_contrato);

  return {
    id_contrato: idContrato,
    id_propiedad: nullableId(contract.id_propiedad),
    id_publicacion: publicationId,
    id_perfil_inquilino: nullableId(contract.id_perfil_inquilino),
    id_perfil_propietario: nullableId(contract.id_perfil_propietario),
    fecha_inicio_contrato: nullableText(contract.fecha_inicio_contrato, 100),
    fecha_fin_contrato: nullableText(contract.fecha_fin_contrato, 100),
    fecha_firma_contrato: nullableText(contract.fecha_firma_contrato, 100),
    monto_cierre: nullableNumber(contract.monto_cierre),
    monto_deposito: nullableNumber(contract.monto_deposito),
    deposito_devuelto: nullableBoolean(contract.deposito_devuelto),
    id_moneda: nullableId(contract.id_moneda),
    id_Indice: nullableId(contract.id_Indice),
    periodo_aumento_meses: nullableNumber(contract.periodo_aumento_meses),
    dia_vencimiento_mensual: nullableNumber(contract.dia_vencimiento_mensual),
    tasa_punitoria_diaria: nullableNumber(contract.tasa_punitoria_diaria),
    // This is a payment alias, not a full CBU. It is deliberately returned
    // only after the server has constrained the contract to its owner.
    alias_cbu: nullableText(contract.alias_cbu, 160),
    has_contract: Boolean(
      contract.url_contrato_original_pdf ||
      contract.url_contrato_final_pdf ||
      contract.hash_original_sha256 ||
      contract.hash_final_sha256 ||
      signatures.length
    ),
    property_image: photos[0] || null,
    photos,
    property: {
      calle: nullableText(property?.calle, 300),
      numero: nullableText(property?.numero, 80) ?? nullableNumber(property?.numero),
      piso_dpto: nullableText(property?.piso_dpto, 80),
      expensas_mensuales: nullableNumber(property?.expensas_mensuales)
    },
    publication: {
      id_publicacion: publicationId,
      descripcion: nullableText(publicationRow?.descripcion, 8_000),
      precio: nullableNumber(publicationRow?.precio),
      Multimedia: multimedia
    },
    tenant: {
      id_perfil: nullableId(tenant?.id_perfil) || nullableId(contract.id_perfil_inquilino),
      nombre_completo: nullableText(tenant?.nombre_completo, 300),
      mail: nullableText(tenant?.mail, 320),
      telefono: nullableText(tenant?.telefono, 80)
    },
    signatures,
    history: normalizeHistory(contract.Historial_Estado_Contrato)
  };
}

/**
 * The ownership predicate is intentionally part of the database query, not a
 * post-query JavaScript filter: this client has service-role privileges.
 */
export async function getOwnerContractsForProfile(supabase, profileId) {
  const ownerProfileId = nullableId(profileId);
  if (!ownerProfileId) return [];

  const { data, error } = await supabase
    .from('Contrato')
    .select(OWNER_CONTRACT_SELECT)
    .eq('id_perfil_propietario', ownerProfileId)
    .order('id_contrato', { ascending: false });

  if (error) throw error;
  return rows(data).map(normalizeOwnerContract).filter(Boolean);
}
