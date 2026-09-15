import { publicEvidenceKeys, EVIDENCE_NOTICE } from './evidence.js';
import { getSigningContract, canAccessGuarantee } from './participants.js';
import { getAuthenticatedUser, getSupabaseAdmin, parsePositiveInteger, requireProfile,
  sendForbidden, sendInternalError, sendUnauthorized } from '../../api/_auth.js';

export default async function evidenciasHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  try {
    if (String(req.query?.action) === 'claves' || req.url?.split('?')[0].endsWith('/claves')) {
      return res.status(200).json({ ok: true, data: { notice: EVIDENCE_NOTICE, keys: publicEvidenceKeys() } });
    }
    const { user, profile, error } = await getAuthenticatedUser(req);
    if (error || !user) return sendUnauthorized(res);
    if (!requireProfile(profile)) return sendForbidden(res);
    const supabase = getSupabaseAdmin();
    const id = parsePositiveInteger(req.query?.id_contrato);
    if (!id) {
      const { data: own, error: ownError } = await supabase.from('Contrato')
        .select('id_contrato, id_perfil_inquilino, id_perfil_propietario')
        .or(`id_perfil_inquilino.eq.${Number(profile.id_perfil)},id_perfil_propietario.eq.${Number(profile.id_perfil)}`);
      if (ownError) throw ownError;
      const { data: linked, error: linkedError } = await supabase.from('Contrato_Garante')
        .select('id_contrato,id_perfil,email').eq('id_perfil', profile.id_perfil);
      if (linkedError) throw linkedError;
      let invitations = [];
      if (user.email_confirmed_at && user.email) {
        const { data, error } = await supabase.from('Contrato_Garante').select('id_contrato,id_perfil,email').eq('email', user.email.toLowerCase());
        if (error) throw error; invitations = data || [];
      }
      const contracts = new Map((own || []).map(c => [c.id_contrato, { id_contrato: c.id_contrato,
        role: Number(c.id_perfil_inquilino) === Number(profile.id_perfil) ? 'inquilino' : 'propietario' }]));
      [...(linked || []), ...invitations].filter(g => canAccessGuarantee(g, profile, user)).forEach(g => {
        if (!contracts.has(g.id_contrato)) contracts.set(g.id_contrato, { id_contrato: g.id_contrato, role: 'garante' });
      });
      return res.status(200).json({ ok: true, data: [...contracts.values()] });
    }
    const access = await getSigningContract(supabase, id, profile, user);
    if (access.error) throw access.error;
    if (!access.role) return sendForbidden(res);
    const { data, error: signaturesError } = await supabase.from('Firma_contrato')
      .select('id_firma, rol_firmante, fecha_firma, tsa_sello_tiempo, url_audit_trail_pdf, hash_audit_trail_sha256')
      .eq('id_contrato', id).eq('estado_firma', 'sellada').order('id_firma');
    if (signaturesError) throw signaturesError;
    return res.status(200).json({ ok: true, data: { id_contrato: id, role: access.role, notice: EVIDENCE_NOTICE,
      signatures: (data || []).map(s => ({ id_firma: s.id_firma, role: s.rol_firmante, recorded_at: s.fecha_firma,
        evidence: s.tsa_sello_tiempo, audit_sha256: s.hash_audit_trail_sha256 })) } });
  } catch (error) { return sendInternalError(res, 'firmas/evidencias', error); }
}
