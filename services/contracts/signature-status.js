/** Retired prototype: signature state is read from /api/firmas/estado. */
export default async function retiredSignatureStatusHandler(_req, res) {
  return res.status(410).json({
    ok: false,
    error: 'Gone',
    message: 'Use the authenticated /api/firmas/estado flow.'
  });
}
