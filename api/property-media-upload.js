import crypto from 'crypto';
import {
  getAuthenticatedUser,
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

const IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp']
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Issues a single signed upload capability for an owner-owned listing image. */
export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) return sendUnauthorized(res);
    if (!requireProfile(profile)) return sendForbidden(res, 'No se encontró un perfil válido para esta cuenta.');

    const body = await readJsonBody(req);
    const publicationId = parsePositiveInteger(body.id_publicacion || body.idPublicacion);
    const contentType = String(body.contentType || '').toLowerCase().split(';')[0].trim();
    const size = Number(body.size);
    const extension = IMAGE_TYPES.get(contentType);
    if (!publicationId || !extension || !Number.isSafeInteger(size) || size < 1 || size > MAX_IMAGE_BYTES) {
      return res.status(400).json({ ok: false, error: 'Invalid property image request.' });
    }

    const supabase = getSupabaseAdmin();
    const { data: publication, error: publicationError } = await supabase
      .from('Publicacion')
      .select('id_publicacion, id_perfil')
      .eq('id_publicacion', publicationId)
      .maybeSingle();
    if (publicationError) throw publicationError;
    if (!publication) return res.status(404).json({ ok: false, error: 'Not Found' });
    if (Number(publication.id_perfil) !== Number(profile.id_perfil)) {
      return sendForbidden(res, 'No eres propietario de esta publicación.');
    }

    const path = `prop-${publicationId}/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await supabase.storage
      .from('propiedades_multimedia')
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !data?.path || !data?.token) throw error || new Error('Upload capability could not be created.');

    return res.status(201).json({
      ok: true,
      data: { path: data.path, token: data.token, contentType, expiresInSeconds: 7200 }
    });
  } catch (error) {
    return sendInternalError(res, 'property-media-upload', error);
  }
}
