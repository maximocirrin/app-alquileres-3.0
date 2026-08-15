import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint: POST /api/contracts/:id/start-signature
 * Initiates the electronic signature transaction and creates Didit session.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id;
    const body = await req.json();
    const { role, consentGiven, deviceMetadata, signerName, signerCuil } = body;

    if (!consentGiven) {
      return NextResponse.json(
        { error: 'Consentimiento legal obligatorio no otorgado.' },
        { status: 400 }
      );
    }

    console.log(`[API /contracts/${contractId}/start-signature] Invocado por rol: ${role}, firmante: ${signerName}`);

    // Create or link Didit KYC session
    const diditApiKey = process.env.DIDIT_API_KEY;
    const diditWorkflowId = process.env.DIDIT_WORKFLOW_ID;

    let diditSessionUrl = `#mock-didit-session-${contractId}-${Date.now()}`;
    let sessionId = `sess_${contractId}_${role}_${Date.now()}`;
    let isMock = true;

    if (diditApiKey && diditWorkflowId && diditWorkflowId !== 'TU_WORKFLOW_ID_DE_DIDIT') {
      try {
        const diditRes = await fetch('https://verification.didit.me/v3/session/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': diditApiKey,
            'Authorization': `Bearer ${diditApiKey}`,
          },
          body: JSON.stringify({
            workflow_id: diditWorkflowId,
            vendor_data: `${contractId}_${role}_${signerCuil || 'CUIL'}`,
            callback_url: `${req.nextUrl.origin}/contratos.html?contractId=${contractId}&status=completed`,
          }),
        });

        if (diditRes.ok) {
          const diditData = await diditRes.json();
          diditSessionUrl = diditData.url || diditData.session_url || diditData.verification_url;
          sessionId = diditData.session_id || diditData.id || sessionId;
          isMock = false;
        }
      } catch (diditErr) {
        console.warn('[API start-signature] Error contactando Didit API, usando fallback interactivo:', diditErr);
      }
    }

    return NextResponse.json({
      success: true,
      contractId,
      sessionId,
      verificationUrl: diditSessionUrl,
      isMock,
      contractStatus: role === 'TENANT' ? 'WAITING_TENANT' : 'WAITING_OWNER',
      capturedMetadata: {
        timestamp: new Date().toISOString(),
        userAgent: deviceMetadata?.userAgent || req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1',
      },
    });
  } catch (error: any) {
    console.error('[API start-signature Exception]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
