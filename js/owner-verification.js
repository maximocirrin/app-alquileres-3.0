/**
 * Módulo de Verificación de Identidad para Propietarios y Corredores (Modelo Híbrido)
 * Vivat Plataforma Inmobiliaria
 * 
 * Permite publicación ágil al final del Wizard con opción de Insignia Verificada,
 * adaptado a Modo Claro y Modo Oscuro según el diseño visual del sistema.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'vivat_verified_owners';

  function getVerifiedOwners() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function setOwnerVerified(email, data = {}) {
    if (!email) return;
    const list = getVerifiedOwners();
    list[email.toLowerCase().trim()] = {
      verified: true,
      verifiedAt: new Date().toISOString(),
      sessionId: data.sessionId || `didit_kyc_${Date.now()}`,
      scores: data.scores || { faceMatch: 98.5, liveness: 'PASSED' },
      ...data
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function resetVerification(email = null) {
    if (email) {
      const list = getVerifiedOwners();
      delete list[email.toLowerCase().trim()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    console.log('[Didit Vivat]: Estado de verificación restablecido para pruebas.');
  }

  function isOwnerVerified(email) {
    try {
      // 1. Si no hay email, obtenerlo del entorno
      const targetEmail = email || 
        (document.getElementById('contact-email') && document.getElementById('contact-email').value.trim()) ||
        (document.getElementById('owner-email-input') && document.getElementById('owner-email-input').value.trim()) ||
        (localStorage.getItem('vivat_user') && JSON.parse(localStorage.getItem('vivat_user')).email) ||
        null;

      // 2. Verificar datos reales de pasaporte / KYC en localStorage
      const pData = JSON.parse(localStorage.getItem('vivat_passport_data') || '{}');
      const hasValidPassport = Boolean(
        pData && (pData.cuit || pData.id_pasaporte || pData.codigo_pasaporte || pData.status === 'valid' || pData.status === 'verified')
      );

      const didit = JSON.parse(localStorage.getItem('vivat_didit_identity') || '{}');
      const hasValidDidit = Boolean(
        didit && (didit.documentNumber || didit.status === 'APPROVED' || didit.verified)
      );

      const user = JSON.parse(localStorage.getItem('vivat_user') || '{}');
      const hasValidUser = Boolean(user && user.cuenta_verificada);

      // Si el usuario eliminó su pasaporte e identidad Didit, NO está verificado
      if (!hasValidPassport && !hasValidDidit && !hasValidUser && !window.hasActivePassport && !window.currentPasaporteId) {
        if (targetEmail) {
          const list = getVerifiedOwners();
          if (list[targetEmail.toLowerCase().trim()]) {
            delete list[targetEmail.toLowerCase().trim()];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
          }
        }
        return false;
      }

      if (targetEmail) {
        const list = getVerifiedOwners();
        if (list[targetEmail.toLowerCase().trim()]?.verified) {
          return true;
        }
      }

      return Boolean(hasValidPassport || hasValidDidit || hasValidUser);
    } catch (e) {
      return false;
    }
  }

  /**
   * Inicia el flujo de verificación de identidad con Didit KYC para el Propietario
   */
  async function iniciarVerificacionPropietario(emailParam = null) {
    const currentEmail = emailParam || 
      (document.getElementById('contact-email') && document.getElementById('contact-email').value.trim()) ||
      (document.getElementById('owner-email-input') && document.getElementById('owner-email-input').value.trim()) ||
      (localStorage.getItem('vivat_user') && JSON.parse(localStorage.getItem('vivat_user')).email) ||
      'propietario@vivat.ar';

    if (typeof window.iniciarKYC !== 'function') {
      alert('El servicio de verificación Didit no está disponible.');
      return { success: false };
    }

    const res = await window.iniciarKYC(currentEmail, {
      mode: 'popup',
      flow: 'passport',
      isLivenessOnly: false,
      role: 'OWNER'
    });

    if (res && res.status === 'APPROVED') {
      setOwnerVerified(currentEmail, {
        sessionId: res.sessionId,
        scores: res.scores
      });
      return { success: true, email: currentEmail, data: res };
    }
    return { success: false, data: res };
  }

  /**
   * Muestra el modal de decisión de verificación adaptado a Modo Claro y Modo Oscuro
   */
  function promptVerificationBeforePublish({ email, onProceed }) {
    const ownerEmail = email || 
      (document.getElementById('contact-email') && document.getElementById('contact-email').value.trim()) ||
      (localStorage.getItem('vivat_user') && JSON.parse(localStorage.getItem('vivat_user')).email) ||
      'propietario@vivat.ar';

    const alreadyVerified = isOwnerVerified(ownerEmail);

    const modalId = 'publish-didit-prompt-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const modalHtml = `
      <div id="${modalId}" class="fixed inset-0 z-[999999] overflow-y-auto bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-body animate-fadeIn">
        <div class="relative w-full max-w-lg bg-white dark:bg-[#141417] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-6 sm:p-8 space-y-6 overflow-hidden" onclick="event.stopPropagation()">
          
          <!-- Accent Line -->
          <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-rose-500 to-amber-500"></div>

          <!-- Header -->
          <div class="flex items-start justify-between gap-3 pb-2">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-red-500/10 text-primary dark:text-red-400 flex items-center justify-center shrink-0 border border-primary/20 dark:border-red-500/20 shadow-xs">
                <span class="material-symbols-outlined text-2xl">verified_user</span>
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="font-headline font-extrabold text-lg sm:text-xl text-zinc-900 dark:text-white tracking-tight">Insignia de Propietario Verificado</h3>
                  <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-500/20 dark:border-emerald-500/30 uppercase tracking-wide">DIDIT KYC</span>
                </div>
                <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Validá tu identidad antes de publicar tu alquiler</p>
              </div>
            </div>
            <button id="btn-close-didit-prompt" type="button" class="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1 rounded-xl transition-colors cursor-pointer">
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          ${alreadyVerified ? `
            <!-- Already Verified Badge Notice -->
            <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl shrink-0">check_circle</span>
              <div class="text-xs">
                <p class="font-bold text-emerald-800 dark:text-emerald-300">¡Tu identidad ya se encuentra verificada!</p>
                <p class="text-emerald-700 dark:text-emerald-400/90 mt-0.5">Tu aviso puede publicarse con la Insignia Oficial de Propietario Verificado.</p>
              </div>
            </div>
          ` : ''}

          <!-- Beneficios Box -->
          <div class="space-y-3 bg-zinc-50 dark:bg-zinc-900/60 p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
            <p class="font-headline font-bold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Beneficios de publicar con identidad validada:</p>
            <div class="space-y-3 pt-1">
              
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <span class="material-symbols-outlined text-lg">verified</span>
                </div>
                <p class="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                  Insignia oficial <b class="text-zinc-900 dark:text-white font-bold">Propietario Verificado</b> en las fotos del aviso.
                </p>
              </div>

              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <span class="material-symbols-outlined text-lg">trending_up</span>
                </div>
                <p class="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                  Posicionamiento Top en el Marketplace y hasta <b class="text-zinc-900 dark:text-white font-bold">3x más consultas</b>.
                </p>
              </div>

              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <span class="material-symbols-outlined text-lg">bolt</span>
                </div>
                <p class="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                  Firma legal instantánea de futuros contratos en solo <b class="text-zinc-900 dark:text-white font-bold">5 segundos</b>.
                </p>
              </div>

            </div>
          </div>

          <!-- Buttons -->
          <div class="space-y-2.5 pt-1">
            ${alreadyVerified ? `
              <button id="btn-modal-publish-verified-direct" type="button" class="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-headline font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95">
                <span class="material-symbols-outlined text-xl">verified</span>
                <span>Publicar con Insignia Verificada</span>
              </button>

              <button id="btn-modal-reverify" type="button" class="w-full py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-headline font-semibold text-xs transition-colors cursor-pointer text-center">
                Volver a escanear rostro biométrico
              </button>

              <button id="btn-modal-skip-verification" type="button" class="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-headline font-bold text-xs transition-colors cursor-pointer text-center">
                Publicar sin la insignia de verificado
              </button>
            ` : `
              <button id="btn-modal-verify-and-publish" type="button" class="w-full py-3.5 px-6 rounded-2xl bg-primary hover:bg-primary-container text-white font-headline font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95">
                <span class="material-symbols-outlined text-xl">face</span>
                <span>Verificar con Didit KYC y Publicar</span>
              </button>

              <button id="btn-modal-skip-verification" type="button" class="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-headline font-bold text-xs transition-colors cursor-pointer text-center">
                Publicar sin la insignia de verificado
              </button>
            `}
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modalEl = document.getElementById(modalId);
    const closeBtn = document.getElementById('btn-close-didit-prompt');
    const verifyBtn = document.getElementById('btn-modal-verify-and-publish');
    const skipBtn = document.getElementById('btn-modal-skip-verification');
    const directVerifiedBtn = document.getElementById('btn-modal-publish-verified-direct');
    const reverifyBtn = document.getElementById('btn-modal-reverify');

    if (modalEl) {
      modalEl.onclick = (e) => {
        if (e.target === modalEl) {
          modalEl.remove();
          if (typeof onProceed === 'function') onProceed(false);
        }
      };
    }

    if (closeBtn) {
      closeBtn.onclick = () => {
        if (modalEl) modalEl.remove();
        if (typeof onProceed === 'function') onProceed(false);
      };
    }

    if (directVerifiedBtn) {
      directVerifiedBtn.onclick = () => {
        if (modalEl) modalEl.remove();
        if (typeof onProceed === 'function') onProceed(true);
      };
    }

    if (reverifyBtn) {
      reverifyBtn.onclick = async () => {
        if (modalEl) modalEl.remove();
        try {
          const res = await iniciarVerificacionPropietario(ownerEmail);
          if (res && res.success) {
            if (typeof onProceed === 'function') onProceed(true);
          } else {
            if (typeof onProceed === 'function') onProceed(false);
          }
        } catch (e) {
          if (typeof onProceed === 'function') onProceed(false);
        }
      };
    }

    if (verifyBtn) {
      verifyBtn.onclick = async () => {
        if (modalEl) modalEl.remove();
        try {
          const res = await iniciarVerificacionPropietario(ownerEmail);
          if (res && res.success) {
            if (typeof onProceed === 'function') onProceed(true);
          } else {
            if (typeof onProceed === 'function') onProceed(false);
          }
        } catch (e) {
          if (typeof onProceed === 'function') onProceed(false);
        }
      };
    }

    if (skipBtn) {
      skipBtn.onclick = () => {
        if (modalEl) modalEl.remove();
        if (typeof onProceed === 'function') onProceed(false);
      };
    }
  }

  // Exponer al objeto global
  window.VivatOwnerVerification = {
    isOwnerVerified,
    setOwnerVerified,
    resetVerification,
    iniciarVerificacionPropietario,
    promptVerificationBeforePublish
  };

})();
