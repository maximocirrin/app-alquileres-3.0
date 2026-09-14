/**
 * Client for the server-authoritative Didit KYC flow.
 *
 * Identity data and approval are never written from the browser. The backend
 * binds a Didit session to the authenticated subject and persists its decision.
 */
(function () {
  'use strict';

  const MAX_POLL_ATTEMPTS = 90;

  function isDiditUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && (url.hostname === 'didit.me' || url.hostname.endsWith('.didit.me'));
    } catch {
      return false;
    }
  }

  async function authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    try {
      const { data } = await window.supabaseClient?.auth.getSession();
      const token = data?.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch (_) {
      // The endpoint returns an ordinary authentication error if there is no session.
    }
    return headers;
  }

  async function requestJson(path, body) {
    const response = await fetch(path, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(body || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || data.error || `Verification request failed (${response.status}).`);
    }
    return data;
  }

  /** Creates a server-bound Didit session. `userId` is retained only for API compatibility. */
  async function createDiditSession(_userId, options = {}) {
    const callbackUrl = options.callbackUrl || window.location.href.split('#')[0];
    const body = {
      callbackUrl,
      flow: options.flow === 'signature' || options.flow === 'contract_signature' ? 'signature' : 'passport',
      isLivenessOnly: Boolean(options.isLivenessOnly),
      ...(options.garanteToken ? { garanteToken: options.garanteToken } : {})
    };
    const data = await requestJson('/api/create-session', body);
    if (!data.url || !data.sessionId || !isDiditUrl(data.url)) {
      throw new Error('El proveedor de identidad no devolvió una sesión válida.');
    }
    return { url: data.url, sessionId: data.sessionId, isReal: true };
  }

  /** Queries the backend; the backend alone contacts Didit and validates binding. */
  async function fetchSessionDecision(sessionId, options = {}) {
    if (!/^[A-Za-z0-9_-]{6,200}$/.test(String(sessionId || ''))) return null;
    try {
      return await requestJson('/api/session-decision', {
        sessionId,
        ...(options.garanteToken ? { garanteToken: options.garanteToken } : {})
      });
    } catch (error) {
      console.warn('[Didit KYC] No se pudo consultar la decisión del servidor:', error.message);
      return null;
    }
  }

  /**
   * Shows the provider iframe. postMessage only causes a server re-check; its
   * payload is never treated as evidence or as an approval decision.
   */
  function renderDiditIframeModal(url, sessionId, options = {}) {
    if (!isDiditUrl(url)) return Promise.reject(new Error('URL de verificación no permitida.'));

    return new Promise((resolve) => {
      const modalId = 'vivat-didit-real-kyc-modal';
      document.getElementById(modalId)?.remove();

      const modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;inset:0;z-index:99999999;background:#fff;margin:0;padding:0;overflow:hidden;';
      const frame = document.createElement('iframe');
      frame.id = 'didit-real-iframe';
      frame.src = url;
      frame.title = 'Verificación de identidad';
      frame.style.cssText = 'width:100vw;height:100vh;border:0;display:block;';
      frame.setAttribute('allow', 'camera; microphone; display-capture; autoplay; clipboard-write; fullscreen');
      frame.setAttribute('referrerpolicy', 'strict-origin');
      modal.appendChild(frame);
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = 'Volver al contrato';
      close.style.cssText = 'position:absolute;right:16px;top:16px;padding:10px 16px;border:1px solid #d4d4d8;border-radius:8px;background:white;color:#18181b;font:500 14px system-ui;cursor:pointer;';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Verificación de identidad con Didit');
      modal.appendChild(close);
      const previousFocus = document.activeElement;
      document.body.appendChild(modal);
      close.focus();

      let completed = false;
      let attempts = 0;
      let timer = null;
      let polling = false;
      const getServerDecision = typeof options.fetchDecision === 'function'
        ? options.fetchDecision
        : () => fetchSessionDecision(sessionId, options);

      const finish = (decision) => {
        if (completed) return;
        completed = true;
        if (timer) clearTimeout(timer);
        window.removeEventListener('message', messageHandler);
        window.removeEventListener('keydown', keyHandler);
        modal.remove();
        previousFocus?.focus();
        resolve(decision || { status: 'IN_PROGRESS', sessionId });
      };

      const poll = async (immediate = false) => {
        if (completed || polling) return;
        polling = true;
        attempts += 1;
        let decision = null;
        try {
          decision = await getServerDecision();
        } catch (error) {
          console.warn('[Didit KYC] No se pudo consultar la decisión del servidor:', error.message);
        } finally {
          polling = false;
        }
        if (completed) return;
        if (decision && ['APPROVED', 'DECLINED', 'REVIEW_REQUIRED'].includes(decision.status)) {
          finish({ ...decision, sessionId });
          return;
        }
        if (attempts >= MAX_POLL_ATTEMPTS) {
          finish({ status: 'IN_PROGRESS', sessionId, isPending: true });
          return;
        }
        const delay = immediate ? 1_000 : Math.min(10_000, 2_500 + attempts * 250);
        timer = window.setTimeout(() => poll(false), delay);
      };

      const messageHandler = (event) => {
        // A Didit completion message is only a hint to poll sooner. Require the
        // expected frame and its declared Didit origin to reduce noisy messages.
        if (event.source !== frame.contentWindow || !isDiditUrl(event.origin)) return;
        if (timer) clearTimeout(timer);
        poll(true);
      };

      const keyHandler = event => { if (event.key === 'Escape') finish({ status: 'IN_PROGRESS', sessionId, cancelled: true }); };
      close.onclick = () => finish({ status: 'IN_PROGRESS', sessionId, cancelled: true });
      window.addEventListener('keydown', keyHandler);

      window.addEventListener('message', messageHandler);
      timer = window.setTimeout(() => poll(false), 2_500);
    });
  }

  async function iniciarKYC(userId, options = {}) {
    const session = await createDiditSession(userId, options);
    return renderDiditIframeModal(session.url, session.sessionId, options);
  }

  window.iniciarKYC = iniciarKYC;
  window.DiditKYC = { iniciarKYC, createDiditSession, fetchSessionDecision, renderDiditIframeModal };
})();
