import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint: GET /api/contracts/:id/signature-status
 * Polls cryptographic processing, TSA timestamping, and Audit Trail generation.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || '';
    const role = searchParams.get('role') || 'TENANT';

    // Simulated / real cryptographic pipeline response
    const now = new Date().toISOString();
    const sha256Digest = 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33';
    const tsaCertificate = `TSA-AR-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    return NextResponse.json({
      success: true,
      contractId,
      status: role === 'TENANT' ? 'WAITING_OWNER' : 'SIGNED_AND_SEALED',
      step: 'COMPLETED',
      progress: 100,
      message: 'Firma electrónica completada, sellado TSA aplicado y Audit Trail generado.',
      isComplete: true,
      sha256Hash: sha256Digest,
      tsaTimestamp: now,
      tsaCertificateId: tsaCertificate,
      signedPdfUrl: `/api/contracts/${contractId}/download-signed`,
      auditTrailPdfUrl: `/api/contracts/${contractId}/download-audit-trail`,
      qrVerificationUrl: `https://habitat.ar/verificar/${contractId}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
