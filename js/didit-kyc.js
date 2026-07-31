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
  const { mode = 'redirect', callbackUrl = null } = options;

  if (!userId) {
    const errorMsg = 'No se especificó un ID de usuario válido para iniciar el KYC.';
    alert(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // 1. Mostrar estado de carga si existe botón o feedback visual
    console.log(`[KYC Frontend] Solicitando sesión Didit KYC para usuario: ${userId}...`);

    // 2. Realizar la petición POST a la Serverless Function de Vercel
    const response = await fetch('/api/create-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        callbackUrl: callbackUrl
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.url) {
      throw new Error(data.message || data.error || 'Error al obtener la URL de sesión de Didit.');
    }

    const verificationUrl = data.url;
    console.log('[KYC Frontend] Sesión creada con éxito. Redirect URL:', verificationUrl);

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
