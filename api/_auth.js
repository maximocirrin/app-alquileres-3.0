import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://djhwqttaiggjaxmswggr.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_MrxixhDAPh1NXACfIR29Eg_ojFWOfU5';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Configura los encabezados CORS seguros para la API
 */
export function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Didit-Signature, X-Client-Info, apikey');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * Inicializa un cliente de Supabase con permisos de Service Role (si está disponible) o Anon
 */
export function getSupabaseAdmin() {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  return createClient(SUPABASE_URL, key);
}

/**
 * Valida el token JWT en el header Authorization y retorna el usuario autenticado y su id_perfil
 */
export async function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  let token = '';

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query && req.query.access_token) {
    token = String(req.query.access_token).trim();
  }

  if (!token) {
    return { user: null, profile: null, error: 'Token de autorización ausente.' };
  }

  try {
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser(token);

    if (authErr || !user) {
      return { user: null, profile: null, error: authErr ? authErr.message : 'Sesión inválida o expirada.' };
    }

    // Resolver perfil vinculado en la base de datos
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile } = await supabaseAdmin
      .from('Perfil')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return { user, profile, error: null };
  } catch (err) {
    return { user: null, profile: null, error: err.message };
  }
}

/**
 * Envía una respuesta HTTP 401 Unauthorized estructurada
 */
export function sendUnauthorized(res, message = 'Acceso no autorizado. Debe iniciar sesión.') {
  return res.status(401).json({
    ok: false,
    error: 'Unauthorized',
    message
  });
}

/**
 * Envía una respuesta HTTP 403 Forbidden estructurada
 */
export function sendForbidden(res, message = 'Acceso denegado a este recurso.') {
  return res.status(403).json({
    ok: false,
    error: 'Forbidden',
    message
  });
}
