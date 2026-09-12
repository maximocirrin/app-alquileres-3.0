import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://djhwqttaiggjaxmswggr.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

/**
 * Production is intentionally fail-closed. Do not enable test doubles or
 * permissive CORS from a preview deployment by accident.
 */
export function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function normalizeOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function allowedOrigins() {
  const configured = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean);

  if (configured.length > 0) return new Set(configured);

  // Deployments using a different domain must set ALLOWED_ORIGINS explicitly
  // instead of reflecting arbitrary Origin headers.
  if (isProduction()) {
    return new Set(['https://vivat.com.ar', 'https://www.vivat.com.ar']);
  }

  return new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ]);
}

export function isAllowedOrigin(req) {
  const origin = req?.headers?.origin;
  // Server-to-server webhooks do not send Origin. Authentication/signature
  // verification is responsible for those endpoints.
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  return Boolean(normalized && allowedOrigins().has(normalized));
}

/**
 * Sets a strict CORS policy. Bearer tokens are used instead of cookies, so
 * credentials are deliberately not enabled. Handlers must stop when false.
 */
export function setCorsHeaders(req, res) {
  const origin = req?.headers?.origin;
  const allowed = isAllowedOrigin(req);

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Didit-Signature, X-Client-Info');
  res.setHeader('Access-Control-Max-Age', '600');

  if (origin && allowed) {
    res.setHeader('Access-Control-Allow-Origin', normalizeOrigin(origin));
  }

  return allowed;
}

export function sendOriginForbidden(res) {
  return res.status(403).json({
    ok: false,
    error: 'Forbidden',
    message: 'El origen de la solicitud no está autorizado.'
  });
}

function createPublicClient(accessToken = null) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase public credentials are not configured.');
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
  });

  return withLegacyTableAliases(client);
}

// The deployed database renamed this table. Keeping the alias at the server
// boundary avoids a silent split between the local legacy code and production.
function withLegacyTableAliases(client) {
  const originalFrom = client.from.bind(client);
  client.from = (table) => originalFrom(table === 'Pasaporte_vivat' ? 'Pasaporte_habitat' : table);
  return client;
}

/**
 * Server-only client. The service role bypasses RLS, therefore every caller
 * must authenticate and perform object-level authorization before using it.
 */
export function getSupabaseAdmin() {
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for privileged server operations.');
  }

  const client = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  return withLegacyTableAliases(client);
}

export function getBearerToken(req) {
  const authHeader = String(req?.headers?.authorization || req?.headers?.Authorization || '');
  const match = authHeader.match(/^Bearer\s+([^\s]+)$/i);
  return match ? match[1] : null;
}

/**
 * Validates the bearer token with Supabase Auth and resolves the profile by
 * immutable Auth user id only. Query/body access tokens and email fallbacks
 * are deliberately forbidden because they leak credentials and enable
 * account confusion.
 */
export async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { user: null, profile: null, token: null, error: 'Token de autorización ausente.' };
  }

  try {
    const publicClient = createPublicClient();
    const { data: { user }, error: authError } = await publicClient.auth.getUser(token);

    if (authError || !user) {
      return { user: null, profile: null, token: null, error: 'Sesión inválida o expirada.' };
    }

    const userClient = createPublicClient(token);
    const { data: profile, error: profileError } = await userClient
      .from('Perfil')
      .select('id_perfil, user_id, mail, id_tipo_perfil')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('[getAuthenticatedUser] Could not resolve the authenticated profile:', profileError.message);
    }

    return { user, profile: profile || null, token, error: null };
  } catch (error) {
    console.warn('[getAuthenticatedUser] Token validation failed:', error?.message || error);
    return { user: null, profile: null, token: null, error: 'No fue posible validar la sesión.' };
  }
}

export function requireProfile(profile) {
  return Boolean(profile && Number.isFinite(Number(profile.id_perfil)) && Number(profile.id_perfil) > 0);
}

export function getClientIp(req) {
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req?.headers?.['x-real-ip'] || req?.socket?.remoteAddress || 'unknown');
}

export function getAppUrl() {
  const configured = normalizeOrigin(process.env.APP_URL || process.env.PUBLIC_APP_URL || '');
  if (configured) return configured;
  return isProduction() ? 'https://vivat.com.ar' : 'http://localhost:3000';
}

export function getSafeCallbackUrl(callbackUrl) {
  const appUrl = getAppUrl();
  if (!appUrl) return null;

  if (!callbackUrl) return appUrl;
  try {
    const parsed = new URL(callbackUrl);
    return parsed.origin === appUrl ? parsed.toString() : appUrl;
  } catch {
    return appUrl;
  }
}

export function mocksAreAllowed() {
  return !isProduction() && process.env.ALLOW_MOCK_SERVICES === 'true';
}

export function parsePositiveInteger(value) {
  const number = typeof value === 'number' ? value : Number(String(value || '').trim());
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

/**
 * Reads JSON safely in both Express (already parsed) and Vercel functions
 * configured with bodyParser disabled. The raw bytes are preserved for signed
 * webhook verification.
 */
export async function readJsonBody(req, { maxBytes = 1_048_576 } = {}) {
  let raw = req?.rawBody;

  if (Buffer.isBuffer(req?.body)) {
    raw = req.body;
  } else if (typeof req?.body === 'string') {
    raw = Buffer.from(req.body, 'utf8');
  } else if (req?.body && typeof req.body === 'object') {
    return req.body;
  }

  if (!raw && req?.readable && !req.readableEnded) {
    raw = await readRawBody(req, maxBytes);
  }

  if (!raw || raw.length === 0) return {};
  if (!Buffer.isBuffer(raw)) raw = Buffer.from(String(raw), 'utf8');
  if (raw.length > maxBytes) throw new Error('Request body exceeds the allowed size.');

  req.rawBody = raw;
  const parsed = JSON.parse(raw.toString('utf8'));
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('The request body must be a JSON object.');
  }
  return parsed;
}

export function getRawRequestBody(req) {
  const raw = req?.rawBody;
  if (Buffer.isBuffer(raw)) return raw;
  if (typeof raw === 'string') return Buffer.from(raw, 'utf8');
  if (Buffer.isBuffer(req?.body)) return req.body;
  if (typeof req?.body === 'string') return Buffer.from(req.body, 'utf8');
  return null;
}

function readRawBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let finished = false;

    const finish = (error, value) => {
      if (finished) return;
      finished = true;
      if (error) reject(error);
      else resolve(value);
    };

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        finish(new Error('Request body exceeds the allowed size.'));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => finish(null, Buffer.concat(chunks)));
    req.on('error', (error) => finish(error));
    req.on('aborted', () => finish(new Error('Request aborted.')));
  });
}

export async function getContractForProfile(supabase, contractId, profileId) {
  const id = parsePositiveInteger(contractId);
  const profile = parsePositiveInteger(profileId);
  if (!id || !profile) return { contract: null, role: null, error: null };

  const { data: contract, error } = await supabase
    .from('Contrato')
    .select('id_contrato, id_propiedad, id_perfil_inquilino, id_perfil_propietario')
    .eq('id_contrato', id)
    .maybeSingle();

  if (error || !contract) return { contract: null, role: null, error };
  if (Number(contract.id_perfil_inquilino) === profile) return { contract, role: 'inquilino', error: null };
  if (Number(contract.id_perfil_propietario) === profile) return { contract, role: 'propietario', error: null };
  return { contract, role: null, error: null };
}

export function isSafeStoragePath(value, contractId, { prefix = 'inventario' } = {}) {
  if (typeof value !== 'string') return false;
  const id = parsePositiveInteger(contractId);
  if (!id || value.length > 500 || value.includes('..') || value.includes('\\')) return false;
  return new RegExp(`^contrato_${id}/${prefix}/[A-Za-z0-9._-]+$`).test(value);
}

export function sendUnauthorized(res, message = 'Acceso no autorizado. Debe iniciar sesión.') {
  return res.status(401).json({ ok: false, error: 'Unauthorized', message });
}

export function sendForbidden(res, message = 'Acceso denegado a este recurso.') {
  return res.status(403).json({ ok: false, error: 'Forbidden', message });
}

export function sendInternalError(res, context, error) {
  console.error(`[${context}]`, error);
  return res.status(500).json({
    ok: false,
    error: 'Internal Server Error',
    message: 'Ocurrió un error interno al procesar la solicitud.'
  });
}
