import startSignatureHandler from '../services/contracts/start-signature.js';
import signatureStatusHandler from '../services/contracts/signature-status.js';

/**
 * Unified Serverless Dispatcher for /api/contracts/*
 */
export default async function handler(req, res) {
  let path = req.query?.path;
  if (Array.isArray(path)) {
    path = path.join('/');
  }

  if (!path && req.url) {
    const urlPath = req.url.split('?')[0];
    const match = urlPath.match(/\/api\/contracts\/?(.*)/);
    if (match) {
      path = match[1];
    }
  }

  path = (path || '').trim();

  // Pattern 1: /api/contracts/start-signature or /api/contracts/:id/start-signature
  if (path === 'start-signature' || path.endsWith('/start-signature')) {
    const parts = path.split('/');
    if (parts.length > 1) {
      req.query = req.query || {};
      req.query.id = parts[0];
    }
    return startSignatureHandler(req, res);
  }

  // Pattern 2: /api/contracts/signature-status or /api/contracts/:id/signature-status
  if (path === 'signature-status' || path.endsWith('/signature-status')) {
    const parts = path.split('/');
    if (parts.length > 1) {
      req.query = req.query || {};
      req.query.id = parts[0];
    }
    return signatureStatusHandler(req, res);
  }

  // Fallback for contract info if needed
  return res.status(200).json({
    message: 'Vivat Contracts API Dispatcher',
    path
  });
}
