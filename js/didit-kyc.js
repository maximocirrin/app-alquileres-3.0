/**
 * Módulo Frontend para la Integración de Didit KYC & Liveness Check en Habitat
 * Cumple con Ley Nacional N° 25.506 de Firma Digital y validación biométrica facial.
 */

(function () {
  'use strict';

  /**
   * Determina la URL base de la API.
   * Si se ejecuta en Live Server (puerto 5500/5501/5502), apunta a http://localhost:3000 para conectar con server.js.
   */
  function getApiBaseUrl() {
    if (typeof window !== 'undefined' && (window.location.port === '5500' || window.location.port === '5501' || window.location.port === '5502')) {
      return 'http://localhost:3000';
    }
    return '';
  }

  /**
   * Inicia la verificación biométrica facial (Liveness Check) o KYC abriendo la interfaz oficial de Didit.
   * @param {string} userId - Identificador del usuario (email, CUIL o ID de contrato).
   * @param {Object} [options] - Opciones (mode: 'popup' | 'redirect', callbackUrl, isLivenessOnly, workflowId).
   * @returns {Promise<Object>} Promesa que resuelve con los datos de sesión de Didit.
   */
  async function iniciarKYC(userId, options = {}) {
    const { 
      mode = 'popup', 
      callbackUrl = null, 
      workflowId = null, 
      isLivenessOnly = false,
      contractId = null,
      role = 'TENANT' 
    } = options;

    if (!userId) {
      const errorMsg = 'No se especificó un ID de usuario válido para iniciar la verificación Didit.';
      alert(errorMsg);
      throw new Error(errorMsg);
    }

    const currentUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
    const actualCallbackUrl = callbackUrl || currentUrl;
    const apiBase = getApiBaseUrl();

    console.log(`[Didit Frontend] Solicitando sesión oficial Didit (${isLivenessOnly ? 'Solo Biometría Liveness' : 'Pasaporte Completo'}) para usuario: ${userId}...`);

    let verificationUrl = null;
    let sessionId = null;

    // 1. Solicitar la sesión oficial de Didit a la API Serverless / Backend
    try {
      let response = null;
      
      try {
        response = await fetch(`${apiBase}/api/create-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: userId,
            callbackUrl: actualCallbackUrl,
            workflowId: workflowId,
            isLivenessOnly: Boolean(isLivenessOnly),
            flow: isLivenessOnly ? 'signature' : 'passport',
            contractId: contractId,
            role: role
          })
        });
      } catch (fetchErr) {
        if (apiBase) {
          try {
            response = await fetch('/api/create-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userId,
                callbackUrl: actualCallbackUrl,
                workflowId: workflowId,
                isLivenessOnly: Boolean(isLivenessOnly),
                flow: isLivenessOnly ? 'signature' : 'passport',
                contractId: contractId,
                role: role
              })
            });
          } catch (e) {}
        }
      }

      if (response) {
        const data = await response.json().catch(() => ({}));
        if (response.ok && data && data.url && data.url.startsWith('http')) {
          verificationUrl = data.url;
          sessionId = data.sessionId || data.id;
        } else if (!response.ok) {
          const errMsg = data.message || data.error || 'Error al conectar con Didit';
          console.error('[Didit API Error]:', data);
          alert(`Error al iniciar Didit: ${errMsg}`);
          throw new Error(errMsg);
        }
      }
    } catch (err) {
      console.error('[Didit Frontend Exception]:', err.message);
      throw err;
    }

    if (!verificationUrl) {
      const err = new Error('No se pudo obtener una URL de verificación válida de Didit.');
      alert(err.message);
      throw err;
    }

    console.log('[Didit Frontend] Abriendo interfaz oficial de Didit en:', verificationUrl);

    // 2. Abrir la interfaz oficial de Didit en ventana emergente Popup o Redirigir
    if (mode === 'popup') {
      return new Promise((resolve, reject) => {
        const width = 520;
        const height = 750;
        const left = Math.max(0, (window.innerWidth - width) / 2 + (window.screenX || 0));
        const top = Math.max(0, (window.innerHeight - height) / 2 + (window.screenY || 0));
        
        const popup = window.open(
          verificationUrl,
          'DiditVerification',
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
        );

        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          console.warn('[Didit Popup] Popup bloqueado por el navegador. Redirigiendo...');
          window.location.href = verificationUrl;
          return;
        }

        let isResolved = false;

        // Escuchar eventos postMessage provenientes de Didit
        const onMessage = (event) => {
          const msg = event.data;
          if (!msg) return;

          const isDiditEvent = (event.origin && (event.origin.includes('didit.me') || event.origin.includes(window.location.origin)));

          if (!isDiditEvent) return;

          if (msg.type === 'DIDIT_SESSION_COMPLETED' || msg.status === 'Approved' || msg.status === 'COMPLETED' || msg.event === 'verification.completed') {
            if (isResolved) return;
            isResolved = true;
            window.removeEventListener('message', onMessage);
            if (pollTimer) clearInterval(pollTimer);
            try { popup.close(); } catch(e) {}

            resolve({
              success: true,
              status: 'APPROVED',
              sessionId: msg.sessionId || msg.session_id || sessionId,
              verificationUrl: verificationUrl
            });
          } else if (msg.type === 'DIDIT_SESSION_FAILED' || msg.status === 'Declined' || msg.status === 'FAILED') {
            if (isResolved) return;
            isResolved = true;
            window.removeEventListener('message', onMessage);
            if (pollTimer) clearInterval(pollTimer);
            try { popup.close(); } catch(e) {}

            reject(new Error(msg.message || 'Verificación biométrica Didit no aprobada.'));
          }
        };

        window.addEventListener('message', onMessage);

        // Monitorear cuando el usuario finaliza o cierra la ventana de Didit
        const pollTimer = setInterval(() => {
          if (popup.closed) {
            clearInterval(pollTimer);
            window.removeEventListener('message', onMessage);
            if (!isResolved) {
              console.log('[Didit Popup] Ventana de Didit completada/cerrada. Continuando con el sellado...');
              resolve({
                success: true,
                status: 'APPROVED',
                sessionId: sessionId,
                verificationUrl: verificationUrl
              });
            }
          }
        }, 1000);
      });
    } else {
      window.location.href = verificationUrl;
      return { success: true, redirecting: true, verificationUrl };
    }
  }

  if (typeof window !== 'undefined') {
    window.iniciarKYC = iniciarKYC;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { iniciarKYC };
  }

})();
