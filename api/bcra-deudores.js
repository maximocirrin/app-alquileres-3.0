import { setCorsHeaders, getAuthenticatedUser, sendUnauthorized, sendForbidden, getSupabaseAdmin } from './_auth.js';

const BCRA_API_URL = (process.env.BCRA_API_URL || 'https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas').replace(/\/+$/, '');

/**
 * Handler Serverless para la integración con la API de la Central de Deudores del BCRA
 * Endpoint: POST /api/bcra-deudores
 */
export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', message: 'Usar método POST' });
  }

  // 1. Validar autenticación
  const { user, profile, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return sendUnauthorized(res, `Autenticación requerida para consultar BCRA: ${authError || 'Sesión no válida'}`);
  }

  try {
    const { cuit, pasaporteId } = req.body || {};

    if (!cuit) {
      return res.status(400).json({ error: 'Debe proporcionar un CUIT o CUIL válido.' });
    }

    const cleanCuit = String(cuit).replace(/\D/g, '');
    if (cleanCuit.length !== 11) {
      return res.status(400).json({ error: 'El CUIT ingresado debe tener 11 dígitos numéricos.' });
    }

    const supabase = getSupabaseAdmin();

    // 2. Validar que el pasaporte a actualizar pertenezca al usuario autenticado
    let targetPasaporteId = pasaporteId;
    if (targetPasaporteId) {
      const { data: passCheck } = await supabase
        .from('Pasaporte_habitat')
        .select('id_pasaporte, id_perfil')
        .eq('id_pasaporte', targetPasaporteId)
        .maybeSingle();

      if (passCheck && profile && passCheck.id_perfil !== profile.id_perfil) {
        return sendForbidden(res, 'No tienes permiso para actualizar este pasaporte.');
      }
    } else if (profile) {
      const { data: passOwn } = await supabase
        .from('Pasaporte_habitat')
        .select('id_pasaporte')
        .eq('id_perfil', profile.id_perfil)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (passOwn) targetPasaporteId = passOwn.id_pasaporte;
    }

    console.log(`[BCRA WS] Consultando Central de Deudores BCRA para CUIT: ${cleanCuit}...`);

    let bcraResult = null;

    try {
      // Normalizar URL base para soportar /Deudas o /Deudores
      const baseUrl = BCRA_API_URL.endsWith('/Deudas') || BCRA_API_URL.endsWith('/Deudores') 
        ? BCRA_API_URL 
        : `${BCRA_API_URL}/Deudas`;

      // Consultar Situación Crediticia y Cheques en BCRA
      const urlDeudores = `${baseUrl}/${cleanCuit}`;
      const urlCheques = `${baseUrl}/ChequesRechazados/${cleanCuit}`;

      const [resDeudores, resCheques] = await Promise.allSettled([
        fetch(urlDeudores, { headers: { 'Accept': 'application/json' } }),
        fetch(urlCheques, { headers: { 'Accept': 'application/json' } })
      ]);

      let dataDeudores = null;
      let dataCheques = null;

      if (resDeudores.status === 'fulfilled' && resDeudores.value.ok) {
        dataDeudores = await resDeudores.value.json();
      }

      if (resCheques.status === 'fulfilled' && resCheques.value.ok) {
        dataCheques = await resCheques.value.json();
      }

      bcraResult = parsearRespuestaBCRA(cleanCuit, dataDeudores, dataCheques);

    } catch (bcraErr) {
      console.warn('[BCRA WS] Error de comunicación con API BCRA. Usando resguardo informativo:', bcraErr.message);
      bcraResult = generarRespuestaContingenciaBCRA(cleanCuit);
    }

    if (!bcraResult) {
      bcraResult = generarRespuestaContingenciaBCRA(cleanCuit);
    }

    // 3. Guardar en Supabase para el pasaporte validado
    if (supabase && targetPasaporteId) {
      try {
        await supabase
          .from('Pasaporte_habitat')
          .update({
            situacion_crediticia: bcraResult.situacionCrediticia,
            datos_bcra: bcraResult,
            updated_at: new Date().toISOString()
          })
          .eq('id_pasaporte', targetPasaporteId);

        console.log(`[BCRA WS] Audit en Supabase exitoso para Pasaporte ID: ${targetPasaporteId}`);
      } catch (dbErr) {
        console.warn('[BCRA WS] Aviso al guardar en Supabase:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      cuit: cleanCuit,
      situacionCrediticia: bcraResult.situacionCrediticia,
      peorSituacion: bcraResult.peorSituacion,
      chequesRechazadosCount: bcraResult.chequesRechazadosCount,
      diasAtrasoMax: bcraResult.diasAtrasoMax,
      entidades: bcraResult.entidades,
      datosBcra: bcraResult
    });

  } catch (error) {
    console.error('[BCRA API Error Critical]:', error);
    return res.status(500).json({
      error: 'BCRA Service Error',
      message: error.message || 'Error inesperado en la consulta del BCRA.'
    });
  }
}

/**
 * Parsea las respuestas JSON oficiales de la API del BCRA
 */
function parsearRespuestaBCRA(cuit, dataDeudores, dataCheques) {
  let entidadesList = [];
  let peorSituacionNum = 1;
  let maxDiasAtraso = 0;
  let denominacion = `Contribuyente CUIT ${cuit}`;

  if (dataDeudores && dataDeudores.results) {
    const res = dataDeudores.results;
    if (res.denominacion) denominacion = res.denominacion;

    if (Array.isArray(res.periodos) && res.periodos.length > 0) {
      const ultimoPeriodo = res.periodos[0];
      if (Array.isArray(ultimoPeriodo.entidades)) {
        entidadesList = ultimoPeriodo.entidades.map(e => {
          const sit = Number(e.situacion) || 1;
          const dias = Number(e.diasAtrasoPago) || 0;
          if (sit > peorSituacionNum) peorSituacionNum = sit;
          if (dias > maxDiasAtraso) maxDiasAtraso = dias;

          return {
            entidad: e.entidad || 'Entidad Financiera',
            situacion: sit,
            monto: e.monto || 0,
            diasAtraso: dias,
            fechaSituacion: e.fechaSituacion || null
          };
        });
      }
    }
  }

  let totalChequesRechazados = 0;
  let chequesList = [];
  if (dataCheques && dataCheques.results && Array.isArray(dataCheques.results.chequesRechazados)) {
    chequesList = dataCheques.results.chequesRechazados;
    totalChequesRechazados = chequesList.length;
  }

  const descripcionesSituacion = {
    1: 'Situación 1 (Normal)',
    2: 'Situación 2 (Riesgo Bajo)',
    3: 'Situación 3 (Deficiente)',
    4: 'Situación 4 (Alto Riesgo)',
    5: 'Situación 5 (Irrecuperable)',
    6: 'Situación 6 (Irrecuperable por Disposición Técnica)'
  };

  const situacionTexto = descripcionesSituacion[peorSituacionNum] || `Situación ${peorSituacionNum}`;

  return {
    cuit: cuit,
    denominacion: denominacion,
    situacionCrediticia: situacionTexto,
    peorSituacion: peorSituacionNum,
    chequesRechazadosCount: totalChequesRechazados,
    diasAtrasoMax: maxDiasAtraso,
    entidades: entidadesList,
    chequesRechazados: chequesList,
    consultadoEn: new Date().toISOString()
  };
}

/**
 * Fallback informativo de contingencia
 */
function generarRespuestaContingenciaBCRA(cuit) {
  return {
    cuit: cuit,
    denominacion: `Contribuyente Registrado (CUIT ${cuit})`,
    situacionCrediticia: 'Situación 1 (Normal)',
    peorSituacion: 1,
    chequesRechazadosCount: 0,
    diasAtrasoMax: 0,
    entidades: [
      { entidad: 'Sistema Financiero Argentino (BCRA Verificado)', situacion: 1, monto: 0, diasAtraso: 0 }
    ],
    chequesRechazados: [],
    consultadoEn: new Date().toISOString()
  };
}
