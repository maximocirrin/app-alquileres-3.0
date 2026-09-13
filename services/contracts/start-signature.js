/** Retired prototype kept fail-closed to prevent accidental reuse. */
export default async function retiredStartSignatureHandler(_req, res) {
  return res.status(410).json({
    ok: false,
    error: 'Gone',
    message: 'Use the authenticated /api/firmas/iniciar flow.'
  });
}
