(() => {
  const $ = id => document.getElementById(id);
  let selected = null, preview = null, busy = false;
  let accountId = null, generation = 0;
  const urls = [];
  const roleName = role => ({ inquilino: 'Inquilino', propietario: 'Propietario', garante: 'Garante' }[role] || role);
  const status = message => { $('signing-status').textContent = message; };
  async function request(action, payload) {
    const epoch = generation;
    const { data } = await window.supabaseClient.auth.getSession();
    if (!data.session) { location.href = 'login.html?redirect=firmar'; throw new Error('Iniciá sesión para continuar.'); }
    const userId = data.session.user.id;
    if (accountId && accountId !== userId) throw new Error('La cuenta cambió. Volvé a abrir el contrato.');
    const response = await fetch(`/api/firmas/${action}`, { method: payload ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
      ...(payload ? { body: JSON.stringify(payload) } : {}) });
    const result = await response.json();
    const current = await window.supabaseClient.auth.getSession();
    if (generation !== epoch || current.data.session?.user.id !== userId) throw new Error('La sesión cambió. Volvé a abrir el contrato.');
    if (!response.ok || !result.ok) throw new Error(result.message || 'No se pudo completar la solicitud.');
    return result.data;
  }
  function addLink(label, url, download) {
    if (!url) return;
    const parsed = new URL(url, location.href);
    if (!['https:', 'blob:'].includes(parsed.protocol)) return;
    const link = document.createElement('a'); link.textContent = label; link.href = parsed.href;
    link.rel = 'noopener noreferrer'; link.target = '_blank';
    if (download) link.download = download;
    $('signing-files').append(link);
  }
  async function downloads() {
    const id = selected.id_contrato;
    const [documents, records, publicKeys] = await Promise.all([request(`finalizar?id_contrato=${id}`), request(`evidencias?id_contrato=${id}`), request('claves')]);
    if (selected?.id_contrato !== id) return;
    urls.forEach(URL.revokeObjectURL); urls.length = 0; $('signing-files').replaceChildren();
    addLink('Contrato original', documents.documentos.contrato_original);
    addLink('Contrato firmado', documents.documentos.contrato_final);
    addLink('Auditoría del inquilino', documents.documentos.audit_trail_inquilino);
    addLink('Auditoría del propietario', documents.documentos.audit_trail_propietario);
    (documents.documentos.auditorias_garantes || []).forEach(g => addLink(`Auditoría de garante · ${g.id_firma}`, g.url));
    (records.signatures || []).forEach(s => {
      if (!s.evidence) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(s.evidence, null, 2)], { type: 'application/json' }));
      urls.push(url); addLink(`Evidencia · ${roleName(s.role)} · ${s.id_firma}`, url, `evidencia-firma-${s.id_firma}.json`);
    });
    publicKeys.keys.forEach(key => {
      const url = URL.createObjectURL(new Blob([key.pem], { type: 'application/x-pem-file' }));
      urls.push(url); addLink(`Clave pública de Vivat · ${key.id.slice(0, 12)}`, url, `vivat-public-key-${key.id}.pem`);
    });
    if (documents.contrato_activo) status('Contrato completo: todas las firmas requeridas están registradas.');
    else if (documents.pendientes_garantes) status(`Faltan ${documents.pendientes_garantes} firma(s) de garantes para completar el contrato.`);
  }
  async function select(contract) {
    if (busy) return;
    selected = contract; preview = null;
    $('signing-review').hidden = false; $('signing-document').hidden = true;
    $('signing-title').textContent = `Contrato ${contract.id_contrato}`;
    $('signing-role').textContent = `Tu participación: ${roleName(contract.role)}`;
    $('signing-consent').checked = false; $('signing-submit').disabled = true;
    status('Prepará el PDF para revisar el documento que se va a firmar.');
    try { await downloads(); } catch (error) { status(error.message); }
  }
  $('signing-preview').onclick = async () => {
    if (busy) return; busy = true; $('signing-preview').disabled = true;
    preview = null; $('signing-consent').checked = false; $('signing-submit').disabled = true;
    try {
      status('Preparando el contrato y sus anexos…');
      preview = await request('previsualizar', { id_contrato: selected.id_contrato });
      const url = new URL(preview.url); if (url.protocol !== 'https:') throw new Error('Vista previa inválida.');
      $('signing-pdf-link').href = url.href; $('signing-pdf').src = url.href;
      $('signing-consent-text').textContent = preview.consent_text; $('signing-document').hidden = false;
      status('Revisá el PDF. El enlace vence en 10 minutos; podés prepararlo nuevamente.');
    } catch (error) { preview = null; status(error.message); }
    finally { busy = false; $('signing-preview').disabled = false; }
  };
  $('signing-consent').onchange = () => { $('signing-submit').disabled = !preview || !$('signing-consent').checked || busy; };
  $('signing-submit').onclick = async () => {
    if (busy || !preview || !$('signing-consent').checked) return;
    busy = true; $('signing-submit').disabled = true; $('signing-preview').disabled = true;
    try {
      const started = await request('iniciar', { id_contrato: selected.id_contrato, documentHash: preview.hash,
        consentGiven: true, consentVersion: preview.consent_version, callbackUrl: `${location.origin}/firmar.html` });
      const sealed = ['sellada', 'completada'].includes(started.estado_firma);
      const decision = sealed || started.estado_firma === 'biometria_aprobada' ? { status: 'APPROVED' } :
        await window.DiditKYC.renderDiditIframeModal(started.didit_session_url, started.didit_session_id, {
          fetchDecision: async () => { const s = await request(`estado?id_firma=${started.id_firma}`); return {
            status: s.canSeal || s.estado_firma === 'sellada' ? 'APPROVED' : s.didit_status
          }; }
        });
      if (decision?.status !== 'APPROVED') { status('La verificación todavía no está aprobada. Podés retomar la firma desde aquí.'); return; }
      if (!sealed) await request('sellar', { id_firma: started.id_firma });
      await request('finalizar', { id_contrato: selected.id_contrato });
      status('Tu firma quedó registrada. Podés descargar el documento y la evidencia.');
      await downloads();
    } catch (error) { status(error.message); }
    finally { busy = false; $('signing-preview').disabled = false; $('signing-submit').disabled = !preview || !$('signing-consent').checked; }
  };
  async function init() {
    try {
      const { data } = await window.supabaseClient.auth.getSession();
      accountId = data.session?.user.id || null;
      const contracts = await request('evidencias');
      $('signing-contracts').replaceChildren();
      contracts.forEach(c => { const button = document.createElement('button'); button.type = 'button';
        button.textContent = `Contrato ${c.id_contrato} · ${roleName(c.role)}`; button.onclick = () => select(c); $('signing-contracts').append(button); });
      status(contracts.length ? 'Elegí el contrato que querés revisar o firmar.' : 'No hay contratos asociados a esta cuenta. Si sos garante, ingresá con el email de tu invitación una vez que las partes hayan iniciado la firma.');
      if (contracts.length === 1) await select(contracts[0]);
    } catch (error) { status(error.message); }
  }
  window.supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (accountId && session?.user.id !== accountId)) {
      generation++; accountId = session?.user.id || null; selected = null; preview = null;
      urls.forEach(URL.revokeObjectURL); urls.length = 0;
      $('signing-pdf').removeAttribute('src'); $('signing-files').replaceChildren();
      $('signing-contracts').replaceChildren(); $('signing-review').hidden = true; status('La sesión cambió. Recargá para continuar.');
    }
  });
  init();
})();
