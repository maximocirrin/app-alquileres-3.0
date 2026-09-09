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

function configuredBcraUrl() {
  const raw = String(process.env.BCRA_API_URL || 'https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas').replace(/\/+$/, '');
  const url = new URL(raw);
  if (url.protocol !== 'https:' || !(url.hostname === 'api.bcra.gob.ar' || url.hostname.endsWith('.bcra.gob.ar'))) {
    throw new Error('Invalid BCRA endpoint configuration.');
  }
  return url.toString().replace(/\/+$/, '');
}

async function ownPassport(supabase, profileId, rawId) {
  let query = supabase.from('Pasaporte_vivat').select('id_pasaporte, id_perfil, cuit');
  const id = parsePositiveInteger(rawId);
  query = id ? query.eq('id_pasaporte', id) : query.order('created_at', { ascending: false }).limit(1);
  const { data, error } = await query.eq('id_perfil', profileId).maybeSingle();
  if (error) throw error;
  return data;
}

function parseBcraResponse(cuit, debtData, checksData) {
  const results = debtData?.results;
  if (!results || !Array.isArray(results.periodos)) throw new Error('BCRA returned no debt data.');

  let worst = 1;
  let maxDelay = 0;
  const period = results.periodos[0] || {};
  const entities = Array.isArray(period.entidades) ? period.entidades.map((entity) => {
    const situation = Number(entity.situacion);
    const delay = Number(entity.diasAtrasoPago) || 0;
    if (Number.isFinite(situation) && situation > worst) worst = situation;
    if (delay > maxDelay) maxDelay = delay;
    return {
      entidad: String(entity.entidad || 'Entidad financiera').slice(0, 240),
      situacion: Number.isFinite(situation) ? situation : null,
      monto: Number(entity.monto) || 0,
      diasAtraso: delay,
      fechaSituacion: entity.fechaSituacion || null
    };
  }) : [];
  const checks = Array.isArray(checksData?.results?.chequesRechazados) ? checksData.results.chequesRechazados : [];
  const labels = {
    1: 'Situación 1 (Normal)', 2: 'Situación 2 (Riesgo Bajo)', 3: 'Situación 3 (Deficiente)',
    4: 'Situación 4 (Alto Riesgo)', 5: 'Situación 5 (Irrecuperable)', 6: 'Situación 6 (Irrecuperable por Disposición Técnica)'
  };
  return {
    cuit,
    situacionCrediticia: labels[worst] || `Situación ${worst}`,
    peorSituacion: worst,
    chequesRechazadosCount: checks.length,
    diasAtrasoMax: maxDelay,
    entidades: entities,
    consultadoEn: new Date().toISOString()
  };
}

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
    const passport = await ownPassport(supabase, profile.id_perfil, body.pasaporteId || body.pasaporte_id);
    if (!passport) return res.status(404).json({ error: 'Passport not found.' });
    if (!passport.cuit || String(passport.cuit).replace(/\D/g, '') !== cuit) {
      return sendForbidden(res, 'El CUIT consultado debe coincidir con el pasaporte verificado.');
    }

    const baseUrl = configuredBcraUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let debtResponse;
    let checksResponse;
    try {
      [debtResponse, checksResponse] = await Promise.all([
        fetch(`${baseUrl}/${encodeURIComponent(cuit)}`, { headers: { Accept: 'application/json' }, signal: controller.signal }),
        fetch(`${baseUrl}/ChequesRechazados/${encodeURIComponent(cuit)}`, { headers: { Accept: 'application/json' }, signal: controller.signal })
      ]);
    } finally {
      clearTimeout(timeout);
    }
    if (!debtResponse.ok) return res.status(502).json({ error: 'BCRA service unavailable.' });

    const debtData = await debtResponse.json();
    const checksData = checksResponse.ok ? await checksResponse.json().catch(() => null) : null;
    const result = parseBcraResponse(cuit, debtData, checksData);
    const { error: updateError } = await supabase
      .from('Pasaporte_vivat')
      .update({ situacion_crediticia: result.situacionCrediticia, updated_at: new Date().toISOString() })
      .eq('id_pasaporte', passport.id_pasaporte)
      .eq('id_perfil', profile.id_perfil);
    if (updateError) throw updateError;

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendInternalError(res, 'bcra-deudores', error);
  }
}
