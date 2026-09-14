import { prepareContractDocument } from './documento.js';
import { readContractForSigning, uploadImmutable } from './integrity.js';
import { consumeRateLimit, getAuthenticatedUser, getContractForProfile, getSupabaseAdmin,
  parsePositiveInteger, readJsonBody, requireProfile, sendForbidden, sendInternalError,
  sendOriginForbidden, sendRateLimited, sendUnauthorized, setCorsHeaders } from '../../api/_auth.js';

export default async function previsualizarHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  try {
    const { user, profile, error } = await getAuthenticatedUser(req);
    if (error || !user) return sendUnauthorized(res);
    if (!requireProfile(profile)) return sendForbidden(res);
    const body = await readJsonBody(req);
    const id = parsePositiveInteger(body.id_contrato);
    if (!id) return res.status(400).json({ ok: false, message: 'Contrato inválido.' });
    const supabase = getSupabaseAdmin();
    const { contract, role, error: accessError } = await getContractForProfile(supabase, id, profile.id_perfil);
    if (accessError) throw accessError;
    if (!contract || !role) return sendForbidden(res);
    if (!await consumeRateLimit(supabase, 'signature-preview', `${profile.id_perfil}:${id}`, 20, 3600)) return sendRateLimited(res);
    const document = await prepareContractDocument(supabase, await readContractForSigning(supabase, id));
    await uploadImmutable(supabase, document.path, document.bytes);
    const { data, error: urlError } = await supabase.storage.from('contratos_firmados').createSignedUrl(document.path, 600);
    if (urlError || !data?.signedUrl) throw urlError || new Error('Preview unavailable.');
    return res.status(200).json({ ok: true, data: { url: data.signedUrl, hash: document.hash, revision: document.revision } });
  } catch (error) {
    if (error.code === 'CONTRACT_INCOMPLETE') return res.status(422).json({ ok: false, message: error.message });
    return sendInternalError(res, 'firmas/previsualizar', error);
  }
}
