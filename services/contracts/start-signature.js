/**
 * Contract Signature Initiation Service
 */
function isConfiguredWorkflowId(wfId) {
  if (!wfId || typeof wfId !== 'string') return false;
  const clean = wfId.trim();
  if (!clean || clean.startsWith('TU_WORKFLOW') || clean.includes('TU_WORKFLOW') || clean === 'YOUR_WORKFLOW_ID') {
    return false;
  }
  return clean.length >= 6;
}

export default async function startSignatureHandler(req, res) {
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
    const contractId = req.query?.contractId || req.query?.id || body.contractId || 'CTR-2026-0891';
    const { role = 'TENANT', signerName = 'Inquilino', signerCuil = '', consentGiven = false, deviceMetadata = {} } = body;

    if (!consentGiven) {
      return res.status(400).json({ error: 'Consentimiento legal obligatorio no otorgado.' });
    }

    const diditApiKey = (process.env.DIDIT_API_KEY || '').trim();
    const diditSignatureWorkflowId = (process.env.DIDIT_WORKFLOW_ID_SIGNATURE || process.env.DIDIT_SIGNATURE_WORKFLOW_ID || process.env.DIDIT_WORKFLOW_ID || '').trim();

    let diditSessionUrl = `#mock-didit-liveness-session-${contractId}`;
    let sessionId = `sess_${contractId}_${role}_${Date.now()}`;
    let isMock = true;

    if (diditApiKey && isConfiguredWorkflowId(diditSignatureWorkflowId)) {
      try {
        let diditRes = await fetch('https://verification.didit.me/v3/session/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': diditApiKey,
            'Authorization': `Bearer ${diditApiKey}`
          },
          body: JSON.stringify({
            workflow_id: diditSignatureWorkflowId,
            vendor_data: `${contractId}_${role}_${signerCuil}`
          })
        });

        if (diditRes.status === 404) {
          diditRes = await fetch('https://api.didit.me/v1/session/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': diditApiKey,
              'Authorization': `Bearer ${diditApiKey}`
            },
            body: JSON.stringify({
              workflow_id: diditSignatureWorkflowId,
              vendor_data: `${contractId}_${role}_${signerCuil}`
            })
          });
        }

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
      workflowType: 'liveness_biometrics',
      contractStatus: role === 'TENANT' ? 'WAITING_TENANT' : 'WAITING_OWNER',
      capturedMetadata: {
        timestamp: new Date().toISOString(),
        userAgent: deviceMetadata.userAgent || req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1'
      }
    });
  } catch (error) {
    console.error('[Serverless start-signature Error]:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
