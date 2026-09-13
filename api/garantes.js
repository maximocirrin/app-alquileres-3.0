import crypto from 'crypto';
import {
  consumeRateLimit,
  getAuthenticatedUser,
  getSupabaseAdmin,
  parsePositiveInteger,
  readJsonBody,
  requireProfile,
  sendForbidden,
  sendInternalError,
  sendOriginForbidden,
  sendRateLimited,
  sendUnauthorized,
  setCorsHeaders
} from './_auth.js';

const INVITATION_TOKEN = /^[A-Za-z0-9_-]{32,256}$/;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 6;
const DOCUMENT_TYPES = new Map([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png']
]);

function cleanText(value, maxLength, { required = false } = {}) {
  if (value === null || value === undefined) return required ? null : null;
  const clean = String(value).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!clean || clean.length > maxLength) return null;
  return clean;
}

function safeFileName(value, extension) {
  const base = String(value || 'documento')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._ -]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .slice(0, 140) || 'documento';
  return base.toLowerCase().endsWith(`.${extension}`) ? base : `${base}.${extension}`;
}

function parseToken(value) {
  return typeof value === 'string' && INVITATION_TOKEN.test(value) ? value : null;
}

function tokenDigest(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function documentKind(guaranteeType, index) {
  if (Number(guaranteeType) === 1) return ['escritura', 'dni_titular', 'impuesto_inmobiliario'][index] || 'documento_propietario';
  if (Number(guaranteeType) === 2) return 'poliza_caucion';
  return 'recibo_sueldo';
}

function guaranteeData(type, value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const fields = Number(type) === 1
    ? [['provincia', 80], ['direccion_inmueble', 240], ['matricula_registro', 120], ['titularidad_porcentaje', 30]]
    : Number(type) === 2
      ? [['aseguradora_nombre', 160], ['numero_poliza', 120], ['monto_cobertura', 120]]
      : [['empleador_nombre', 160], ['empleador_cuit', 32], ['antiguedad_meses', 60], ['ingreso_neto_mensual', 32]];

  const result = {};
  for (const [key, maxLength] of fields) {
    const clean = cleanText(source[key], maxLength);
    if (!clean) return null;
    result[key] = clean;
  }

  if (result.empleador_cuit && !/^[0-9-]{7,16}$/.test(result.empleador_cuit)) return null;
  if (result.ingreso_neto_mensual) {
    const amount = Number(result.ingreso_neto_mensual.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000_000) return null;
  }
  return result;
}

async function findInvitation(supabase, token) {
  const { data, error } = await supabase
    .from('Garante')
    .select('id_garante, id_tipo_garantia, id_estado_garante, kyc_verificado, nombre_completo, relacion_inquilino, token_expires_at, token_used_at')
    .eq('token_hash', tokenDigest(token))
    .is('token_used_at', null)
    .gt('token_expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function countDocuments(supabase, guarantorId) {
  const { count, error } = await supabase
    .from('Documento_garante')
    .select('id_documento', { count: 'exact', head: true })
    .eq('id_garante', guarantorId);
  if (error) throw error;
  return Number(count || 0);
}

function viewModel(invitation, documentCount) {
  return {
    id_tipo_garantia: Number(invitation.id_tipo_garantia || 3),
    id_estado_garante: Number(invitation.id_estado_garante || 1),
    kyc_verificado: invitation.kyc_verificado === true,
    nombre_completo: cleanText(invitation.nombre_completo, 240) || 'Garante',
    relacion_inquilino: cleanText(invitation.relacion_inquilino, 120) || 'Codeudor solidario',
    documentos_count: documentCount
  };
}

async function issueUpload(supabase, invitation, body) {
  if (invitation.kyc_verificado !== true || Number(invitation.id_estado_garante) !== 4) {
    const error = new Error('La identidad debe estar validada antes de cargar documentos.');
    error.statusCode = 409;
    throw error;
  }

  const contentType = String(body.contentType || '').toLowerCase().split(';')[0].trim();
  const extension = DOCUMENT_TYPES.get(contentType);
  const size = Number(body.size);
  if (!extension || !Number.isSafeInteger(size) || size < 1 || size > MAX_FILE_BYTES) {
    const error = new Error('El archivo no cumple los requisitos de tipo o tamaño.');
    error.statusCode = 400;
    throw error;
  }

  const path = `garante_${invitation.id_garante}/documentos/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage
    .from('contratos_firmados')
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data?.path || !data?.token) throw error || new Error('No se pudo crear la autorización de carga.');

  return { path: data.path, token: data.token, contentType, expiresInSeconds: 7200 };
}

async function submittedDocuments(supabase, invitation, rawFiles) {
  if (!Array.isArray(rawFiles) || rawFiles.length < 1 || rawFiles.length > MAX_FILES) {
    const error = new Error('Debe adjuntar entre uno y seis documentos.');
    error.statusCode = 400;
    throw error;
  }

  const prefix = `garante_${invitation.id_garante}/documentos`;
  const { data: stored, error: listError } = await supabase.storage.from('contratos_firmados').list(prefix, { limit: MAX_FILES + 4 });
  if (listError) throw listError;
  const byName = new Map((stored || []).map((item) => [item.name, item]));
  const used = new Set();

  return rawFiles.map((raw, index) => {
    const contentType = String(raw?.contentType || '').toLowerCase().split(';')[0].trim();
    const extension = DOCUMENT_TYPES.get(contentType);
    const path = String(raw?.path || '');
    const size = Number(raw?.size);
    const expected = new RegExp(`^${prefix}/[0-9a-f-]{36}\\.${extension || 'invalid'}$`);
    if (!extension || !expected.test(path) || used.has(path) || !Number.isSafeInteger(size) || size < 1 || size > MAX_FILE_BYTES) {
      const error = new Error('Uno de los documentos cargados no es válido.');
      error.statusCode = 400;
      throw error;
    }
    const object = byName.get(path.slice(prefix.length + 1));
    const objectSize = Number(object?.metadata?.size ?? object?.metadata?.contentLength ?? 0);
    const objectType = String(object?.metadata?.mimetype || object?.metadata?.contentType || '').toLowerCase();
    if (!object || (Number.isFinite(objectSize) && objectSize > 0 && objectSize !== size) || (objectType && objectType !== contentType)) {
      const error = new Error('No se pudo verificar uno de los documentos cargados.');
      error.statusCode = 400;
      throw error;
    }
    used.add(path);
    return {
      id_garante: invitation.id_garante,
      tipo_documento: documentKind(invitation.id_tipo_garantia, index),
      archivo_url: path,
      nombre_archivo: safeFileName(raw?.name, extension),
      tamano_bytes: size,
      estado_documento: 'PENDIENTE'
    };
  });
}

async function handlePortalRequest(req, res, body) {
  try {
    const token = parseToken(body.token);
    if (!token) return sendForbidden(res, 'El enlace de garantía no es válido.');

    const supabase = getSupabaseAdmin();
    const invitation = await findInvitation(supabase, token);
    if (!invitation) return sendForbidden(res, 'El enlace de garantía no es válido.');

    const action = String(body.action || '').toLowerCase();
    if (action === 'view') {
      const documentCount = await countDocuments(supabase, invitation.id_garante);
      return res.status(200).json({ ok: true, data: viewModel(invitation, documentCount) });
    }

    if (action === 'upload') {
      if (!await consumeRateLimit(supabase, 'guarantor-document-upload', invitation.id_garante, 20, 60 * 60)) {
        return sendRateLimited(res);
      }
      const data = await issueUpload(supabase, invitation, body);
      return res.status(201).json({ ok: true, data });
    }

    if (action === 'submit') {
      if (invitation.kyc_verificado !== true || Number(invitation.id_estado_garante) !== 4) {
        return res.status(409).json({ ok: false, error: 'KYC Required', message: 'La identidad debe estar validada antes de enviar la garantía.' });
      }
      if (body.consent !== true) return res.status(400).json({ ok: false, error: 'Consent Required' });
      const data = guaranteeData(invitation.id_tipo_garantia, body.datosGarantia);
      if (!data) return res.status(400).json({ ok: false, error: 'Invalid guarantee data.' });
      const documents = await submittedDocuments(supabase, invitation, body.files);

      const timestamp = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from('Garante')
        .update({
          id_estado_garante: 5,
          token_used_at: timestamp,
          datos_garantia: {
            ...data,
            consentimiento_aceptado_en: timestamp
          },
          updated_at: timestamp
        })
        .eq('id_garante', invitation.id_garante)
        .eq('token_hash', tokenDigest(token))
        .is('token_used_at', null)
        .eq('id_estado_garante', 4)
        .eq('kyc_verificado', true)
        .select('id_garante');
      if (updateError) throw updateError;
      if (!Array.isArray(updated) || updated.length !== 1) {
        return res.status(409).json({ ok: false, error: 'Invitation state changed. Please reload the page.' });
      }

      const { error: documentsError } = await supabase.from('Documento_garante').insert(documents);
      if (documentsError) {
        await supabase
          .from('Garante')
          .update({ id_estado_garante: 4, token_used_at: null, updated_at: new Date().toISOString() })
          .eq('id_garante', invitation.id_garante)
          .eq('token_hash', tokenDigest(token))
          .eq('id_estado_garante', 5);
        throw documentsError;
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Unsupported portal action.' });
  } catch (error) {
    if (error?.statusCode) return res.status(error.statusCode).json({ ok: false, error: error.message });
    return sendInternalError(res, 'garante-portal', error);
  }
}

async function passportForProfile(supabase, profileId) {
  const { data, error } = await supabase
    .from('Pasaporte_vivat')
    .select('id_pasaporte, id_perfil')
    .eq('id_perfil', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/** Unified guarantor router: handles both tenant management and public portal actions. */
export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const body = await readJsonBody(req);

    // If request contains an invitation token or target is portal, route to public portal handler
    const isPortal = Boolean(body?.token) || req.query?.portal === '1' || (req.url && req.url.includes('garante-portal'));
    if (isPortal) {
      return handlePortalRequest(req, res, body);
    }

    // Otherwise require tenant authentication
    const { user, profile, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) return sendUnauthorized(res);
    if (!requireProfile(profile)) return sendForbidden(res, 'No se encontró un perfil válido para esta cuenta.');

    const action = String(body.action || '').toLowerCase();
    const supabase = getSupabaseAdmin();
    const passport = await passportForProfile(supabase, profile.id_perfil);
    if (!passport) return res.status(409).json({ ok: false, error: 'No passport found for this account.' });

    if (action === 'invite') {
      if (!await consumeRateLimit(supabase, 'guarantor-invite', profile.id_perfil, 10, 24 * 60 * 60)) {
        return sendRateLimited(res);
      }
      const guaranteeType = Number(body.id_tipo_garantia || body.idTipoGarantia || 3);
      if (![1, 2, 3].includes(guaranteeType)) {
        return res.status(400).json({ ok: false, error: 'Invalid guarantee type.' });
      }
      const name = cleanText(body.nombre_completo || body.nombre || body.alias, 240) ||
        (guaranteeType === 1 ? 'Garante propietario (pendiente de KYC)' : 'Garante (pendiente de KYC)');
      const email = cleanText(body.email, 320);
      const phone = cleanText(body.telefono, 64);
      const relation = cleanText(body.relacion_inquilino || body.relacion, 120) || 'Familiar directo';
      if (!email && !phone) return res.status(400).json({ ok: false, error: 'Email or phone is required.' });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'Invalid email.' });

      const rawToken = crypto.randomBytes(32).toString('base64url');
      const { data, error } = await supabase
        .from('Garante')
        .insert({
          id_pasaporte: passport.id_pasaporte,
          id_tipo_garantia: guaranteeType,
          id_estado_garante: 2,
          nombre_completo: name,
          email: email || null,
          telefono: phone || null,
          relacion_inquilino: relation,
          token_invitacion: `redacted_${crypto.randomBytes(16).toString('hex')}`,
          token_hash: tokenDigest(rawToken),
          token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          kyc_verificado: false
        })
        .select('id_garante, id_tipo_garantia, nombre_completo, email, telefono, relacion_inquilino, id_estado_garante, kyc_verificado, created_at, token_expires_at')
        .single();
      if (error) throw error;

      return res.status(201).json({ ok: true, data: { ...data, token_invitacion: rawToken } });
    }

    if (action === 'cancel') {
      const guarantorId = parsePositiveInteger(body.id_garante || body.idGarante);
      if (!guarantorId) return res.status(400).json({ ok: false, error: 'Invalid guarantor id.' });
      const { data: guarantor, error: lookupError } = await supabase
        .from('Garante')
        .select('id_garante, id_pasaporte, id_estado_garante')
        .eq('id_garante', guarantorId)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!guarantor || Number(guarantor.id_pasaporte) !== Number(passport.id_pasaporte)) {
        return sendForbidden(res, 'No puedes cancelar esta garantía.');
      }
      if (Number(guarantor.id_estado_garante) > 2) {
        return res.status(409).json({ ok: false, error: 'Only pending invitations can be cancelled.' });
      }
      const { error } = await supabase
        .from('Garante')
        .delete()
        .eq('id_garante', guarantorId)
        .eq('id_pasaporte', passport.id_pasaporte)
        .in('id_estado_garante', [1, 2]);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: 'Unsupported guarantor action.' });
  } catch (error) {
    return sendInternalError(res, 'garantes', error);
  }
}
