import iniciarHandler from '../services/firmas/iniciar.js';
import sellarHandler from '../services/firmas/sellar.js';
import finalizarHandler from '../services/firmas/finalizar.js';
import webhookDiditHandler from '../services/firmas/webhook-didit.js';

/**
 * Unified Serverless Dispatcher for /api/firmas/*
 * Routes requests based on query parameter `action` or requested URL path.
 */
export default async function handler(req, res) {
  // Extract action from query param (via vercel.json rewrite) or parse from URL
  let action = req.query?.action;
  
  if (Array.isArray(action)) {
    action = action.join('/');
  }
  
  if (!action && req.url) {
    const urlPath = req.url.split('?')[0];
    const match = urlPath.match(/\/api\/firmas\/(.+)/);
    if (match) {
      action = match[1];
    }
  }

  action = (action || '').toLowerCase().trim();

  if (action === 'iniciar') {
    return iniciarHandler(req, res);
  }

  if (action === 'sellar') {
    return sellarHandler(req, res);
  }

  if (action === 'finalizar') {
    return finalizarHandler(req, res);
  }

  if (action === 'webhook-didit' || action === 'webhook') {
    return webhookDiditHandler(req, res);
  }

  return res.status(404).json({
    ok: false,
    error: 'Not Found',
    message: `Acción de firmas no válida: "${action}". Rutas soportadas: iniciar, sellar, finalizar, webhook-didit.`
  });
}
