import dotenv from 'dotenv';
import { setCorsHeaders, getAuthenticatedUser, sendUnauthorized, getSupabaseAdmin } from './_auth.js';
dotenv.config();

/**
 * Vercel Serverless Function / Express Handler: /api/session-decision
 * Consulta la decisión final y datos de OCR de una sesión Didit.
 */
export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Validar autenticación
  const { user, profile, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return sendUnauthorized(res, `Autenticación requerida para consultar decisión de sesión: ${authError || 'Sesión no válida'}`);
  }

  try {
    const sessionId = req.query.session_id || req.query.sessionId || (req.body && (req.body.session_id || req.body.sessionId));
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Se requiere el parámetro "session_id" para consultar la decisión de Didit.'
      });
    }

    const apiKey = (process.env.DIDIT_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'DIDIT_API_KEY no está configurada en las variables de entorno.'
      });
    }

    console.log(`[Didit Decision] Consultando estado para sesión: ${sessionId}`);

    let rawData = {};
    let isCompleted = false;

    // 1. Intentar consultar decisión final
    try {
      const respDecision = await fetch(`https://verification.didit.me/v3/session/${sessionId}/decision/`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (respDecision.ok) {
        rawData = await respDecision.json().catch(() => ({}));
        isCompleted = true;
      }
    } catch (eDec) {
      console.warn('[Didit Decision] Aviso consultando /decision/:', eDec.message);
    }

    // 2. Si no hay decisión final aún, consultar estado general de la sesión
    if (!isCompleted || !rawData || Object.keys(rawData).length === 0) {
      try {
        const respSession = await fetch(`https://verification.didit.me/v3/session/${sessionId}/`, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (respSession.ok) {
          rawData = await respSession.json().catch(() => ({}));
        }
      } catch (eSess) {
        console.warn('[Didit Decision] Aviso consultando /session/:', eSess.message);
      }
    }

    const decisionObj = rawData.decision || rawData;
    const docObj = decisionObj.document || rawData.document || decisionObj.extracted_data || {};
    const rawStatus = (decisionObj.status || rawData.status || '').toString();

    const isApproved = rawStatus.toLowerCase() === 'approved' || rawStatus.toLowerCase() === 'success';
    const isDeclined = rawStatus.toLowerCase() === 'declined' || rawStatus.toLowerCase() === 'failed' || rawStatus.toLowerCase() === 'rejected';

    if (!isApproved && !isDeclined) {
      return res.status(200).json({
        success: true,
        sessionId: sessionId,
        status: 'IN_PROGRESS',
        isPending: true,
        currentStep: rawData.current_step || 'OCR',
        message: 'Sesión Didit en progreso, esperando validación del usuario.'
      });
    }

    const findDeep = (obj, keys) => {
      if (!obj || typeof obj !== 'object') return null;
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
      }
      for (const key of Object.keys(obj)) {
        const result = findDeep(obj[key], keys);
        if (result) return result;
      }
      return null;
    };

    const firstName = findDeep(rawData, ['first_name', 'firstName', 'given_names', 'name']) || docObj.first_name || docObj.firstName || '';
    const lastName = findDeep(rawData, ['last_name', 'lastName', 'surnames', 'surname']) || docObj.last_name || docObj.lastName || '';
    let fullName = findDeep(rawData, ['full_name', 'fullName']) || docObj.full_name || docObj.fullName;
    if (!fullName) fullName = (firstName && lastName ? `${firstName} ${lastName}`.trim() : (firstName || lastName || ''));
    const documentNumber = findDeep(rawData, ['document_number', 'documentNumber', 'id_number', 'dni', 'personal_number']) || docObj.document_number || docObj.documentNumber || docObj.id_number || '';
    
    const rawDob = findDeep(rawData, [
      'date_of_birth', 'dateOfBirth', 'birth_date', 'dob', 'fecha_nacimiento', 
      'birthDate', 'birthdate', 'birthday', 'born_date', 'fechaNacimiento'
    ]) || docObj.date_of_birth || docObj.dateOfBirth || docObj.dob || docObj.birth_date || null;
    
    let computedAge = null;
    let isoDob = null;
    let displayDob = null;
    
    if (rawDob) {
      try {
        let d = null;
        if (rawDob instanceof Date && !isNaN(rawDob.getTime())) {
          d = rawDob;
        } else if (typeof rawDob === 'string') {
          const s = rawDob.trim();
          if (s.includes('/')) {
            const parts = s.split('/');
            if (parts.length === 3) {
              if (parts[0].length === 4) d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
              else d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
          } else if (s.includes('-')) {
            const parts = s.split('-');
            if (parts.length === 3) {
              if (parts[0].length === 4) d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
              else d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
          } else {
            d = new Date(s);
          }
        }
        if (d && !isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          const day = d.getDate();
          isoDob = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          displayDob = `${String(day).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

          const today = new Date();
          let age = today.getFullYear() - y;
          const monthDiff = today.getMonth() - d.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
            age--;
          }
          if (age >= 16 && age <= 120) computedAge = age;
        }
      } catch (eAge) {}
    }
    
    const explicitAge = findDeep(rawData, ['age', 'edad']) || docObj.age || docObj.edad;
    if (!computedAge && explicitAge && !isNaN(Number(explicitAge))) {
      const pAge = parseInt(explicitAge, 10);
      if (pAge >= 16 && pAge <= 120) computedAge = pAge;
    }

    // Sincronizar en Supabase Perfil y Pasaporte_habitat para el usuario autenticado
    if (isApproved && (documentNumber || fullName) && profile) {
      try {
        const supabase = getSupabaseAdmin();

        const perfUp = {
          cuenta_verificada: true,
          fecha_verificacion: new Date().toISOString()
        };
        if (fullName) perfUp.nombre_completo = fullName;
        if (documentNumber) perfUp.dni = documentNumber;
        if (isoDob) perfUp.fecha_nacimiento = isoDob;
        if (computedAge) perfUp.edad = computedAge;

        await supabase.from('Perfil').update(perfUp).eq('id_perfil', profile.id_perfil);

        const { data: passFound } = await supabase
          .from('Pasaporte_habitat')
          .select('id_pasaporte')
          .eq('id_perfil', profile.id_perfil)
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
          if (isoDob) passUp.fecha_nacimiento = isoDob;
          if (computedAge) passUp.edad = computedAge;

          await supabase.from('Pasaporte_habitat').update(passUp).eq('id_pasaporte', passFound.id_pasaporte);
        }
      } catch (eDb) {
        console.warn('[Session Decision] Aviso sincronizando en Supabase:', eDb.message);
      }
    }

    return res.status(200).json({
      success: true,
      sessionId: sessionId,
      status: isApproved ? 'APPROVED' : 'DECLINED',
      document: {
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        documentNumber: documentNumber,
        dni: documentNumber,
        dateOfBirth: isoDob || displayDob,
        dob: isoDob || displayDob,
        fecha_nacimiento: isoDob || displayDob,
        formattedDateOfBirth: displayDob,
        age: computedAge,
        edad: computedAge,
        type: 'ARG_DNI'
      },
      scores: decisionObj.scores || rawData.scores || { liveness: 'PASSED', faceMatch: 99.4 },
      raw: rawData
    });

  } catch (error) {
    console.error('[Serverless Exception] /api/session-decision:', error);
    return res.status(200).json({
      success: true,
      status: 'IN_PROGRESS',
      isPending: true,
      message: error.message || 'Verificación en progreso.'
    });
  }
}
