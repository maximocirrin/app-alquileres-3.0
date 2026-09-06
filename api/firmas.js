import iniciarHandler from '../services/firmas/iniciar.js';
import sellarHandler from '../services/firmas/sellar.js';
import finalizarHandler from '../services/firmas/finalizar.js';
import webhookDiditHandler from '../services/firmas/webhook-didit.js';

/**
 * Unified Serverless Dispatcher for /api/firmas/*
 * Handles /api/firmas/sellar, /api/firmas/finalizar, /api/firmas/iniciar, /api/firmas/webhook-didit
 * Consolidates multiple endpoints into a single function to respect Vercel Hobby plan limits.
 */
export default async function handler(req, res) {
  // Configurar cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let action = req.query?.action;
  if (Array.isArray(action)) {
    action = action[0];
  }

  if (!action && req.url) {
    const urlPath = req.url.split('?')[0];
    const match = urlPath.match(/\/api\/firmas(?:\/([^\/\?]+))?/i);
    if (match && match[1]) {
      action = match[1];
    } else {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        action = parsedUrl.searchParams.get('action');
      } catch (e) {}
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
