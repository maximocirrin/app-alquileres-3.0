import webhookDiditHandler from '../../services/firmas/webhook-didit.js';

export default async function handler(req, res) {
  return webhookDiditHandler(req, res);
}
