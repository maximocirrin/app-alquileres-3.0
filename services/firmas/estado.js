import {
  getAuthenticatedUser,
  getContractForProfile,
  getSupabaseAdmin,
  parsePositiveInteger,
  requireProfile,
  sendForbidden,
  sendInternalError,
  sendOriginForbidden,
  sendUnauthorized,
  setCorsHeaders
} from '../../api/_auth.js';

/** Returns only the authenticated signer's server-authoritative signature state. */
export default async function estadoHandler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) return sendUnauthorized(res);
    if (!requireProfile(profile)) return sendForbidden(res, 'No se encontró un perfil válido para esta cuenta.');

    const signatureId = parsePositiveInteger(req.query?.id_firma || req.query?.idFirma);
    if (!signatureId) return res.status(400).json({ ok: false, error: 'Invalid signature id.' });

    const supabase = getSupabaseAdmin();
    const { data: signature, error } = await supabase
      .from('Firma_contrato')
      .select('id_firma, id_contrato, id_perfil_firmante, rol_firmante, estado_firma, didit_status, fecha_firma')
      .eq('id_firma', signatureId)
      .maybeSingle();
    if (error) throw error;
    if (!signature) return res.status(404).json({ ok: false, error: 'Not Found' });

    const { contract, role, error: contractError } = await getContractForProfile(supabase, signature.id_contrato, profile.id_perfil);
    if (contractError) throw contractError;
    if (!contract || !role || Number(signature.id_perfil_firmante) !== Number(profile.id_perfil)) {
      return sendForbidden(res, 'No puedes consultar esta firma.');
    }

    return res.status(200).json({
      ok: true,
      data: {
        id_firma: signature.id_firma,
        id_contrato: signature.id_contrato,
        estado_firma: signature.estado_firma,
        didit_status: signature.didit_status,
        fecha_firma: signature.fecha_firma || null,
        canSeal: signature.estado_firma === 'biometria_aprobada' && ['APPROVED', 'SUCCESS', 'PASSED'].includes(String(signature.didit_status || '').toUpperCase())
      }
    });
  } catch (error) {
    return sendInternalError(res, 'firmas/estado', error);
  }
}
