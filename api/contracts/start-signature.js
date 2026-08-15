/**
 * Vercel Serverless Function: /api/contracts/start-signature
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { contractId = 'CTR-2026-0891', role = 'TENANT', signerName = 'Inquilino', signerCuil = '', consentGiven = false, deviceMetadata = {} } = body;

    if (!consentGiven) {
      return res.status(400).json({ error: 'Consentimiento legal obligatorio no otorgado.' });
    }

    const diditApiKey = (process.env.DIDIT_API_KEY || '').trim();
    const diditWorkflowId = (process.env.DIDIT_WORKFLOW_ID || '').trim();

    let diditSessionUrl = `#mock-didit-session-${contractId}`;
    let sessionId = `sess_${contractId}_${role}_${Date.now()}`;
    let isMock = true;

    if (diditApiKey && diditWorkflowId && diditWorkflowId !== 'TU_WORKFLOW_ID_DE_DIDIT') {
      try {
        const diditRes = await fetch('https://verification.didit.me/v3/session/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': diditApiKey,
            'Authorization': `Bearer ${diditApiKey}`
          },
          body: JSON.stringify({
            workflow_id: diditWorkflowId,
            vendor_data: `${contractId}_${role}_${signerCuil}`
          })
        });

        if (diditRes.ok) {
          const diditData = await diditRes.json();
          diditSessionUrl = diditData.url || diditData.session_url || diditData.verification_url;
          sessionId = diditData.session_id || diditData.id || sessionId;
          isMock = false;
        }
      } catch (err) {
        console.warn('[Serverless start-signature] Error Didit API fallback:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      contractId,
      sessionId,
      verificationUrl: diditSessionUrl,
      isMock,
      contractStatus: role === 'TENANT' ? 'WAITING_TENANT' : 'WAITING_OWNER',
      capturedMetadata: {
        timestamp: new Date().toISOString(),
        userAgent: deviceMetadata.userAgent || req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'
      }
    });
  } catch (error) {
    console.error('[Serverless start-signature Error]:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
