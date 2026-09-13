import {
  consumeRateLimit,
  getAuthenticatedUser,
  getContractForProfile,
  getSupabaseAdmin,
  parsePositiveInteger,
  readJsonBody,
  requireProfile,
  sendForbidden,
  sendInternalError,
  sendOriginForbidden,
  sendRateLimited,
  sendUnauthorized,
  setCorsHeaders
} from './_auth.js';

const MAX_REJECTION_REASON_LENGTH = 500;

/**
 * Browser labels are intentionally normalized to the small, canonical set
 * accepted by the payment-review workflow. Do not pass arbitrary free text to
 * the RPC: it becomes part of an auditable payment declaration.
 */
const PAYMENT_METHOD_ALIASES = new Map([
  ['transferencia', 'transferencia'],
  ['transferencia bancaria', 'transferencia'],
  ['transferencia cbu', 'transferencia'],
  ['cbu', 'transferencia'],
  ['mercado pago', 'mercado_pago'],
  ['mercadopago', 'mercado_pago'],
  ['mp', 'mercado_pago'],
  ['efectivo', 'efectivo']
]);

function normalizeMethod(value) {
  if (typeof value !== 'string' || value.length > 80 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  const label = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return PAYMENT_METHOD_ALIASES.get(label) || null;
}

function normalizeRejectionReason(value) {
  if (typeof value !== 'string') return null;
  const reason = value.trim();
  if (
    reason.length < 3 ||
    reason.length > MAX_REJECTION_REASON_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(reason)
  ) {
    return null;
  }
  return reason;
}

function publicRequest(value) {
  const row = Array.isArray(value) ? value[0] : value;
  const request = row?.solicitud && typeof row.solicitud === 'object' ? row.solicitud : row;
  if (!request || typeof request !== 'object') return null;

  return {
    id_solicitud_pago: parsePositiveInteger(request.id_solicitud_pago),
    estado: typeof request.estado === 'string' ? request.estado : null,
    metodo_pago: typeof request.metodo_pago === 'string' ? request.metodo_pago : null,
    monto_informado: request.monto_informado ?? null,
    solicitado_en: request.solicitado_en || null,
    resuelto_en: request.resuelto_en || null,
    motivo_rechazo: request.motivo_rechazo || null
  };
}

function rpcIsStateConflict(error) {
  return ['P0001', '23505', '40001'].includes(error?.code);
}

function rpcIsForbidden(error) {
  return error?.code === '42501';
}

function optionalId(value) {
  if (value === undefined || value === null) return { provided: false, id: null };
  return { provided: true, id: parsePositiveInteger(value) };
}

function sendStateConflict(res, message) {
  return res.status(409).json({
    ok: false,
    error: 'Payment state conflict.',
    message
  });
}

async function paymentById(supabase, paymentId) {
  const { data, error } = await supabase
    .from('Pago')
    .select('id_pago, id_contrato')
    .eq('id_pago', paymentId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function requestById(supabase, requestId) {
  const { data, error } = await supabase
    .from('Solicitud_pago')
    .select('id_solicitud_pago, id_pago')
    .eq('id_solicitud_pago', requestId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * Resolves the contract from the canonical payment record, rather than from a
 * client-supplied contract id. This prevents a caller from reporting or
 * resolving a payment outside the contract they participate in.
 */
async function authorizedPayment(supabase, profileId, paymentId, requestedContractId) {
  const payment = await paymentById(supabase, paymentId);
  if (!payment) return { payment: null, contract: null, role: null, mismatch: false };

  const contractId = parsePositiveInteger(payment.id_contrato);
  if (!contractId) throw new Error('Payment has an invalid contract reference.');
  if (requestedContractId && requestedContractId !== contractId) {
    return { payment, contract: null, role: null, mismatch: true };
  }

  const { contract, role, error } = await getContractForProfile(supabase, contractId, profileId);
  if (error) throw error;
  return { payment, contract, role, mismatch: false };
}

async function requireParticipantForContract(supabase, contractId, profileId) {
  const { contract, role, error } = await getContractForProfile(supabase, contractId, profileId);
  if (error) throw error;
  return { contract, role };
}

async function paymentStatus(supabase, contractId) {
  const { data: payments, error: paymentsError } = await supabase
    .from('Pago')
    .select('id_pago, id_contrato, id_metodo_pago, monto, fecha_vencimiento, fecha_pago, periodo, interes_perdonado')
    .eq('id_contrato', contractId)
    .order('id_pago', { ascending: false });
  if (paymentsError) throw paymentsError;

  const paymentIds = (payments || [])
    .map((payment) => parsePositiveInteger(payment.id_pago))
    .filter(Boolean);
  if (paymentIds.length === 0) return [];

  const { data: requests, error: requestsError } = await supabase
    .from('Solicitud_pago')
    .select('id_solicitud_pago, id_pago, estado, metodo_pago, monto_informado, solicitado_en, resuelto_en, motivo_rechazo')
    .in('id_pago', paymentIds)
    .order('solicitado_en', { ascending: false })
    .order('id_solicitud_pago', { ascending: false });
  if (requestsError) throw requestsError;

  const latestRequestByPayment = new Map();
  for (const request of requests || []) {
    const paymentId = parsePositiveInteger(request.id_pago);
    if (paymentId && !latestRequestByPayment.has(paymentId)) {
      latestRequestByPayment.set(paymentId, publicRequest(request));
    }
  }

  return (payments || []).map((payment) => ({
    id_pago: parsePositiveInteger(payment.id_pago),
    id_contrato: parsePositiveInteger(payment.id_contrato),
    id_metodo_pago: payment.id_metodo_pago ?? null,
    monto: payment.monto ?? null,
    fecha_vencimiento: payment.fecha_vencimiento || null,
    fecha_pago: payment.fecha_pago || null,
    periodo: payment.periodo || null,
    interes_perdonado: payment.interes_perdonado === true,
    solicitud: latestRequestByPayment.get(parsePositiveInteger(payment.id_pago)) || null
  }));
}

async function handleGet(req, res, supabase, profile) {
  const contractId = parsePositiveInteger(req.query?.id_contrato ?? req.query?.idContrato);
  if (!contractId) {
    return res.status(400).json({ ok: false, error: 'Invalid contract id.', message: 'Debe indicar un id_contrato válido.' });
  }

  const { contract, role } = await requireParticipantForContract(supabase, contractId, profile.id_perfil);
  if (!contract) return res.status(404).json({ ok: false, error: 'Not Found', message: 'No se encontró el contrato.' });
  if (!role) return sendForbidden(res, 'No eres parte de este contrato.');

  if (!await consumeRateLimit(supabase, 'payment-status-read', `${profile.id_perfil}:${contractId}`, 120, 60 * 60)) {
    return sendRateLimited(res);
  }

  const pagos = await paymentStatus(supabase, contractId);
  return res.status(200).json({
    ok: true,
    data: {
      id_contrato: contractId,
      pagos
    }
  });
}

async function handleReport(res, body, supabase, profile) {
  const paymentId = parsePositiveInteger(body.id_pago ?? body.idPago);
  const contractInput = optionalId(body.id_contrato ?? body.idContrato);
  const paymentMethod = normalizeMethod(body.metodo_pago ?? body.metodoPago ?? body.method);
  if (!paymentId || !paymentMethod || (contractInput.provided && !contractInput.id)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid payment report.',
      message: 'Debe indicar un pago y un método de pago válido.'
    });
  }

  const { payment, contract, role, mismatch } = await authorizedPayment(
    supabase,
    profile.id_perfil,
    paymentId,
    contractInput.id
  );
  if (!payment) return res.status(404).json({ ok: false, error: 'Not Found', message: 'No se encontró el pago.' });
  if (mismatch) return res.status(400).json({ ok: false, error: 'Invalid contract id.', message: 'El pago no pertenece al contrato indicado.' });
  if (!contract) return res.status(404).json({ ok: false, error: 'Not Found', message: 'No se encontró el contrato del pago.' });
  if (role !== 'inquilino') return sendForbidden(res, 'Solo el inquilino del contrato puede informar un pago.');

  if (!await consumeRateLimit(supabase, 'payment-report', `${profile.id_perfil}:${paymentId}`, 10, 60 * 60)) {
    return sendRateLimited(res);
  }

  const { data, error } = await supabase.rpc('solicitar_revision_pago', {
    p_pago_id: paymentId,
    p_id_perfil_inquilino: Number(profile.id_perfil),
    p_metodo_pago: paymentMethod
  });
  if (error) {
    if (rpcIsStateConflict(error)) {
      return sendStateConflict(res, 'El pago ya fue informado o ya no puede enviarse a revisión.');
    }
    if (rpcIsForbidden(error)) return sendForbidden(res, 'No puedes informar este pago.');
    throw error;
  }

  return res.status(201).json({
    ok: true,
    message: 'El pago fue informado al propietario para su revisión.',
    data: {
      id_contrato: Number(payment.id_contrato),
      id_pago: paymentId,
      solicitud: publicRequest(data)
    }
  });
}

async function handleReview(res, body, supabase, profile) {
  const requestId = parsePositiveInteger(body.id_solicitud_pago ?? body.idSolicitudPago);
  const contractInput = optionalId(body.id_contrato ?? body.idContrato);
  const accept = body.aceptar;
  if (!requestId || typeof accept !== 'boolean' || (contractInput.provided && !contractInput.id)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid payment review.',
      message: 'Debe indicar una solicitud y una decisión válida.'
    });
  }

  const rejectionReason = accept ? null : normalizeRejectionReason(body.motivo_rechazo ?? body.motivoRechazo);
  if (!accept && !rejectionReason) {
    return res.status(400).json({
      ok: false,
      error: 'Rejection reason required.',
      message: 'Debe indicar un motivo de rechazo de entre 3 y 500 caracteres.'
    });
  }

  const request = await requestById(supabase, requestId);
  if (!request) return res.status(404).json({ ok: false, error: 'Not Found', message: 'No se encontró la solicitud de pago.' });

  const paymentId = parsePositiveInteger(request.id_pago);
  if (!paymentId) throw new Error('Payment request has an invalid payment reference.');
  const { payment, contract, role, mismatch } = await authorizedPayment(
    supabase,
    profile.id_perfil,
    paymentId,
    contractInput.id
  );
  if (!payment) return res.status(404).json({ ok: false, error: 'Not Found', message: 'No se encontró el pago de la solicitud.' });
  if (mismatch) return res.status(400).json({ ok: false, error: 'Invalid contract id.', message: 'La solicitud no pertenece al contrato indicado.' });
  if (!contract) return res.status(404).json({ ok: false, error: 'Not Found', message: 'No se encontró el contrato del pago.' });
  if (role !== 'propietario') return sendForbidden(res, 'Solo el propietario del contrato puede revisar este pago.');

  if (!await consumeRateLimit(supabase, 'payment-review', `${profile.id_perfil}:${requestId}`, 20, 60 * 60)) {
    return sendRateLimited(res);
  }

  const { data, error } = await supabase.rpc('resolver_revision_pago', {
    p_id_solicitud_pago: requestId,
    p_id_perfil_propietario: Number(profile.id_perfil),
    p_aceptar: accept,
    p_motivo_rechazo: rejectionReason
  });
  if (error) {
    if (rpcIsStateConflict(error)) {
      return sendStateConflict(res, 'La solicitud ya fue resuelta o su estado cambió.');
    }
    if (rpcIsForbidden(error)) return sendForbidden(res, 'No puedes revisar esta solicitud de pago.');
    throw error;
  }

  return res.status(200).json({
    ok: true,
    message: accept ? 'El pago fue aceptado.' : 'El pago fue rechazado y se notificó al inquilino.',
    data: {
      id_contrato: Number(payment.id_contrato),
      id_pago: paymentId,
      solicitud: publicRequest(data)
    }
  });
}

export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  try {
    const { user, profile, error: authError, status: authStatus, code: authCode } = await getAuthenticatedUser(req);
    if (authError && authStatus === 503) {
      res.setHeader('Retry-After', '10');
      return res.status(503).json({ ok: false, error: authCode, message: authError });
    }
    if (authError || !user) return sendUnauthorized(res, 'Debe iniciar sesión para consultar o revisar pagos.');
    if (!requireProfile(profile)) return sendForbidden(res, 'No se encontró un perfil válido para esta cuenta.');

    const supabase = getSupabaseAdmin();
    if (req.method === 'GET') return await handleGet(req, res, supabase, profile);

    let body;
    try {
      body = await readJsonBody(req, { maxBytes: 16 * 1024 });
    } catch {
      return res.status(400).json({
        ok: false,
        error: 'Invalid JSON body.',
        message: 'El cuerpo de la solicitud debe ser un objeto JSON válido de hasta 16 KB.'
      });
    }

    const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
    if (action === 'report') return await handleReport(res, body, supabase, profile);
    if (action === 'review') return await handleReview(res, body, supabase, profile);

    return res.status(400).json({
      ok: false,
      error: 'Unsupported payment action.',
      message: 'La acción debe ser report o review.'
    });
  } catch (error) {
    return sendInternalError(res, 'pagos', error);
  }
}
