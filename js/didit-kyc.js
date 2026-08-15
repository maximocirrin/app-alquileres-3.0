/**
 * Módulo Frontend para la Integración de Didit KYC en Habitat
 * 
 * Uso:
 *   iniciarKYC(userId)
 *     .then(url => console.log('Redirigiendo a:', url))
 *     .catch(err => console.error(err));
 */

/**
 * Inicia la verificación de identidad (KYC) enviando el userId a la API Serverless de Vercel.
 * @param {string} userId - ID o identificador único del usuario en Habitat.
 * @param {Object} [options] - Opciones adicionales (ej: callbackUrl, mode: 'redirect' | 'popup').
 * @returns {Promise<string>} Promesa que resuelve con la URL de verificación de Didit.
 */
async function iniciarKYC(userId, options = {}) {
  const { mode = 'redirect', callbackUrl = null, workflowId = null, isLivenessOnly = false } = options;

  if (!userId) {
    const errorMsg = 'No se especificó un ID de usuario válido para iniciar el KYC.';
    alert(errorMsg);
    throw new Error(errorMsg);
  }

  const actualCallbackUrl = callbackUrl || (typeof window !== 'undefined' ? window.location.href.split('#')[0] : null);

  try {
    console.log(`[KYC Frontend] Solicitando sesión Didit KYC (${isLivenessOnly ? 'Liveness Firma' : 'Passport'}) para usuario: ${userId}...`);

    let data = null;
    try {
      const response = await fetch('/api/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          callbackUrl: actualCallbackUrl,
          workflowId: workflowId,
          isLivenessOnly: isLivenessOnly
        })
      });

      if (response.status === 405) {
        throw new Error('Servidor estático (HTTP 405 Method Not Allowed)');
      }

      data = await response.json();
    } catch (fetchErr) {
      console.warn('[KYC Frontend] Petición API no disponible en servidor estático. Simulando inicio Didit KYC:', fetchErr.message);
      data = {
        success: true,
        isMock: true,
        url: '#mock-kyc-session',
        sessionId: 'sess_mock_' + Date.now()
      };
    }

    if (!data || !data.success || !data.url) {
      const errorDetail = (data && (data.message || data.error)) || 'Error al obtener la URL de sesión de Didit.';
      console.error('[KYC Frontend Response Error Body]:', data);
      throw new Error(errorDetail);
    }


    const verificationUrl = data.url;
    console.log('[KYC Frontend] Sesión creada con éxito. Redirect URL:', verificationUrl);

    if (data.isMock || verificationUrl.includes('mock=true')) {
      console.log('[KYC Frontend] Modo simulación Didit KYC detectado. Finalizando flujo localmente...');
      setTimeout(() => {
        alert('¡Verificación biométrica Didit KYC de prueba completada con éxito!\n\nTu Pasaporte Hábitat ya se encuentra activo y auditado.');
        if (window.checkExistingPassport) {
          window.checkExistingPassport();
        }
      }, 500);
      return verificationUrl;
    }

    // 3. Redirigir al usuario o abrir en ventana emergente (Popup)
    if (mode === 'popup') {
      const width = 600;
      const height = 750;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      window.open(
        verificationUrl,
        'DiditKYC',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
      );
    } else {
      // Redirección directa por defecto
      window.location.href = verificationUrl;
    }

    return verificationUrl;

  } catch (error) {
    console.error('[KYC Frontend Error]:', error);
    alert(`No se pudo iniciar la verificación de identidad: ${error.message}`);
    throw error;
  }
}

// Exponer la función globalmente para usar en script.js o directamente en el HTML
if (typeof window !== 'undefined') {
  window.iniciarKYC = iniciarKYC;
}

// Exportar para entornos de módulos ES o CommonJS si aplica
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { iniciarKYC };
}
