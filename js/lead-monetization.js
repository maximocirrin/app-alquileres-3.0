/**
 * Habitat - Módulo Front-End de Captura y Monetización de Leads
 * Modelo: Pago por Lead / Suscripción por Zona Inmobiliaria
 * Cumplimiento Legal: CUCICBA / CMCPSI / Ley de Corretaje Argentina
 */

// State Store Manager (Zustand-like React/Vanilla State Pattern)
window.HabitatLeadStore = {
  state: {
    agent: {
      id: 'ag-4892',
      fullName: 'Lic. Mariano Gómez',
      agencyName: 'Gómez & Asociados Propiedades',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
      matriculaNumber: '7842',
      jurisdiction: 'CUCICBA',
      jurisdictionFull: 'Colegio Único de Corredores Inmobiliarios de CABA',
      verificationStatus: 'verified', // 'verified' | 'pending' | 'rejected'
      cuit: '20-31849201-7',
      credits: 14,
      totalCreditsAcquired: 50,
      activeZones: ['palermo-soho', 'recoleta']
    },
    zones: [
      { id: 'palermo-soho', name: 'Palermo Soho', postalCode: 'C1414', availableQuota: 2, maxQuota: 5, pricePerLeadARS: 7800, demandLevel: 'high' },
      { id: 'recoleta', name: 'Recoleta', postalCode: 'C1113', availableQuota: 1, maxQuota: 4, pricePerLeadARS: 8500, demandLevel: 'high' },
      { id: 'belgrano-r', name: 'Belgrano R', postalCode: 'C1428', availableQuota: 3, maxQuota: 5, pricePerLeadARS: 7200, demandLevel: 'medium' },
      { id: 'vicente-lopez', name: 'Vicente López', postalCode: 'B1638', availableQuota: 0, maxQuota: 3, pricePerLeadARS: 8000, demandLevel: 'high' },
      { id: 'puerto-madero', name: 'Puerto Madero', postalCode: 'C1107', availableQuota: 1, maxQuota: 3, pricePerLeadARS: 12000, demandLevel: 'high' },
      { id: 'san-isidro', name: 'San Isidro Centro', postalCode: 'B1642', availableQuota: 4, maxQuota: 6, pricePerLeadARS: 6900, demandLevel: 'low' }
    ],
    leads: [
      {
        id: 'lead-101',
        clientName: 'Gonzalo Martínez',
        phone: '+54 9 11 4829-1029',
        email: 'gonzalo.martinez@gmail.com',
        propertyName: 'Departamento 3 Ambientes con Balcón Terraza',
        propertyAddress: 'Av. Coronel Díaz 2100, Palermo Soho',
        propertyPrice: 'USD 185.000',
        intentScore: 'high',
        timeline: 'Mudanza Inmediata (< 30 días)',
        hasCredit: true,
        creditType: 'Efectivo disponible / Sin crédito',
        hasPropertyToSell: false,
        status: 'new', // 'new' | 'contacted' | 'hot' | 'negotiating' | 'disputed' | 'closed'
        createdAt: 'Hace 12 min',
        disputeStatus: 'none'
      },
      {
        id: 'lead-102',
        clientName: 'Valeria Rossi',
        phone: '+54 9 11 5920-8811',
        email: 'valeria.rossi@yahoo.com.ar',
        propertyName: 'Piso Exclusivo con Cochera Fija',
        propertyAddress: 'Av. Alvear 1700, Recoleta',
        propertyPrice: 'USD 420.000',
        intentScore: 'high',
        timeline: '1 a 3 meses',
        hasCredit: false,
        creditType: 'Requiere tasación de su propiedad',
        hasPropertyToSell: true,
        status: 'contacted',
        createdAt: 'Hace 2 hs',
        disputeStatus: 'none'
      },
      {
        id: 'lead-103',
        clientName: 'Martín Peralta',
        phone: '+54 9 11 0000-0000',
        email: 'spam_test@fake.com',
        propertyName: 'Duplex 2 Ambientes con Parrilla',
        propertyAddress: 'Cabrera 4200, Palermo',
        propertyPrice: 'USD 125.000',
        intentScore: 'low',
        timeline: 'Solo curioseando',
        hasCredit: false,
        creditType: 'Sin definir',
        hasPropertyToSell: false,
        status: 'disputed',
        createdAt: 'Hace 5 hs',
        disputeStatus: 'pending',
        disputeReason: 'INVALID_PHONE'
      }
    ],
    selectedPackage: 'pro' // 'starter' | 'pro' | 'enterprise'
  },

  // Subscriptores a cambios de estado
  listeners: [],
  subscribe(fn) {
    this.listeners.push(fn);
  },
  notify() {
    this.listeners.forEach(fn => fn(this.state));
  },

  // Acciones
  addLead(lead) {
    this.state.leads.unshift(lead);
    this.state.agent.credits = Math.max(0, this.state.agent.credits - 1);
    this.notify();
    HabitatLeadModule.checkLowBalanceWarning();
  },

  disputeLead(leadId, reason, comments) {
    const lead = this.state.leads.find(l => l.id === leadId);
    if (lead) {
      lead.status = 'disputed';
      lead.disputeStatus = 'pending';
      lead.disputeReason = reason;
      lead.disputeComments = comments;
      this.notify();
    }
  },

  buyPackage(zoneIds, packageType) {
    const pkgCredits = packageType === 'starter' ? 15 : packageType === 'pro' ? 50 : 120;
    this.state.agent.credits += pkgCredits;
    this.state.agent.totalCreditsAcquired += pkgCredits;
    zoneIds.forEach(id => {
      if (!this.state.agent.activeZones.includes(id)) {
        this.state.agent.activeZones.push(id);
      }
    });
    this.notify();
  },

  updateAgentMatricula(data) {
    this.state.agent.matriculaNumber = data.matriculaNumber;
    this.state.agent.jurisdiction = data.jurisdiction;
    this.state.agent.cuit = data.cuit;
    this.state.agent.verificationStatus = 'pending';
    this.notify();
  }
};

// UI Engine Implementation
window.HabitatLeadModule = {
  init() {
    this.injectModalContainers();
    this.renderAgentStatusBanners();
    HabitatLeadStore.subscribe(() => {
      this.renderAgentStatusBanners();
      this.renderLeadInbox();
    });
  },

  // 1. Agent Trust Badge Renderer
  renderTrustBadge(agent, containerId, variant = 'expanded') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isVerified = agent.verificationStatus === 'verified';
    const badgeColor = isVerified ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    const verifiedIcon = isVerified ? 'verified' : 'pending_actions';
    const statusText = isVerified ? `Verificado ${agent.jurisdiction} N° ${agent.matriculaNumber}` : `Matrícula en Revisión (${agent.jurisdiction})`;

    if (variant === 'compact') {
      container.innerHTML = `
        <div onclick="HabitatLeadModule.openAgentVerificationModal()" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${badgeColor} cursor-pointer hover:bg-emerald-500/20 transition-all">
          <span class="material-symbols-outlined text-sm">${verifiedIcon}</span>
          <span class="text-xs font-extrabold tracking-tight">${agent.fullName} • ${statusText}</span>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="glass-card p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 shadow-sm hover:shadow-md transition-all">
        <div class="flex items-center gap-3">
          <div class="relative shrink-0">
            <img src="${agent.avatarUrl}" alt="${agent.fullName}" class="w-14 h-14 rounded-full object-cover border-2 border-primary/20">
            <span class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow">
              <span class="material-symbols-outlined text-sm">verified</span>
            </span>
          </div>
          <div class="flex-grow min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span class="text-[10px] font-black uppercase tracking-wider text-zinc-400">Corredor Inmobiliario Responsable</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${badgeColor} border">${agent.jurisdiction}</span>
            </div>
            <h4 class="font-headline font-extrabold text-sm text-zinc-900 dark:text-white truncate">${agent.fullName}</h4>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">${agent.agencyName}</p>
            <div class="mt-1 flex items-center gap-2">
              <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span class="material-symbols-outlined text-sm">shield</span>
                Matrícula N° ${agent.matriculaNumber}
              </span>
              <button type="button" onclick="HabitatLeadModule.openAgentVerificationModal()" class="text-[10px] font-extrabold text-primary hover:underline cursor-pointer">
                Verificar Matrícula
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // 2. Open Lead Capture Flow Modal (Step 1 -> Step 2 -> Success Step 3)
  currentLeadFlow: {
    step: 1,
    propertyId: '',
    propertyTitle: '',
    propertyPrice: '',
    answers: {
      timeline: 'Mudanza Inmediata (< 30 días)',
      hasCredit: 'Efectivo disponible / Sin crédito',
      hasPropertyToSell: 'No',
      contactName: '',
      phone: '',
      email: ''
    }
  },

  openLeadCaptureModal(propertyId = 'prop-9482', propertyTitle = 'Departamento 3 Ambientes Palermo Soho', propertyPrice = 'USD 185.000') {
    this.currentLeadFlow.propertyId = propertyId;
    this.currentLeadFlow.propertyTitle = propertyTitle;
    this.currentLeadFlow.propertyPrice = propertyPrice;
    this.currentLeadFlow.step = 1;
    this.renderLeadCaptureStep();
    document.getElementById('lead-capture-modal-backdrop').classList.remove('hidden');
  },

  closeLeadCaptureModal() {
    document.getElementById('lead-capture-modal-backdrop').classList.add('hidden');
  },

  renderLeadCaptureStep() {
    const modalBody = document.getElementById('lead-capture-modal-content');
    const { step, answers } = this.currentLeadFlow;
    const agent = HabitatLeadStore.state.agent;

    if (step === 1) {
      modalBody.innerHTML = `
        <div class="p-6 space-y-6">
          <!-- Stepper Header -->
          <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div>
              <span class="text-[11px] font-black uppercase text-primary tracking-wider">Paso 1 de 2 • Calificación rápida</span>
              <h3 class="font-headline font-extrabold text-lg text-zinc-900 dark:text-white">Intención de Operación</h3>
            </div>
            <button onclick="HabitatLeadModule.closeLeadCaptureModal()" class="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700 flex items-center gap-3">
            <span class="material-symbols-outlined text-primary">apartment</span>
            <div>
              <p class="text-xs font-bold text-zinc-900 dark:text-white">${this.currentLeadFlow.propertyTitle}</p>
              <p class="text-xs text-primary font-extrabold">${this.currentLeadFlow.propertyPrice}</p>
            </div>
          </div>

          <!-- Micro-Encuesta -->
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">1. ¿En qué plazo tenés planeado mudarte?</label>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button type="button" onclick="HabitatLeadModule.setAnswer('timeline', 'Mudanza Inmediata (< 30 días)', this)" class="survey-option-btn p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-left hover:border-primary active-option bg-primary/10 border-primary text-primary">
                  Mudanza Inmediata (< 30 días)
                </button>
                <button type="button" onclick="HabitatLeadModule.setAnswer('timeline', '1 a 3 meses', this)" class="survey-option-btn p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-left hover:border-primary">
                  1 a 3 meses
                </button>
                <button type="button" onclick="HabitatLeadModule.setAnswer('timeline', 'Solo consultando', this)" class="survey-option-btn p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-left hover:border-primary">
                  Solo consultando
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">2. ¿Disponés de la totalidad del dinero o tenés crédito?</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button type="button" onclick="HabitatLeadModule.setAnswer('hasCredit', 'Efectivo disponible / Sin crédito', this)" class="survey-option-btn p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-left hover:border-primary active-option bg-primary/10 border-primary text-primary">
                  💵 Efectivo disponible
                </button>
                <button type="button" onclick="HabitatLeadModule.setAnswer('hasCredit', 'Crédito Hipotecario Pre-aprobado', this)" class="survey-option-btn p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-left hover:border-primary">
                  🏦 Crédito Pre-aprobado
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-2">3. ¿Necesitás vender tu propiedad actual para comprar?</label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" onclick="HabitatLeadModule.setAnswer('hasPropertyToSell', 'No', this)" class="survey-option-btn p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-left hover:border-primary active-option bg-primary/10 border-primary text-primary">
                  No, compra directa
                </button>
                <button type="button" onclick="HabitatLeadModule.setAnswer('hasPropertyToSell', 'Sí, necesito tasación', this)" class="survey-option-btn p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-left hover:border-primary">
                  Sí, necesito tasación
                </button>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <span class="text-xs text-zinc-400 font-medium">🛡️ Tus datos están protegidos por Ley 25.326</span>
            <button type="button" onclick="HabitatLeadModule.goToStep(2)" class="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer">
              <span>Continuar</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      `;
    } else if (step === 2) {
      modalBody.innerHTML = `
        <div class="p-6 space-y-6">
          <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div>
              <span class="text-[11px] font-black uppercase text-primary tracking-wider">Paso 2 de 2 • Tus Datos de Contacto</span>
              <h3 class="font-headline font-extrabold text-lg text-zinc-900 dark:text-white">¿A dónde te enviamos la información?</h3>
            </div>
            <button onclick="HabitatLeadModule.closeLeadCaptureModal()" class="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Nombre y Apellido</label>
              <input type="text" id="lead-input-name" placeholder="Ej: Gonzalo Martínez" value="${answers.contactName}" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
            </div>

            <div>
              <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Teléfono / WhatsApp (Argentina)</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">+54 9</span>
                <input type="tel" id="lead-input-phone" placeholder="11 4829-1029" value="${answers.phone}" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-16 pr-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
              </div>
            </div>

            <div>
              <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Correo Electrónico</label>
              <input type="email" id="lead-input-email" placeholder="ejemplo@email.com" value="${answers.email}" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
            </div>
          </div>

          <!-- Trust Badge Preview -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700 space-y-2">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-emerald-600">verified</span>
              <span class="text-xs font-extrabold text-zinc-900 dark:text-white">Corredor Responsable Asignado</span>
            </div>
            <p class="text-xs text-zinc-600 dark:text-zinc-300">${agent.fullName} — Matrícula ${agent.jurisdiction} N° ${agent.matriculaNumber}</p>
          </div>

          <div class="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
            <button type="button" onclick="HabitatLeadModule.goToStep(1)" class="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Atrás
            </button>
            <button type="button" onclick="HabitatLeadModule.submitLeadForm()" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer">
              <span class="material-symbols-outlined text-sm">send</span>
              <span>Enviar Consulta Profesional</span>
            </button>
          </div>
        </div>
      `;
    } else if (step === 3) {
      // Success State with Agent Details & WhatsApp CTA
      const cleanPhone = answers.phone.replace(/[^0-9]/g, '');
      const waMsg = encodeURIComponent(`Hola ${agent.fullName}, envié una consulta por la propiedad "${this.currentLeadFlow.propertyTitle}" (${this.currentLeadFlow.propertyPrice}). Mi nombre es ${answers.contactName}.`);
      const waUrl = `https://wa.me/5491148291029?text=${waMsg}`;

      modalBody.innerHTML = `
        <div class="p-6 text-center space-y-6">
          <div class="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/30">
            <span class="material-symbols-outlined text-3xl">check_circle</span>
          </div>

          <div>
            <h3 class="font-headline font-extrabold text-xl text-zinc-900 dark:text-white">¡Consulta Enviada con Éxito!</h3>
            <p class="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">Tu solicitud fue recibida directamente por el corredor responsable matriculado.</p>
          </div>

          <div class="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-left space-y-3">
            <div class="flex items-center gap-3">
              <img src="${agent.avatarUrl}" class="w-12 h-12 rounded-full object-cover border border-emerald-500">
              <div>
                <h4 class="font-extrabold text-sm text-zinc-900 dark:text-white">${agent.fullName}</h4>
                <p class="text-xs text-emerald-600 font-bold">Matrícula ${agent.jurisdiction} N° ${agent.matriculaNumber}</p>
                <p class="text-[11px] text-zinc-400">${agent.agencyName}</p>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <a href="${waUrl}" target="_blank" class="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold py-3 rounded-xl text-xs shadow-md transition-all">
              <span class="material-symbols-outlined text-lg">chat</span>
              <span>Abrir WhatsApp con el Agente Ahora</span>
            </a>
            <button type="button" onclick="HabitatLeadModule.closeLeadCaptureModal()" class="text-xs font-bold text-zinc-400 hover:text-zinc-600">
              Cerrar Ventana
            </button>
          </div>
        </div>
      `;
    }
  },

  setAnswer(key, val, btnEl) {
    this.currentLeadFlow.answers[key] = val;
    if (btnEl) {
      const parent = btnEl.parentElement;
      parent.querySelectorAll('.survey-option-btn').forEach(b => {
        b.classList.remove('active-option', 'bg-primary/10', 'border-primary', 'text-primary');
      });
      btnEl.classList.add('active-option', 'bg-primary/10', 'border-primary', 'text-primary');
    }
  },

  goToStep(s) {
    this.currentLeadFlow.step = s;
    this.renderLeadCaptureStep();
  },

  submitLeadForm() {
    const name = document.getElementById('lead-input-name')?.value || 'Usuario Anónimo';
    const phone = document.getElementById('lead-input-phone')?.value || '11 0000-0000';
    const email = document.getElementById('lead-input-email')?.value || 'correo@ejemplo.com';

    this.currentLeadFlow.answers.contactName = name;
    this.currentLeadFlow.answers.phone = phone;
    this.currentLeadFlow.answers.email = email;

    // Registra lead en el store global
    HabitatLeadStore.addLead({
      id: 'lead-' + Date.now(),
      clientName: name,
      phone: '+54 9 ' + phone,
      email: email,
      propertyName: this.currentLeadFlow.propertyTitle,
      propertyAddress: 'Palermo Soho, CABA',
      propertyPrice: this.currentLeadFlow.propertyPrice,
      intentScore: 'high',
      timeline: this.currentLeadFlow.answers.timeline,
      hasCredit: this.currentLeadFlow.answers.hasCredit.includes('Efectivo'),
      creditType: this.currentLeadFlow.answers.hasCredit,
      hasPropertyToSell: this.currentLeadFlow.answers.hasPropertyToSell === 'Sí, necesito tasación',
      status: 'new',
      createdAt: 'Justo ahora',
      disputeStatus: 'none'
    });

    this.goToStep(3);
  },

  // 3. Subscription Store Modal (Tienda de Zonas y Paquetes de Leads)
  openSubscriptionStoreModal() {
    this.renderSubscriptionStoreModal();
    document.getElementById('subscription-store-modal-backdrop').classList.remove('hidden');
  },

  closeSubscriptionStoreModal() {
    document.getElementById('subscription-store-modal-backdrop').classList.add('hidden');
  },

  renderSubscriptionStoreModal() {
    const modalBody = document.getElementById('subscription-store-modal-content');
    const { zones, agent, selectedPackage } = HabitatLeadStore.state;

    const pkgPriceARS = selectedPackage === 'starter' ? 180000 : selectedPackage === 'pro' ? 390000 : 850000;
    const pkgLeads = selectedPackage === 'starter' ? 15 : selectedPackage === 'pro' ? 50 : 120;

    modalBody.innerHTML = `
      <div class="p-6 space-y-6 max-w-4xl w-full mx-auto">
        <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase border border-emerald-500/20">
              Tienda Oficial de Leads por Zona
            </span>
            <h3 class="font-headline font-extrabold text-xl text-zinc-900 dark:text-white mt-1">Comprar Cupos de Leads Exclusivos</h3>
          </div>
          <button onclick="HabitatLeadModule.closeSubscriptionStoreModal()" class="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Agent Status Alert -->
        <div class="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
            <div>
              <p class="text-xs font-bold text-zinc-900 dark:text-white">Saldo de Leads Activo</p>
              <p class="text-xs text-zinc-500">${agent.credits} leads disponibles de ${agent.totalCreditsAcquired} totales</p>
            </div>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-black bg-primary text-white">Matrícula ${agent.matriculaNumber} OK</span>
        </div>

        <!-- Selector de Paquete -->
        <div>
          <label class="block text-xs font-extrabold uppercase text-zinc-500 mb-3">1. Seleccioná tu Paquete de Leads</label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div onclick="HabitatLeadModule.selectPackage('starter')" class="p-4 rounded-2xl border-2 ${selectedPackage === 'starter' ? 'border-primary bg-primary/5' : 'border-zinc-200 dark:border-zinc-800'} cursor-pointer hover:border-primary transition-all">
              <span class="text-[10px] font-black uppercase text-zinc-400">Starter</span>
              <h4 class="font-extrabold text-lg text-zinc-900 dark:text-white">15 Leads / mes</h4>
              <p class="text-xs font-extrabold text-primary mt-1">$ 180.000 ARS<span class="text-[10px] text-zinc-400 font-normal"> /mes</span></p>
              <p class="text-[11px] text-zinc-500 mt-2">$ 12.000 ARS por lead</p>
            </div>

            <div onclick="HabitatLeadModule.selectPackage('pro')" class="p-4 rounded-2xl border-2 ${selectedPackage === 'pro' ? 'border-primary bg-primary/5 shadow-md' : 'border-zinc-200 dark:border-zinc-800'} cursor-pointer hover:border-primary transition-all relative">
              <span class="absolute -top-3 right-3 px-2 py-0.5 rounded-full bg-primary text-white text-[9px] font-black uppercase">Más Popular ⭐</span>
              <span class="text-[10px] font-black uppercase text-zinc-400">Pro Agentes</span>
              <h4 class="font-extrabold text-lg text-zinc-900 dark:text-white">50 Leads / mes</h4>
              <p class="text-xs font-extrabold text-primary mt-1">$ 390.000 ARS<span class="text-[10px] text-zinc-400 font-normal"> /mes</span></p>
              <p class="text-[11px] text-zinc-500 mt-2">$ 7.800 ARS por lead</p>
            </div>

            <div onclick="HabitatLeadModule.selectPackage('enterprise')" class="p-4 rounded-2xl border-2 ${selectedPackage === 'enterprise' ? 'border-primary bg-primary/5' : 'border-zinc-200 dark:border-zinc-800'} cursor-pointer hover:border-primary transition-all">
              <span class="text-[10px] font-black uppercase text-zinc-400">Enterprise</span>
              <h4 class="font-extrabold text-lg text-zinc-900 dark:text-white">120 Leads / mes</h4>
              <p class="text-xs font-extrabold text-primary mt-1">$ 850.000 ARS<span class="text-[10px] text-zinc-400 font-normal"> /mes</span></p>
              <p class="text-[11px] text-zinc-500 mt-2">$ 7.083 ARS por lead</p>
            </div>
          </div>
        </div>

        <!-- Selector de Zonas Inmobiliarias -->
        <div>
          <label class="block text-xs font-extrabold uppercase text-zinc-500 mb-3">2. Seleccioná las Zonas / Barrios de Cobertura</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${zones.map(z => {
              const isSelected = agent.activeZones.includes(z.id);
              const isFull = z.availableQuota === 0;
              return `
                <div onclick="${isFull ? '' : `HabitatLeadModule.toggleZoneSelection('${z.id}')`}" class="p-3 rounded-xl border ${isSelected ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800'} ${isFull ? 'opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/40' : 'cursor-pointer hover:border-emerald-500'} flex items-center justify-between">
                  <div>
                    <h5 class="text-xs font-extrabold text-zinc-900 dark:text-white">${z.name}</h5>
                    <p class="text-[10px] text-zinc-400">CP ${z.postalCode} • ARS $${z.pricePerLeadARS.toLocaleString('es-AR')}</p>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-black ${isFull ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'}">
                    ${isFull ? 'Cupos Agotados' : `${z.availableQuota} de ${z.maxQuota} cupos`}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Mercado Pago Checkout Button Container -->
        <div class="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span class="text-[10px] font-black uppercase text-blue-600">Integración Directa Mercado Pago</span>
            <h4 class="font-extrabold text-base text-zinc-900 dark:text-white">Total ARS: $${pkgPriceARS.toLocaleString('es-AR')} + IVA</h4>
            <p class="text-xs text-zinc-500">Incluye ${pkgLeads} créditos de leads y asignación a ${agent.activeZones.length} zonas seleccionadas.</p>
          </div>
          <button type="button" onclick="HabitatLeadModule.confirmMercadoPagoCheckout()" class="px-6 py-3 rounded-xl bg-[#009EE3] hover:bg-[#008ac7] text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer shrink-0">
            <span class="material-symbols-outlined">payments</span>
            <span>Pagar con Mercado Pago</span>
          </button>
        </div>
      </div>
    `;
  },

  selectPackage(pkg) {
    HabitatLeadStore.state.selectedPackage = pkg;
    this.renderSubscriptionStoreModal();
  },

  toggleZoneSelection(zoneId) {
    const active = HabitatLeadStore.state.agent.activeZones;
    const idx = active.indexOf(zoneId);
    if (idx > -1) {
      active.splice(idx, 1);
    } else {
      active.push(zoneId);
    }
    this.renderSubscriptionStoreModal();
  },

  confirmMercadoPagoCheckout() {
    HabitatLeadStore.buyPackage(HabitatLeadStore.state.agent.activeZones, HabitatLeadStore.state.selectedPackage);
    this.closeSubscriptionStoreModal();
    this.showToast('¡Pago procesado con éxito! Créditos acreditados en tu cuenta.', 'success');
  },

  // 4. Onboarding / Matrícula Validation Modal
  openOnboardingModal() {
    this.renderOnboardingModal();
    document.getElementById('onboarding-modal-backdrop').classList.remove('hidden');
  },

  closeOnboardingModal() {
    document.getElementById('onboarding-modal-backdrop').classList.add('hidden');
  },

  renderOnboardingModal() {
    const modalBody = document.getElementById('onboarding-modal-content');
    const agent = HabitatLeadStore.state.agent;

    modalBody.innerHTML = `
      <div class="p-6 space-y-6 max-w-xl w-full mx-auto">
        <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <span class="text-[11px] font-black uppercase text-primary tracking-wider">Validación de Identidad Profesional</span>
            <h3 class="font-headline font-extrabold text-lg text-zinc-900 dark:text-white">Carga de Matrícula CUCICBA / CMCPSI</h3>
          </div>
          <button onclick="HabitatLeadModule.closeOnboardingModal()" class="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onsubmit="event.preventDefault(); HabitatLeadModule.submitMatriculaForm();" class="space-y-4">
          <div>
            <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Colegio Profesional Regulador</label>
            <select id="onboard-jurisdiction" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
              <option value="CUCICBA" ${agent.jurisdiction === 'CUCICBA' ? 'selected' : ''}>CUCICBA - Ciudad Autónoma de Buenos Aires</option>
              <option value="CMCPSI" ${agent.jurisdiction === 'CMCPSI' ? 'selected' : ''}>CMCPSI - San Isidro / GBA Norte</option>
              <option value="COCIR" ${agent.jurisdiction === 'COCIR' ? 'selected' : ''}>COCIR - Rosario, Santa Fe</option>
              <option value="CPMCPCR" ${agent.jurisdiction === 'CPMCPCR' ? 'selected' : ''}>CPMCPCR - Córdoba</option>
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">N° de Matrícula Profesional</label>
              <input type="text" id="onboard-matricula" value="${agent.matriculaNumber}" placeholder="Ej: 7842" required class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
            </div>

            <div>
              <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">CUIT del Titular</label>
              <input type="text" id="onboard-cuit" value="${agent.cuit}" placeholder="20-31849201-7" required class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
            </div>
          </div>

          <div>
            <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Credencial Profesional (Frente y Dorso)</label>
            <div class="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 text-center hover:border-primary transition-all cursor-pointer bg-zinc-50 dark:bg-zinc-800/40">
              <span class="material-symbols-outlined text-3xl text-zinc-400 mb-2">badge</span>
              <p class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Hacé clic para adjuntar foto de tu carnet de corredor</p>
              <p class="text-[10px] text-zinc-400 mt-1">Formatos soportados: JPG, PNG o PDF (Máx. 10 MB)</p>
            </div>
          </div>

          <div class="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
            <button type="button" onclick="HabitatLeadModule.closeOnboardingModal()" class="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600">Cancelar</button>
            <button type="submit" class="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-xl shadow cursor-pointer">
              Enviar para Verificación Manual
            </button>
          </div>
        </form>
      </div>
    `;
  },

  submitMatriculaForm() {
    const mat = document.getElementById('onboard-matricula').value;
    const jur = document.getElementById('onboard-jurisdiction').value;
    const cuit = document.getElementById('onboard-cuit').value;

    HabitatLeadStore.updateAgentMatricula({ matriculaNumber: mat, jurisdiction: jur, cuit: cuit });
    this.closeOnboardingModal();
    this.showToast('Datos de matrícula enviados. El estado cambiará a verificado en breve.', 'info');
  },

  // 5. Dispute Lead Modal (Reembolso por Lead Spam o Inválido)
  openDisputeModal(leadId) {
    this.currentDisputeLeadId = leadId;
    this.renderDisputeModal();
    document.getElementById('dispute-modal-backdrop').classList.remove('hidden');
  },

  closeDisputeModal() {
    document.getElementById('dispute-modal-backdrop').classList.add('hidden');
  },

  renderDisputeModal() {
    const modalBody = document.getElementById('dispute-modal-content');
    const lead = HabitatLeadStore.state.leads.find(l => l.id === this.currentDisputeLeadId);
    if (!lead) return;

    modalBody.innerHTML = `
      <div class="p-6 space-y-6 max-w-md w-full mx-auto">
        <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <span class="text-[11px] font-black uppercase text-red-500 tracking-wider">SLA de Garantía 48 Horas</span>
            <h3 class="font-headline font-extrabold text-lg text-zinc-900 dark:text-white">Disputar / Reportar Lead Inválido</h3>
          </div>
          <button onclick="HabitatLeadModule.closeDisputeModal()" class="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
          <p class="text-xs font-bold text-zinc-900 dark:text-white">${lead.clientName}</p>
          <p class="text-xs text-zinc-500">${lead.phone} • ${lead.propertyName}</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Motivo de la Disputa</label>
            <select id="dispute-reason-select" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
              <option value="INVALID_PHONE">Teléfono Inexistente / Fuera de Servicio</option>
              <option value="SPAM_OR_BOT">Spam o Bot Publicitario</option>
              <option value="WRONG_NUMBER">Número Equivocado / Persona No Solicitó</option>
              <option value="WRONG_INTENT">Buscaba Alquiler cuando la Propiedad es Venta</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Detalles Adicionales</label>
            <textarea id="dispute-comments" rows="3" placeholder="Explique brevemente el intento de contacto realizado..." class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs font-bold text-zinc-900 dark:text-white outline-none"></textarea>
          </div>
        </div>

        <div class="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
          <button type="button" onclick="HabitatLeadModule.closeDisputeModal()" class="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600">Cancelar</button>
          <button type="button" onclick="HabitatLeadModule.confirmDispute()" class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer">
            Enviar Disputa de Lead
          </button>
        </div>
      </div>
    `;
  },

  confirmDispute() {
    const reason = document.getElementById('dispute-reason-select').value;
    const comments = document.getElementById('dispute-comments').value;
    HabitatLeadStore.disputeLead(this.currentDisputeLeadId, reason, comments);
    this.closeDisputeModal();
    this.showToast('Disputa enviada. El crédito será reembolsado si la revisión es aprobada.', 'warning');
  },

  // 6. Lead Detail Modal View
  openLeadDetailModal(leadId) {
    const lead = HabitatLeadStore.state.leads.find(l => l.id === leadId);
    if (!lead) return;

    const modalBody = document.getElementById('lead-detail-modal-content');
    modalBody.innerHTML = `
      <div class="p-6 space-y-6 max-w-lg w-full mx-auto">
        <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <span class="text-[10px] font-black uppercase tracking-wider text-emerald-600">Ficha Completa de Prospecto</span>
            <h3 class="font-headline font-extrabold text-xl text-zinc-900 dark:text-white">${lead.clientName}</h3>
          </div>
          <button onclick="document.getElementById('lead-detail-modal-backdrop').classList.add('hidden')" class="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700">
              <span class="text-zinc-400 font-bold block text-[10px] uppercase">Teléfono</span>
              <span class="font-extrabold text-zinc-900 dark:text-white text-sm">${lead.phone}</span>
            </div>
            <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700">
              <span class="text-zinc-400 font-bold block text-[10px] uppercase">Email</span>
              <span class="font-extrabold text-zinc-900 dark:text-white">${lead.email}</span>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <span class="text-primary font-black uppercase text-[10px]">Propiedad Consultada</span>
            <p class="font-extrabold text-zinc-900 dark:text-white text-sm">${lead.propertyName}</p>
            <p class="text-zinc-500">${lead.propertyAddress} • <strong class="text-primary">${lead.propertyPrice}</strong></p>
          </div>

          <div class="space-y-2">
            <span class="text-zinc-400 font-bold uppercase text-[10px]">Respuestas de Intención</span>
            <div class="flex flex-wrap gap-2">
              <span class="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 font-extrabold">${lead.timeline}</span>
              <span class="px-2.5 py-1 rounded-lg ${lead.hasCredit ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'} font-extrabold">
                ${lead.creditType}
              </span>
              ${lead.hasPropertyToSell ? '<span class="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 font-extrabold">Requiere Permuta/Tasación</span>' : ''}
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <button type="button" onclick="HabitatLeadModule.openDisputeModal('${lead.id}'); document.getElementById('lead-detail-modal-backdrop').classList.add('hidden');" class="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-bold text-xs">
            Disputar Lead (Inválido)
          </button>
          <a href="https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}" target="_blank" class="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs shadow flex items-center gap-1.5">
            <span class="material-symbols-outlined text-base">chat</span>
            <span>Escribir por WhatsApp</span>
          </a>
        </div>
      </div>
    `;
    document.getElementById('lead-detail-modal-backdrop').classList.remove('hidden');
  },

  // 7. Render Banners & Low Balance Alert
  renderAgentStatusBanners() {
    const agent = HabitatLeadStore.state.agent;

    // Header Status Bar (if container present)
    const headerContainer = document.getElementById('agent-lead-status-bar');
    if (headerContainer) {
      const isLow = agent.credits < 5;
      headerContainer.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-3 p-3 px-4 rounded-2xl ${isLow ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300' : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700'} border text-xs">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined ${isLow ? 'text-amber-500' : 'text-emerald-500'}">account_balance_wallet</span>
            <div>
              <span class="font-extrabold text-zinc-900 dark:text-white">Saldo de Leads: ${agent.credits} / ${agent.totalCreditsAcquired}</span>
              <span class="text-zinc-500 dark:text-zinc-400 ml-2">Matrícula ${agent.jurisdiction} N° ${agent.matriculaNumber} (${agent.verificationStatus === 'verified' ? '🟢 Verificada' : '🟡 En revisión'})</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" onclick="HabitatLeadModule.openOnboardingModal()" class="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-50">
              Validar Matrícula
            </button>
            <button type="button" onclick="HabitatLeadModule.openSubscriptionStoreModal()" class="px-4 py-1.5 rounded-xl bg-primary text-white font-extrabold hover:bg-primary-hover shadow-sm">
              + Comprar Leads / Zonas
            </button>
          </div>
        </div>
      `;
    }
  },

  checkLowBalanceWarning() {
    if (HabitatLeadStore.state.agent.credits < 5) {
      this.showToast(`⚠️ ¡Atención! Te quedan solo ${HabitatLeadStore.state.agent.credits} leads disponibles. Recargá tu paquete para no perder clientes.`, 'warning');
    }
  },

  // 8. Lead Inbox Renderer (Kanban / List Views)
  renderLeadInbox() {
    const container = document.getElementById('lead-inbox-container');
    if (!container) return;

    const leads = HabitatLeadStore.state.leads;

    container.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-headline font-extrabold text-base text-zinc-900 dark:text-white">Inbox de Leads en Tiempo Real</h3>
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-extrabold">${leads.length} Leads Recibidos</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${leads.map(l => {
            const isDisputed = l.status === 'disputed';
            const badgeBg = isDisputed ? 'bg-red-500/10 text-red-600' : l.status === 'new' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600';
            return `
              <div class="glass-card p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${badgeBg}">${l.status.toUpperCase()}</span>
                  <span class="text-[10px] text-zinc-400 font-medium">${l.createdAt}</span>
                </div>

                <div>
                  <h4 class="font-extrabold text-sm text-zinc-900 dark:text-white">${l.clientName}</h4>
                  <p class="text-xs text-zinc-500">${l.phone}</p>
                </div>

                <div class="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-[11px] space-y-1">
                  <p class="font-extrabold text-zinc-800 dark:text-zinc-200 truncate">${l.propertyName}</p>
                  <p class="text-primary font-bold">${l.timeline}</p>
                </div>

                <div class="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                  <button type="button" onclick="HabitatLeadModule.openLeadDetailModal('${l.id}')" class="text-xs font-extrabold text-zinc-600 dark:text-zinc-300 hover:text-primary">
                    Ver Detalles
                  </button>
                  <a href="https://wa.me/${l.phone.replace(/[^0-9]/g, '')}" target="_blank" class="px-3 py-1.5 rounded-xl bg-[#25D366] text-white text-xs font-extrabold flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">chat</span> WhatsApp
                  </a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // Verification Modal for Agent Trust Badge
  openAgentVerificationModal() {
    const agent = HabitatLeadStore.state.agent;
    alert(`📜 CERTIFICADO DE VERIFICACIÓN INSTITUCIONAL HÁBITAT\n\nCorredor Responsable: ${agent.fullName}\nColegio Regulador: ${agent.jurisdictionFull}\nMatrícula N°: ${agent.matriculaNumber}\nCUIT: ${agent.cuit}\nEstado: VERIFICADO Y HABILITADO PARA OPERAR`);
  },

  // Toast Notification System
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = type === 'success' ? 'bg-emerald-600' : type === 'warning' ? 'bg-amber-600' : 'bg-blue-600';
    toast.className = `fixed bottom-6 right-6 ${colors} text-white px-5 py-3 rounded-2xl shadow-xl font-body text-xs font-extrabold z-[9999] transition-all transform translate-y-0 opacity-100 flex items-center gap-2`;
    toast.innerHTML = `<span class="material-symbols-outlined text-sm">info</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // Helper Modal Containers Injector
  injectModalContainers() {
    if (document.getElementById('request-agent-modal-backdrop')) return;

    const modalHTML = `
      <!-- Lead Capture Modal Backdrop -->
      <div id="lead-capture-modal-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 hidden">
        <div id="lead-capture-modal-content" class="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"></div>
      </div>

      <!-- Subscription Store Modal Backdrop -->
      <div id="subscription-store-modal-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 hidden">
        <div id="subscription-store-modal-content" class="bg-white dark:bg-zinc-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200 dark:border-zinc-800"></div>
      </div>

      <!-- Onboarding Matrícula Modal Backdrop -->
      <div id="onboarding-modal-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 hidden">
        <div id="onboarding-modal-content" class="bg-white dark:bg-zinc-900 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"></div>
      </div>

      <!-- Dispute Lead Modal Backdrop -->
      <div id="dispute-modal-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 hidden">
        <div id="dispute-modal-content" class="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"></div>
      </div>

      <!-- Lead Detail Modal Backdrop -->
      <div id="lead-detail-modal-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 hidden">
        <div id="lead-detail-modal-content" class="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"></div>
      </div>

      <!-- Request Agent Modal Backdrop -->
      <div id="request-agent-modal-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 hidden">
        <div id="request-agent-modal-content" class="bg-white dark:bg-zinc-900 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200 dark:border-zinc-800"></div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  },

  // 9. Zillow-Style Real Estate Agent Directory & Match Flow
  currentAgentDirectoryTab: 'directory', // 'directory' | 'form'
  directoryAgents: [
    {
      id: 'ag-1',
      fullName: 'Lic. Mariano Gómez',
      agencyName: 'Gómez & Asociados Propiedades',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80',
      matriculaNumber: '7842',
      jurisdiction: 'CUCICBA',
      rating: 5.0,
      reviewsCount: 54,
      activeListings: 14,
      experienceYears: 12,
      responseMinutes: 15,
      zones: ['Palermo Soho', 'Recoleta', 'Belgrano'],
      phone: '1148291029',
      specialty: 'Ventas & Alquileres Premium'
    },
    {
      id: 'ag-2',
      fullName: 'Dra. Carolina Benítez',
      agencyName: 'Benítez Real Estate CABA',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
      matriculaNumber: '6120',
      jurisdiction: 'CUCICBA',
      rating: 4.9,
      reviewsCount: 42,
      activeListings: 22,
      experienceYears: 9,
      responseMinutes: 10,
      zones: ['Recoleta', 'Puerto Madero', 'Barrio Norte'],
      phone: '1159208811',
      specialty: 'Tasaciones & Venta Exclusiva'
    },
    {
      id: 'ag-3',
      fullName: 'Martín Sbaraglia',
      agencyName: 'Sbaraglia Propiedades GBA',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
      matriculaNumber: '5840',
      jurisdiction: 'CMCPSI',
      rating: 4.8,
      reviewsCount: 38,
      activeListings: 18,
      experienceYears: 15,
      responseMinutes: 20,
      zones: ['Vicente López', 'San Isidro', 'Olivos'],
      phone: '1144558899',
      specialty: 'Casas & Alquileres Comerciales'
    }
  ],

  openRequestAgentModal(zoneHint = 'Palermo Soho', prefilledAgentId = null) {
    this.injectModalContainers();
    this.selectedAgentForRequest = prefilledAgentId;
    this.currentAgentDirectoryTab = prefilledAgentId ? 'form' : 'directory';
    this.renderRequestAgentModal(zoneHint);
    const backdrop = document.getElementById('request-agent-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('hidden');
    }
  },

  closeRequestAgentModal() {
    document.getElementById('request-agent-modal-backdrop').classList.add('hidden');
  },

  setAgentDirectoryTab(tab, zoneHint = 'Palermo Soho') {
    this.currentAgentDirectoryTab = tab;
    this.renderRequestAgentModal(zoneHint);
  },

  renderRequestAgentModal(zoneHint = 'Palermo Soho') {
    const modalBody = document.getElementById('request-agent-modal-content');
    if (!modalBody) return;

    const isDirectory = this.currentAgentDirectoryTab === 'directory';

    modalBody.innerHTML = `
      <div class="p-6 space-y-6 max-w-3xl w-full mx-auto">
        <!-- Header Estilo Zillow Agent Finder -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase border border-blue-500/20">
                Directorio Zillow Style • Hábitat Pro
              </span>
              <span class="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">verified</span> Matrículas Verificadas CUCICBA/CMCPSI
              </span>
            </div>
            <h3 class="font-headline font-extrabold text-xl sm:text-2xl text-zinc-900 dark:text-white mt-1">
              Encontrá un Corredor Inmobiliario Matriculado
            </h3>
          </div>
          <button onclick="HabitatLeadModule.closeRequestAgentModal()" class="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <span class="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <!-- Selector de Vista (Pestañas Estilo Zillow) -->
        <div class="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/60 p-1.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-700">
          <button type="button" onclick="HabitatLeadModule.setAgentDirectoryTab('directory', '${zoneHint}')" class="flex-1 py-2 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${isDirectory ? 'bg-white dark:bg-zinc-900 text-blue-900 dark:text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-white'}">
            <span class="material-symbols-outlined text-base">group_search</span>
            <span>Directorio de Agentes & Reseñas</span>
          </button>
          <button type="button" onclick="HabitatLeadModule.setAgentDirectoryTab('form', '${zoneHint}')" class="flex-1 py-2 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${!isDirectory ? 'bg-white dark:bg-zinc-900 text-blue-900 dark:text-blue-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-white'}">
            <span class="material-symbols-outlined text-base">assignment_ind</span>
            <span>Solicitud de Asignación Directa</span>
          </button>
        </div>

        ${isDirectory ? `
          <!-- VISTA 1: DIRECTORIO DE AGENTES CON RESEÑAS Y CARDS (ESTILO ZILLOW) -->
          <div class="space-y-4">
            <!-- Search & Filters -->
            <div class="flex flex-col sm:flex-row items-center gap-3">
              <div class="relative w-full sm:flex-grow">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-base">search</span>
                <input type="text" id="zillow-agent-search" placeholder="Filtrar por barrio (Palermo, Recoleta, Belgrano...)" onkeyup="HabitatLeadModule.filterZillowAgents()" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none">
              </div>
              <span class="text-xs text-zinc-400 font-bold shrink-0">${this.directoryAgents.length} Agentes Activos</span>
            </div>

            <!-- Agent Cards Grid -->
            <div id="zillow-agents-grid" class="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              ${this.directoryAgents.map(ag => `
                <div class="glass-card p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 hover:shadow-lg transition-all duration-200">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                      <div class="relative shrink-0">
                        <img src="${ag.avatarUrl}" alt="${ag.fullName}" class="w-16 h-16 rounded-full object-cover border-2 border-blue-900/30">
                        <span class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow" title="Matrícula Verificada">
                          <span class="material-symbols-outlined text-sm">verified</span>
                        </span>
                      </div>
                      <div>
                        <div class="flex items-center gap-2 flex-wrap">
                          <h4 class="font-headline font-extrabold text-base text-zinc-900 dark:text-white">${ag.fullName}</h4>
                          <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase border border-emerald-500/20">
                            Matrícula ${ag.jurisdiction} N° ${ag.matriculaNumber}
                          </span>
                        </div>
                        <p class="text-xs text-zinc-500 font-medium">${ag.agencyName} • ${ag.specialty}</p>

                        <!-- Zillow Rating Stars & Metrics -->
                        <div class="mt-2 flex items-center gap-3 flex-wrap text-xs">
                          <div class="flex items-center gap-1 text-amber-500 font-extrabold">
                            <span class="material-symbols-outlined text-sm text-amber-500 fill-1">star</span>
                            <span>${ag.rating.toFixed(1)}</span>
                            <span class="text-zinc-400 text-[11px] font-normal">(${ag.reviewsCount} reseñas)</span>
                          </div>
                          <span class="text-zinc-300">•</span>
                          <span class="text-zinc-600 dark:text-zinc-300 font-bold">${ag.activeListings} Avisos Activos</span>
                          <span class="text-zinc-300">•</span>
                          <span class="text-zinc-500">${ag.experienceYears} Años de Experiencia</span>
                        </div>
                      </div>
                    </div>

                    <!-- Action CTAs -->
                    <div class="flex sm:flex-col gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto">
                      <button type="button" onclick="HabitatLeadModule.openRequestAgentModal('${ag.zones[0]}', '${ag.id}')" class="flex-1 sm:flex-initial px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                        <span class="material-symbols-outlined text-sm">handshake</span>
                        <span>Solicitar Agente</span>
                      </button>
                      <a href="https://wa.me/549${ag.phone}?text=${encodeURIComponent('Hola ' + ag.fullName + ', vi tu perfil en Hábitat Zillow Directory y quisiera solicitar asesoramiento para mi propiedad.')}" target="_blank" class="flex-1 sm:flex-initial px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5">
                        <span class="material-symbols-outlined text-sm">chat</span>
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  <!-- Zone Badges -->
                  <div class="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 flex-wrap">
                    <span class="text-[10px] font-black uppercase text-zinc-400">Zonas de Cobertura:</span>
                    ${ag.zones.map(z => `<span class="px-2.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-bold">${z}</span>`).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <!-- VISTA 2: FORMULARIO DE SOLICITUD DE ASIGNACIÓN -->
          <form onsubmit="event.preventDefault(); HabitatLeadModule.submitRequestAgentForm();" class="space-y-4">
            <p class="text-xs text-zinc-500 leading-relaxed">
              Completá tus datos y te asignaremos un corredor inmobiliario matriculado especialista en tu zona para tasar, fotografiar y publicar tu propiedad.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Zona / Barrio del Inmueble</label>
                <input type="text" id="req-agent-zone" value="${zoneHint}" placeholder="Ej: Recoleta, Belgrano, Palermo" required class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
              </div>

              <div>
                <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Tipo de Operación</label>
                <select id="req-agent-operation" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
                  <option value="alquiler">Alquiler Tradicional / Comercial</option>
                  <option value="venta">Venta de Propiedad</option>
                  <option value="administracion">Administración de Alquiler</option>
                  <option value="tasacion">Solo Tasación Profesional</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Nombre Completo</label>
                <input type="text" id="req-agent-owner-name" placeholder="Tu Nombre y Apellido" required class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
              </div>

              <div>
                <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Teléfono / WhatsApp</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">+54 9</span>
                  <input type="tel" id="req-agent-owner-phone" placeholder="11 4829-1029" required class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-16 pr-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
                </div>
              </div>
            </div>

            <div>
              <label class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Dirección o Detalles de la Propiedad (Opcional)</label>
              <textarea id="req-agent-details" rows="2" placeholder="Ej: Dpto 2 amb en Av. Coronel Díaz al 2100 con balcón..." class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs font-bold text-zinc-900 dark:text-white outline-none"></textarea>
            </div>

            <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <span class="material-symbols-outlined text-base">verified</span>
              <span>Te conectamos únicamente con corredores matriculados activos en CUCICBA / CMCPSI.</span>
            </div>

            <div class="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
              <button type="button" onclick="HabitatLeadModule.closeRequestAgentModal()" class="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600">Cancelar</button>
              <button type="submit" class="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">handshake</span>
                <span>Solicitar Asignación de Agente</span>
              </button>
            </div>
          </form>
        `}
      </div>
    `;
  },

  filterZillowAgents() {
    const q = document.getElementById('zillow-agent-search')?.value.toLowerCase() || '';
    const grid = document.getElementById('zillow-agents-grid');
    if (!grid) return;

    grid.querySelectorAll('.glass-card').forEach(card => {
      const txt = card.textContent.toLowerCase();
      card.style.display = txt.includes(q) ? '' : 'none';
    });
  },

  submitRequestAgentForm() {
    const zone = document.getElementById('req-agent-zone')?.value || 'Palermo';

    this.closeRequestAgentModal();
    this.showToast(`¡Solicitud enviada! Un corredor matriculado de la zona ${zone} te contactará por WhatsApp.`, 'success');
  }
};

// Auto Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  HabitatLeadModule.init();
});
