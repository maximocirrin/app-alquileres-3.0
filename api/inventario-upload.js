import crypto from 'crypto';
import {
  getAuthenticatedUser,
  getContractForProfile,
  getSupabaseAdmin,
  parsePositiveInteger,
  readJsonBody,
  requireProfile,
  sendForbidden,
  sendInternalError,
  sendOriginForbidden,
  sendUnauthorized,
  setCorsHeaders
} from './_auth.js';

const MEDIA = {
  photo: {
    maxBytes: 8 * 1024 * 1024,
    types: new Map([
      ['image/jpeg', 'jpg'],
      ['image/png', 'png'],
      ['image/webp', 'webp']
    ])
  },
  video: {
    maxBytes: 100 * 1024 * 1024,
    types: new Map([
      ['video/mp4', 'mp4'],
      ['video/webm', 'webm']
    ])
  }
};

/** Issues one short-lived, contract-scoped Storage upload capability. */
export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) return sendUnauthorized(res);
    if (!requireProfile(profile)) return sendForbidden(res, 'No se encontró un perfil válido para esta cuenta.');

    const body = await readJsonBody(req);
    const contractId = parsePositiveInteger(body.id_contrato || body.idContrato);
    const kind = String(body.kind || '').toLowerCase();
    const contentType = String(body.contentType || '').toLowerCase().split(';')[0].trim();
    const declaredSize = Number(body.size);
    const rules = MEDIA[kind];
    if (!contractId || !rules || !rules.types.has(contentType) || !Number.isSafeInteger(declaredSize) || declaredSize < 1 || declaredSize > rules.maxBytes) {
      return res.status(400).json({ ok: false, error: 'Invalid inventory media request.' });
    }

    const supabase = getSupabaseAdmin();
    const { contract, role, error: contractError } = await getContractForProfile(supabase, contractId, profile.id_perfil);
    if (contractError) throw contractError;
    if (!contract) return res.status(404).json({ ok: false, error: 'Not Found' });
    if (!role) return sendForbidden(res, 'No eres parte de este contrato.');

    const extension = rules.types.get(contentType);
    const path = `contrato_${contractId}/inventario/${kind}_${crypto.randomUUID()}.${extension}`;
    const { data, error } = await supabase.storage
      .from('contratos_firmados')
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !data?.token || !data?.path) throw error || new Error('Upload capability could not be created.');

    return res.status(201).json({
      ok: true,
      data: { path: data.path, token: data.token, contentType, expiresInSeconds: 7_200 }
    });
  } catch (error) {
    return sendInternalError(res, 'inventario-upload', error);
  }
}
