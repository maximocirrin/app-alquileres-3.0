import finalizarHandler from '../../services/firmas/finalizar.js';

export default async function handler(req, res) {
  return finalizarHandler(req, res);
}
