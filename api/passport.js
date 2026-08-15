import verifyLegalHandler from '../services/passport/verify-legal.js';

/**
 * Unified Serverless Dispatcher for /api/passport/*
 */
export default async function handler(req, res) {
  let path = req.query?.path;
  if (Array.isArray(path)) {
    path = path.join('/');
  }

  if (!path && req.url) {
    const urlPath = req.url.split('?')[0];
    const match = urlPath.match(/\/api\/passport\/(.+)/);
    if (match) {
      path = match[1];
    }
  }

  path = (path || '').trim();

  if (path === 'verify-legal' || !path) {
    return verifyLegalHandler(req, res);
  }

  return res.status(404).json({
    error: 'Not Found',
    message: `Ruta de pasaporte no encontrada: "${path}".`
  });
}
