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

function text(value, maxLength, { required = false } = {}) {
  if (value === null || value === undefined) return required ? null : null;
  const clean = String(value).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!clean || clean.length > maxLength) return null;
  return clean;
}

function invitationToken() {
  return crypto.randomBytes(32).toString('base64url');
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

/** Server-authoritative mutations for a tenant's own guarantor invitations. */
export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) return sendUnauthorized(res);
    if (!requireProfile(profile)) return sendForbidden(res, 'No se encontró un perfil válido para esta cuenta.');

    const body = await readJsonBody(req);
    const action = String(body.action || '').toLowerCase();
    const supabase = getSupabaseAdmin();
    const passport = await passportForProfile(supabase, profile.id_perfil);
    if (!passport) return res.status(409).json({ ok: false, error: 'No passport found for this account.' });

    if (action === 'invite') {
      const guaranteeType = Number(body.id_tipo_garantia || body.idTipoGarantia || 3);
      if (![1, 2, 3].includes(guaranteeType)) {
        return res.status(400).json({ ok: false, error: 'Invalid guarantee type.' });
      }
      const name = text(body.nombre_completo || body.nombre || body.alias, 240) ||
        (guaranteeType === 1 ? 'Garante propietario (pendiente de KYC)' : 'Garante (pendiente de KYC)');
      const email = text(body.email, 320);
      const phone = text(body.telefono, 64);
      const relation = text(body.relacion_inquilino || body.relacion, 120) || 'Familiar directo';
      if (!email && !phone) return res.status(400).json({ ok: false, error: 'Email or phone is required.' });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'Invalid email.' });

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
          token_invitacion: invitationToken(),
          kyc_verificado: false
        })
        .select('id_garante, id_tipo_garantia, nombre_completo, email, telefono, relacion_inquilino, token_invitacion, id_estado_garante, kyc_verificado, created_at')
        .single();
      if (error) throw error;

      return res.status(201).json({ ok: true, data });
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
