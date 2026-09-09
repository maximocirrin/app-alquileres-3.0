import iniciarHandler from '../services/firmas/iniciar.js';
import { sendOriginForbidden, setCorsHeaders } from './_auth.js';

function pathFromRequest(req) {
  let path = req.query?.path;
  if (Array.isArray(path)) path = path.join('/');
  if (!path && req.url) {
    const match = req.url.split('?')[0].match(/\/api\/contracts\/?(.*)/i);
    if (match) path = match[1];
  }
  return String(path || '').replace(/^\/+|\/+$/g, '');
}

/**
 * Compatibility dispatcher. Legacy contract routes formerly fabricated a
 * completed signature from URL parameters; only a real session initiation is
 * retained and it delegates to the authenticated signature service.
 */
export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const path = pathFromRequest(req);
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
