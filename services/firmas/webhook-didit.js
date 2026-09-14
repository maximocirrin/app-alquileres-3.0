import crypto from 'crypto';
import { refreshSignature } from './didit.js';
import {
  getRawRequestBody,
  getSupabaseAdmin,
  readJsonBody,
  sendInternalError,
  setCorsHeaders
} from '../../api/_auth.js';

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{6,200}$/;
function sortObjectKeys(value) {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = sortObjectKeys(value[key]);
      return result;
    }, {});
  }
  return value;
}

function safeSignatureEqual(expected, received) {
  if (!/^[a-f0-9]{64}$/i.test(received || '')) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}

export function verifyDiditSignature(req, body) {
  const secret = String(process.env.DIDIT_SIGNATURE_WEBHOOK_SECRET || process.env.DIDIT_WEBHOOK_SECRET || '').trim();
  if (!secret) return false;
  const timestamp = Number(req.headers['x-timestamp']);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300 || Number(body?.timestamp) !== timestamp) return false;

  const signatureV2 = String(req.headers['x-signature-v2'] || '').trim();
  if (signatureV2) {
    const canonical = JSON.stringify(sortObjectKeys(body));
    const expectedV2 = crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
    if (safeSignatureEqual(expectedV2, signatureV2)) return true;
  }

  const raw = getRawRequestBody(req);
  const provided = String(req.headers['x-didit-signature'] || req.headers['x-signature'] || req.headers['webhook-signature'] || '')
    .split(',')[0]
    .replace(/^(sha256|v1)=/i, '')
    .trim();
  if (!raw) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return safeSignatureEqual(expected, provided);
}

/** Didit callback for a contract-signature session. */
export default async function webhookDiditHandler(req, res) {
  // Webhooks are server-to-server and do not need a permissive CORS response.
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const body = await readJsonBody(req, { maxBytes: 8 * 1024 * 1024 });
    if (!verifyDiditSignature(req, body)) return res.status(401).json({ ok: false, error: 'Invalid webhook signature.' });

    const sessionId = String(body.session_id || body.sessionId || body.id || '');
    if (!SESSION_ID_PATTERN.test(sessionId)) return res.status(400).json({ ok: false, error: 'Invalid session id.' });
    const supabase = getSupabaseAdmin();
    const { data: signature, error: signatureError } = await supabase
      .from('Firma_contrato')
      .select('*')
      .eq('didit_session_id', sessionId)
      .maybeSingle();
    if (signatureError) throw signatureError;
    if (!signature) return res.status(200).json({ ok: true, ignored: true });

    const updated = await refreshSignature(supabase, signature);
    return res.status(200).json({ ok: true, firma_id: signature.id_firma, estado_firma: updated.estado_firma });
  } catch (error) {
    return sendInternalError(res, 'firmas/webhook-didit', error);
  }
}
