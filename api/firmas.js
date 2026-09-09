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

function handleContractRoute(req, res) {
  let path = req.query?.path;
  if (Array.isArray(path)) path = path.join('/');
  if (!path && req.url) {
    const match = req.url.split('?')[0].match(/\/api\/contracts\/?(.*)/i);
    if (match) path = match[1];
  }
  path = String(path || '').replace(/^\/+|\/+$/g, '');
  const match = path.match(/^(\d+)\/start-signature$/) || (path === 'start-signature' ? [] : null);
  if (match && req.method === 'POST') {
    const id = match[1] || req.query?.id || req.body?.id_contrato || req.body?.contractId;
    req.body = { ...(req.body || {}), id_contrato: id };
    return iniciarHandler(req, res);
  }

  return res.status(410).json({
    ok: false,
    error: 'Gone',
    message: 'Esta ruta de contratos fue retirada. Use el flujo de firma autenticado.'
  });
}

export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const urlPath = (req.url || '').split('?')[0];
  if (req.query?.route === 'contracts' || urlPath.startsWith('/api/contracts')) {
    return handleContractRoute(req, res);
  }

  let action = req.query?.action;
  if (Array.isArray(action)) action = action[0];
  if (!action && req.url) {
    const match = urlPath.match(/\/api\/firmas\/([^/?]+)/i);
    if (match) action = match[1];
  }
  const selected = handlers[String(action || '').toLowerCase().trim()];
  if (!selected) return res.status(404).json({ ok: false, error: 'Not Found' });
  return selected(req, res);
}
