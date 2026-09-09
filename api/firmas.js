import iniciarHandler from '../services/firmas/iniciar.js';
import sellarHandler from '../services/firmas/sellar.js';
import finalizarHandler from '../services/firmas/finalizar.js';
import estadoHandler from '../services/firmas/estado.js';
import webhookDiditHandler from '../services/firmas/webhook-didit.js';
import { sendOriginForbidden, setCorsHeaders } from './_auth.js';

// The webhook requires raw bytes for HMAC verification. Child handlers parse
// JSON through readJsonBody, which also works with local Express.
export const config = { api: { bodyParser: false } };

const handlers = {
  iniciar: iniciarHandler,
  sellar: sellarHandler,
  finalizar: finalizarHandler,
  estado: estadoHandler,
  'webhook-didit': webhookDiditHandler,
  webhook: webhookDiditHandler
};

export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  let action = req.query?.action;
  if (Array.isArray(action)) action = action[0];
  if (!action && req.url) {
    const path = req.url.split('?')[0];
    const match = path.match(/\/api\/firmas\/([^/?]+)/i);
    if (match) action = match[1];
  }
  const selected = handlers[String(action || '').toLowerCase().trim()];
  if (!selected) return res.status(404).json({ ok: false, error: 'Not Found' });
  return selected(req, res);
}
