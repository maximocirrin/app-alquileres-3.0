/**
 * Módulo de Verificación de Identidad para Propietarios y Corredores (Modelo Híbrido)
 * Hábitat Plataforma Inmobiliaria
 * 
 * Permite publicación ágil al final del Wizard con opción de Insignia Verificada,
 * y exige la validación obligatoria al momento de firmar contratos y liquidar alquileres.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'habitat_verified_owners';

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

  function isOwnerVerified(email) {
    if (!email) return false;
    const list = getVerifiedOwners();
    return Boolean(list[email.toLowerCase().trim()]?.verified);
  }

  /**
   * Inicia el flujo de verificación de identidad con Didit KYC para el Propietario
   */
  async function iniciarVerificacionPropietario(emailParam = null) {
    const currentEmail = emailParam || 
      (document.getElementById('contact-email') && document.getElementById('contact-email').value.trim()) ||
      (document.getElementById('owner-email-input') && document.getElementById('owner-email-input').value.trim()) ||
      (localStorage.getItem('habitat_user') && JSON.parse(localStorage.getItem('habitat_user')).email) ||
      'propietario@habitat.ar';

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
   * Muestra el modal de decisión de verificación al final del Wizard de publicación
   */
  function promptVerificationBeforePublish({ email, onProceed }) {
    const ownerEmail = email || 
      (document.getElementById('contact-email') && document.getElementById('contact-email').value.trim()) ||
      (localStorage.getItem('habitat_user') && JSON.parse(localStorage.getItem('habitat_user')).email) ||
      'propietario@habitat.ar';

    // Si ya está verificado, continuar directamente con insignia
    if (isOwnerVerified(ownerEmail)) {
      if (typeof onProceed === 'function') onProceed(true);
      return;
    }

    const modalId = 'publish-didit-prompt-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const modalHtml = `
      <div id="${modalId}" class="fixed inset-0 z-[999999] overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-body animate-fadeIn">
        <div class="relative w-full max-w-lg bg-zinc-900 text-white rounded-3xl shadow-2xl border border-primary/40 p-6 sm:p-8 space-y-6 overflow-hidden">
          
          <div class="flex items-center gap-3.5 pb-4 border-b border-zinc-800">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-rose-600 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
              <span class="material-symbols-outlined text-white text-2xl">verified_user</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-headline font-extrabold text-lg text-white">Insignia de Propietario Verificado</h3>
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">DIDIT KYC</span>
              </div>
              <p class="text-xs text-zinc-400">Validá tu identidad antes de publicar tu alquiler</p>
            </div>
          </div>

          <div class="space-y-3 text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800">
            <p class="font-bold text-white text-xs">Beneficios de publicar con identidad validada:</p>
            <div class="space-y-2 pt-1">
              <div class="flex items-center gap-2 text-emerald-400 font-semibold">
                <span class="material-symbols-outlined text-base shrink-0">verified</span>
                <span>Insignia oficial <b>Propietario Verificado</b> en las fotos del aviso</span>
              </div>
              <div class="flex items-center gap-2 text-emerald-400 font-semibold">
                <span class="material-symbols-outlined text-base shrink-0">trending_up</span>
                <span>Posicionamiento Top en el Marketplace y hasta <b>3x más consultas</b></span>
              </div>
              <div class="flex items-center gap-2 text-emerald-400 font-semibold">
                <span class="material-symbols-outlined text-base shrink-0">speed</span>
                <span>Firma instantánea de contratos en solo <b>5 segundos</b></span>
              </div>
            </div>
          </div>

          <div class="space-y-3 pt-1">
            <button id="btn-modal-verify-and-publish" type="button" class="w-full py-3.5 px-6 rounded-2xl bg-primary hover:bg-primary-container text-white font-headline font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95">
              <span class="material-symbols-outlined text-xl">face</span>
              <span>Verificar con Didit KYC y Publicar</span>
            </button>

            <button id="btn-modal-skip-verification" type="button" class="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-headline font-semibold text-xs transition-colors cursor-pointer text-center">
              Publicar sin verificar por ahora
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modalEl = document.getElementById(modalId);
    const verifyBtn = document.getElementById('btn-modal-verify-and-publish');
    const skipBtn = document.getElementById('btn-modal-skip-verification');

    if (verifyBtn) {
      verifyBtn.onclick = async () => {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = `<span class="material-symbols-outlined text-lg animate-spin">sync</span><span>Abriendo Didit KYC...</span>`;
        try {
          const res = await iniciarVerificacionPropietario(ownerEmail);
          if (modalEl) modalEl.remove();
          if (res && res.success) {
            if (typeof onProceed === 'function') onProceed(true);
          } else {
            // Si canceló o falló, preguntar si desea publicar sin verificar
            if (confirm('No se completó la verificación biométrica. ¿Deseas publicar la propiedad de forma estándar sin insignia?')) {
              if (typeof onProceed === 'function') onProceed(false);
            }
          }
        } catch (e) {
          if (modalEl) modalEl.remove();
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
  window.HabitatOwnerVerification = {
    isOwnerVerified,
    setOwnerVerified,
    iniciarVerificacionPropietario,
    promptVerificationBeforePublish
  };

})();
