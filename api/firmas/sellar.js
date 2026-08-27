import sellarHandler from '../../services/firmas/sellar.js';

export default async function handler(req, res) {
  return sellarHandler(req, res);
}
