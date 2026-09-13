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

function configuredGateway() {
  const endpoint = String(process.env.ARCA_PADRON_GATEWAY_URL || '').trim();
  const token = String(process.env.ARCA_PADRON_GATEWAY_TOKEN || '').trim();
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || !token) throw new Error('ARCA gateway is not configured.');
  return { url, token };
}

async function ownPassport(supabase, profileId, value) {
  const id = parsePositiveInteger(value);
  let query = supabase.from('Pasaporte_vivat').select('id_pasaporte, id_perfil, cuit');
  query = id ? query.eq('id_pasaporte', id) : query.order('created_at', { ascending: false }).limit(1);
  const { data, error } = await query.eq('id_perfil', profileId).maybeSingle();
  if (error) throw error;
  return data;
}

function normalizeResult(value, cuit) {
  if (!value || typeof value !== 'object') throw new Error('Invalid ARCA response.');
  const result = {
    cuit,
    condicionFiscal: String(value.condicionFiscal || value.condicion_fiscal || '').slice(0, 240),
    razonSocial: String(value.razonSocial || value.razon_social || '').slice(0, 240),
    estadoCuit: String(value.estadoCuit || value.estado_cuit || '').slice(0, 120),
    actividadPrincipal: String(value.actividadPrincipal || value.actividad_principal || '').slice(0, 240),
    categoriaMonotributo: value.categoriaMonotributo || value.categoria_monotributo || null
  };
  if (!result.condicionFiscal || !result.estadoCuit) throw new Error('Incomplete ARCA response.');
  return result;
}

/**
 * ARCA is accessed through a separately managed, authenticated gateway. The
 * previous in-process SOAP code fabricated a CMS signature and then returned
 * a successful contingency response, which is unsafe for identity decisions.
 */
export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) return sendUnauthorized(res);
    if (!requireProfile(profile)) return sendForbidden(res, 'No se encontró un perfil válido para esta cuenta.');
    const body = await readJsonBody(req);
    const cuit = String(body.cuit || '').replace(/\D/g, '');
    if (!/^\d{11}$/.test(cuit)) return res.status(400).json({ error: 'Invalid CUIT.' });

    const supabase = getSupabaseAdmin();
    if (!await consumeRateLimit(supabase, 'arca', profile.id_perfil, 10, 60 * 60)) {
      return sendRateLimited(res);
    }
    const passport = await ownPassport(supabase, profile.id_perfil, body.pasaporteId || body.pasaporte_id);
    if (!passport) return res.status(404).json({ error: 'Passport not found.' });
    if (!passport.cuit || String(passport.cuit).replace(/\D/g, '') !== cuit) {
      return sendForbidden(res, 'El CUIT consultado debe coincidir con el pasaporte verificado.');
    }

    let gateway;
    try {
      gateway = configuredGateway();
    } catch {
      return res.status(503).json({ error: 'ARCA verification service unavailable.' });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    let response;
    try {
      response = await fetch(gateway.url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gateway.token}` },
        body: JSON.stringify({ cuit })
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) return res.status(502).json({ error: 'ARCA verification service unavailable.' });
    const result = normalizeResult(await response.json().catch(() => null), cuit);

    const { error: updateError } = await supabase
      .from('Pasaporte_vivat')
      .update({
        condicion_fiscal: result.condicionFiscal,
        razon_social: result.razonSocial || null,
        updated_at: new Date().toISOString()
      })
      .eq('id_pasaporte', passport.id_pasaporte)
      .eq('id_perfil', profile.id_perfil);
    if (updateError) throw updateError;

    return res.status(200).json({ success: true, ...result, pasaporteId: passport.id_pasaporte, modoReal: true });
  } catch (error) {
    return sendInternalError(res, 'arca-padron', error);
  }
}
