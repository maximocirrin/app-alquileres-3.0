import { getAuthenticatedUser, getSupabaseAdmin, requireProfile, sendUnauthorized, sendForbidden, sendInternalError } from '../../api/_auth.js';

// A contract-scoped DTO exposes only the identity fields that its parties need.
// Perfil RLS remains restricted to the account itself.
export async function getContractParties(supabase, profileId) {
  const { data: contracts, error } = await supabase.from('Contrato')
    .select('id_contrato, id_perfil_inquilino, id_perfil_propietario')
    .or(`id_perfil_inquilino.eq.${Number(profileId)},id_perfil_propietario.eq.${Number(profileId)}`);
  if (error) throw error;
  const ids = [...new Set((contracts || []).flatMap(c => [c.id_perfil_inquilino, c.id_perfil_propietario]).filter(Boolean))];
  if (!ids.length) return [];
  const { data: profiles, error: profileError } = await supabase.from('Perfil')
    .select('id_perfil, nombre_completo, dni, mail, telefono, cuenta_verificada').in('id_perfil', ids);
  if (profileError) throw profileError;
  const byId = new Map((profiles || []).map(p => [Number(p.id_perfil), p]));
  return contracts.map(c => ({ id_contrato: c.id_contrato,
    tenant: byId.get(Number(c.id_perfil_inquilino)) || null,
    owner: byId.get(Number(c.id_perfil_propietario)) || null }));
}

export default async function partesHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  try {
    const { user, profile, error } = await getAuthenticatedUser(req);
    if (error || !user) return sendUnauthorized(res);
    if (!requireProfile(profile)) return sendForbidden(res);
    return res.status(200).json({ ok: true, data: await getContractParties(getSupabaseAdmin(), profile.id_perfil) });
  } catch (error) { return sendInternalError(res, 'firmas/partes', error); }
}
