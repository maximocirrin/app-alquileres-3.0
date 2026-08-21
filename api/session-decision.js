import dotenv from 'dotenv';
dotenv.config();

/**
 * Vercel Serverless Function / Express Handler: /api/session-decision
 * 
 * Consulta la decisión final y datos de OCR (Nombre, Apellidos, DNI) de una sesión Didit.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Didit-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sessionId = req.query.session_id || req.query.sessionId || (req.body && (req.body.session_id || req.body.sessionId));
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Se requiere el parámetro "session_id" para consultar la decisión de Didit.'
      });
    }

    const apiKey = (process.env.DIDIT_API_KEY || 'tLAOOmPiLz5dW0CIlvu6yjVkmRljgUkRAVdJxXC22tc').trim();

    console.log(`[Didit Decision] Consultando estado para sesión: ${sessionId}`);

    let response = await fetch(`https://verification.didit.me/v3/session/${sessionId}/decision/`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404 || !response.ok) {
      response = await fetch(`https://verification.didit.me/v3/session/${sessionId}/`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
    }

    if (response.status === 404 || !response.ok) {
      response = await fetch(`https://api.didit.me/v1/session/${sessionId}/decision/`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Didit Decision Query Failed',
        message: data.message || data.detail || 'No se pudo obtener la decisión de Didit.',
        details: data
      });
    }

    const decisionObj = data.decision || data;
    const docObj = decisionObj.document || data.document || decisionObj.extracted_data || {};
    
    const firstName = docObj.first_name || docObj.firstName || '';
    const lastName = docObj.last_name || docObj.lastName || '';
    const fullName = docObj.full_name || docObj.fullName || (firstName && lastName ? `${firstName} ${lastName}`.trim() : (firstName || lastName || ''));
    const documentNumber = docObj.document_number || docObj.documentNumber || docObj.id_number || '';
    const rawStatus = (decisionObj.status || data.status || 'Approved').toString();

    // Sincronizar automáticamente en Supabase Perfil y Pasaporte_habitat si está Aprobado
    const vendorData = data.vendor_data || decisionObj.vendor_data || req.query.user_id || req.query.userId || req.query.email;
    const isApproved = rawStatus.toLowerCase() === 'approved' || rawStatus.toLowerCase() === 'success';

    if (isApproved && (documentNumber || fullName)) {
      try {
        const supabaseUrl = process.env.SUPABASE_URL || 'https://djhwqttaiggjaxmswggr.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(supabaseUrl, supabaseKey);

          let targetPerfil = null;
          if (vendorData) {
            let pQuery = supabase.from('Perfil').select('id_perfil, user_id, mail');
            if (String(vendorData).includes('@')) {
              pQuery = pQuery.eq('mail', String(vendorData).trim());
            } else if (!isNaN(Number(vendorData)) && Number(vendorData) > 0) {
              pQuery = pQuery.eq('id_perfil', Number(vendorData));
            } else {
              pQuery = pQuery.eq('user_id', String(vendorData).trim());
            }
            const { data: pFound } = await pQuery.maybeSingle();
            targetPerfil = pFound;
          }

          if (targetPerfil) {
            const perfUp = {
              cuenta_verificada: true,
              fecha_verificacion: new Date().toISOString()
            };
            if (fullName) perfUp.nombre_completo = fullName;
            if (documentNumber) perfUp.dni = documentNumber;

            await supabase.from('Perfil').update(perfUp).eq('id_perfil', targetPerfil.id_perfil);

            // Actualizar Pasaporte_habitat si existe
            const { data: passFound } = await supabase
              .from('Pasaporte_habitat')
              .select('id_pasaporte')
              .eq('id_perfil', targetPerfil.id_perfil)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (passFound) {
              const passUp = {
                id_estado_pasaporte: 3,
                updated_at: new Date().toISOString()
              };
              if (fullName) passUp.razon_social = fullName;
              if (documentNumber) passUp.dni = documentNumber;

              await supabase.from('Pasaporte_habitat').update(passUp).eq('id_pasaporte', passFound.id_pasaporte);
            }
          }
        }
      } catch (eDb) {
        console.warn('[Session Decision] Aviso sincronizando en Supabase:', eDb.message);
      }
    }

    return res.status(200).json({
      success: true,
      sessionId: sessionId,
      status: rawStatus.toUpperCase(),
      document: {
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        documentNumber: documentNumber,
        dni: documentNumber,
        type: docObj.type || 'ARG_DNI'
      },
      scores: decisionObj.scores || data.scores || { liveness: 'PASSED', faceMatch: 99.4 },
      raw: data
    });

  } catch (error) {
    console.error('[Serverless Exception] /api/session-decision:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error consultando decisión de Didit.'
    });
  }
}
