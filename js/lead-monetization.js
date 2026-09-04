/**
 * Vivat - Módulo Front-End de Captura, Gestión CRM y Monetización de Leads
 * Modelo: Pago por Lead / Suscripción por Zona Inmobiliaria
 * Cumplimiento Legal: CUCICBA / CMCPSI / Ley de Corretaje Argentina
 * Tipografía: Manrope (Headline) & Inter (Body)
 */

// State Store Manager (Vanilla Reactive State Pattern)
window.VivatLeadStore = {
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
        clientName: 'Gonzalo Pérez',
        phone: '+54 9 11 4829-1029',
        email: 'gonzalo.perez@gmail.com',
        propertyName: 'Palermo 3 Amb ($520k)',
        propertyAddress: 'Humboldt 1940, Palermo',
        propertyPrice: '$ 550.000',
        intentScore: 'high',
        timeline: 'Mudanza Inmediata (< 30 días)',
        hasCredit: true,
        creditType: 'Efectivo disponible',
        hasPropertyToSell: false,
        source: 'Zonaprop',
        status: 'new',
        createdAt: 'Hace 12 min',
        notes: [{ text: 'Consulta ingresada desde Zonaprop con presupuesto de $550.000.', date: 'Hoy 15:40' }],
        disputeStatus: 'none'
      },
      {
        id: 'lead-102',
        clientName: 'Camila Benítez',
        phone: '+54 9 11 5920-8811',
        email: 'camila.benitez@gmail.com',
        propertyName: 'Belgrano 2 Amb ($410k)',
        propertyAddress: 'Av. Cabildo 1800, Belgrano',
        propertyPrice: '$ 420.000',
        intentScore: 'high',
        timeline: 'Mudanza Inmediata',
        hasCredit: true,
        creditType: 'Fianza GarantiZAR',
        hasPropertyToSell: false,
        source: 'Vivat Directo',
        status: 'new',
        createdAt: 'Hace 45 min',
        notes: [{ text: 'Buscando alquiler de 2 amb con recibo verificado.', date: 'Hoy 15:10' }],
        disputeStatus: 'none'
      },
      {
        id: 'lead-103',
        clientName: 'Martín Soria',
        phone: '+54 9 11 8899-7766',
        email: 'msoria@empresa.com',
        propertyName: 'Local Corrientes ($750k)',
        propertyAddress: 'Av. Corrientes 2400, Balvanera',
        propertyPrice: '$ 800.000',
        intentScore: 'high',
        timeline: '15 días',
        hasCredit: true,
        creditType: 'Garantía Propietaria CABA',
        hasPropertyToSell: false,
        source: 'Argenprop',
        status: 'new',
        createdAt: 'Hace 2 hs',
        notes: [{ text: 'Interesado en rubro comercial y depósito inicial.', date: 'Hoy 13:30' }],
        disputeStatus: 'none'
      },
      {
        id: 'lead-104',
        clientName: 'Federico López',
        phone: '+54 9 11 3344-9900',
        email: 'federico.lopez@yahoo.com',
        propertyName: 'Palermo 3 Amb ($520k)',
        propertyAddress: 'Av. Santa Fe 3420, Palermo',
        propertyPrice: '$ 520.000',
        intentScore: 'high',
        timeline: '1 a 3 meses',
        hasCredit: true,
        creditType: 'Recibo de sueldo',
        hasPropertyToSell: false,
        source: 'Vivat',
        status: 'contacted',
        createdAt: 'Hace 3 hs',
        notes: [{ text: 'Contacto telefónico realizado. Coordinando horario de muestra.', date: 'Hoy 12:45' }],
        disputeStatus: 'none'
      },
      {
        id: 'lead-105',
        email: 'spam_test@fake.com',
        propertyName: 'Duplex 2 Ambientes con Parrilla',
        propertyAddress: 'Cabrera 4200, Palermo',
        propertyPrice: 'USD 125.000',
        intentScore: 'low',
        timeline: 'Solo curioseando',
        hasCredit: false,
        creditType: 'Sin definir',
        hasPropertyToSell: false,
        source: 'Web Externa',
        status: 'disputed',
        createdAt: 'Hace 5 hs',
        notes: [
          { text: 'Llamada no atendida. El número no existe.', date: 'Hoy 11:00' }
        ],
        disputeStatus: 'pending',
        disputeReason: 'INVALID_PHONE'
      }
    ],
    selectedPackage: 'pro' // 'starter' | 'pro' | 'enterprise'
  },

  listeners: [],

  async initStore() {
    this.loadFromLocalStorage();
    if (window.DataManager) {
      try {
        const [dbLeads, dbZones] = await Promise.all([
          window.DataManager.getLeads(),
          window.DataManager.getLeadZones()
        ]);
        if (dbLeads && dbLeads.length > 0) {
          this.state.leads = dbLeads;
        }
        if (dbZones && dbZones.length > 0) {
          this.state.zones = dbZones;
        }
        this.notify();
      } catch (e) {
        console.warn('Could not load leads from DB:', e);
      }
    }
  },

  subscribe(fn) {
    this.listeners.push(fn);
  },

  notify() {
    this.saveToLocalStorage();
    this.listeners.forEach(fn => fn(this.state));
  },

  saveToLocalStorage() {
    try {
      localStorage.setItem('vivat_broker_leads_store', JSON.stringify(this.state));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  },

  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('vivat_broker_leads_store');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.leads && Array.isArray(parsed.leads)) {
          this.state.leads = parsed.leads;
        }
        if (parsed && parsed.agent) {
          this.state.agent = { ...this.state.agent, ...parsed.agent };
        }
      }
    } catch (e) {
      console.warn('Could not parse saved leads store:', e);
    }
  },

  // Acciones de Negocio
  addLead(lead) {
    this.state.leads.unshift(lead);
    this.state.agent.credits = Math.max(0, this.state.agent.credits - 1);
    this.notify();
    VivatLeadModule.checkLowBalanceWarning();

    if (window.DataManager) {
      window.DataManager.createLead(lead).catch(err => console.warn('Error saving lead to DB:', err));
    }
  },

  async addManualLead(leadData) {
    const newLead = {
      id: 'lead-' + Date.now(),
      clientName: leadData.clientName,
      phone: leadData.phone,
      email: leadData.email || 'sin_email@cliente.com',
      propertyName: leadData.propertyName || 'Consulta General Inmobiliaria',
      propertyAddress: leadData.propertyAddress || 'Atención en Oficina',
      propertyPrice: leadData.propertyPrice || '$ 0',
      intentScore: leadData.intentScore || 'high',
      timeline: leadData.timeline || 'Mudanza Inmediata (< 30 días)',
      hasCredit: leadData.hasCredit || false,
      creditType: leadData.creditType || 'Efectivo / Directo',
      hasPropertyToSell: leadData.hasPropertyToSell || false,
      source: leadData.source || 'Manual / Presencial',
      status: leadData.status || 'new',
      createdAt: 'Justo ahora',
      notes: leadData.note ? [{ text: leadData.note, date: 'Hoy ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] : [],
      disputeStatus: 'none'
    };

    if (window.DataManager) {
      try {
        const created = await window.DataManager.createLead(newLead);
        if (created) {
          newLead.raw_id = created.id_lead;
          newLead.id = `lead-${created.id_lead}`;
        }
      } catch (err) {
        console.warn('Error creating manual lead in DB:', err);
      }
    }

    this.state.leads.unshift(newLead);
    this.notify();
  },

  async changeLeadStatus(leadId, newStatus) {
    const lead = this.state.leads.find(l => l.id === leadId);
    if (lead) {
      const oldStatus = lead.status;
      lead.status = newStatus;
      if (!lead.notes) lead.notes = [];
      const statusLabels = {
        new: 'Nuevas Consultas',
        contacted: 'Contacto Realizado',
        visiting: 'Visita Programada',
        negotiating: 'Reserva / Evaluación',
        closed: 'Firmado & Cobrado',
        disputed: 'Disputado / Reembolso'
      };
      lead.notes.unshift({
        text: `Estado cambiado de "${statusLabels[oldStatus] || oldStatus}" a "${statusLabels[newStatus] || newStatus}".`,
        date: 'Hoy ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      this.notify();

      if (window.DataManager && lead.raw_id) {
        try {
          await window.DataManager.updateLeadStatus(lead.raw_id, newStatus, lead.notes);
        } catch (err) {
          console.warn('Error updating lead status in DB:', err);
        }
      }
    }
  },

  addLeadNote(leadId, noteText) {
    const lead = this.state.leads.find(l => l.id === leadId);
    if (lead && noteText.trim()) {
      if (!lead.notes) lead.notes = [];
      lead.notes.unshift({
        text: noteText.trim(),
        date: 'Hoy ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      this.notify();

      if (window.DataManager && lead.raw_id) {
        window.DataManager.updateLeadStatus(lead.raw_id, lead.status, lead.notes).catch(err => console.warn(err));
      }
    }
  },

  async disputeLead(leadId, reason, comments) {
    const lead = this.state.leads.find(l => l.id === leadId);
    if (lead) {
      lead.status = 'disputed';
      lead.disputeStatus = 'pending';
      lead.disputeReason = reason;
      lead.disputeComments = comments;
      if (!lead.notes) lead.notes = [];
      lead.notes.unshift({
        text: `SLA Disputa iniciada por el corredor. Motivo: ${reason}. Comentario: ${comments}`,
        date: 'Hoy ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      this.notify();

      if (window.DataManager && lead.raw_id) {
        try {
          await window.DataManager.disputeLeadInDb(lead.raw_id, reason, comments);
        } catch (err) {
          console.warn('Error disputing lead in DB:', err);
        }
      }
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
window.VivatLeadModule = {
  currentLeadsSubtab: 'kanban', // 'kanban' | 'table' | 'store'
  currentSearchQuery: '',
  currentStatusFilter: 'all',
  currentSourceFilter: 'all',
  currentDisputeLeadId: null,

  init() {
    VivatLeadStore.initStore();
    this.injectModalContainers();
    this.renderAgentStatusBanners();
    this.renderLeadsMainSection();

    VivatLeadStore.subscribe(() => {
      this.renderAgentStatusBanners();
      this.renderLeadsMainSection();
      this.renderLeadInbox();
    });
  },

  switchLeadsSubtab(tab) {
    this.currentLeadsSubtab = tab;
    this.renderLeadsMainSection();
  },

  // 1. Agent Trust & Saldo Compact Badge Top Right
  renderAgentStatusBanners() {
    const agent = VivatLeadStore.state.agent;
    const badgeContainer = document.getElementById('header-lead-balance-badge');
    if (badgeContainer) {
      const isLow = agent.credits < 5;
      badgeContainer.innerHTML = `
        <div onclick="VivatLeadModule.openSubscriptionStoreModal()" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${isLow ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'} border text-[11px] font-headline font-extrabold cursor-pointer hover:bg-emerald-500/20 transition-all shadow-2xs" title="Hacé clic para comprar más leads">
          <span class="material-symbols-outlined text-xs ${isLow ? 'text-amber-500' : 'text-emerald-500'}">account_balance_wallet</span>
          <span>Saldo: <strong>${agent.credits} leads</strong></span>
        </div>
      `;
    }
  },

  // 2. Renders Main Leads Section into #panel-content-leads
  renderLeadsMainSection() {
    const container = document.getElementById('panel-content-leads');
    if (!container) return;

    const leads = VivatLeadStore.state.leads;

    // Aggregate metrics
    const totalLeads = leads.length;
    const newLeads = leads.filter(l => l.status === 'new').length;
    const visitingLeads = leads.filter(l => l.status === 'visiting' || l.status === 'contacted').length;
    const closedLeads = leads.filter(l => l.status === 'closed').length;
    const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0.0';

    const isKanban = this.currentLeadsSubtab === 'kanban';
    const isTable = this.currentLeadsSubtab === 'table';
    const isStore = this.currentLeadsSubtab === 'store';

    container.innerHTML = `
      <div class="space-y-6 animate-on-scroll font-body">
        <!-- TOP EXECUTIVE KPI CARDS (Responsive Grid 2 to 5 columns) -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div class="glass-card p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-start">
            <div>
              <span class="text-[10px] sm:text-[11px] font-headline font-extrabold uppercase tracking-wider text-zinc-400">Total Prospectos</span>
              <h4 class="font-headline text-xl sm:text-2xl font-black text-zinc-900 dark:text-white mt-1">${totalLeads}</h4>
              <p class="text-[10px] sm:text-[11px] text-zinc-500 font-medium">Recibidos en cartera</p>
            </div>
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-base sm:text-lg">group</span>
            </div>
          </div>

          <div class="glass-card p-3.5 sm:p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 flex justify-between items-start">
            <div>
              <span class="text-[10px] sm:text-[11px] font-headline font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">Nuevas Consultas</span>
              <h4 class="font-headline text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">${newLeads}</h4>
              <p class="text-[10px] sm:text-[11px] text-blue-600/80 font-medium">Sin contactar aún</p>
            </div>
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow">
              <span class="material-symbols-outlined text-base sm:text-lg">mark_email_unread</span>
            </div>
          </div>

          <div class="glass-card p-3.5 sm:p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex justify-between items-start">
            <div>
              <span class="text-[10px] sm:text-[11px] font-headline font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">En Seguimiento</span>
              <h4 class="font-headline text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">${visitingLeads}</h4>
              <p class="text-[10px] sm:text-[11px] text-amber-600/80 font-medium">Citas & Contacto</p>
            </div>
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-base sm:text-lg">calendar_month</span>
            </div>
          </div>

          <div class="glass-card p-3.5 sm:p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex justify-between items-start">
            <div>
              <span class="text-[10px] sm:text-[11px] font-headline font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Conversión Cierre</span>
              <h4 class="font-headline text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">${conversionRate}%</h4>
              <p class="text-[10px] sm:text-[11px] text-emerald-600/80 font-medium">${closedLeads} cerrados exitosamente</p>
            </div>
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow">
              <span class="material-symbols-outlined text-base sm:text-lg">verified</span>
            </div>
          </div>

          <div class="glass-card p-3.5 sm:p-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 flex justify-between items-start col-span-2 sm:col-span-1 lg:col-span-1">
            <div>
              <span class="text-[10px] sm:text-[11px] font-headline font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">Créditos de Zona</span>
              <h4 class="font-headline text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">${VivatLeadStore.state.agent.credits}</h4>
              <p class="text-[10px] sm:text-[11px] text-purple-600/80 font-medium">${VivatLeadStore.state.agent.activeZones.length} Zonas asignadas</p>
            </div>
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-500/20 text-purple-600 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-base sm:text-lg">storefront</span>
            </div>
          </div>
        </div>

        <!-- BARRA DE CONTROL & SUB-NAVEGACIÓN -->
        <div class="glass-card p-3.5 sm:p-4 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <!-- Subtab buttons (Horizontal Scrollable on Mobile) -->
          <div class="flex items-center gap-1.5 sm:gap-2 bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700 overflow-x-auto whitespace-nowrap scrollbar-none">
            <button type="button" onclick="VivatLeadModule.switchLeadsSubtab('kanban')" class="px-3.5 py-2 rounded-lg text-xs font-headline font-black transition-all cursor-pointer flex items-center gap-1.5 ${isKanban ? 'bg-primary text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}">
              <span class="material-symbols-outlined text-base">view_kanban</span>
              <span>Embudo CRM Kanban (${totalLeads})</span>
            </button>
            <button type="button" onclick="VivatLeadModule.switchLeadsSubtab('table')" class="px-3.5 py-2 rounded-lg text-xs font-headline font-black transition-all cursor-pointer flex items-center gap-1.5 ${isTable ? 'bg-primary text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}">
              <span class="material-symbols-outlined text-base">table_rows</span>
              <span>Inbox & Lista Inteligente</span>
            </button>
            <button type="button" onclick="VivatLeadModule.switchLeadsSubtab('store')" class="px-3.5 py-2 rounded-lg text-xs font-headline font-black transition-all cursor-pointer flex items-center gap-1.5 ${isStore ? 'bg-primary text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}">
              <span class="material-symbols-outlined text-base">shopping_cart</span>
              <span>Tienda de Leads & Zonas</span>
            </button>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center gap-2 justify-end">
            <button type="button" onclick="VivatLeadModule.openAddManualLeadModal()" class="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-headline font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <span class="material-symbols-outlined text-base">person_add</span>
              <span>+ Nuevo Lead Manual</span>
            </button>
            <button type="button" onclick="VivatLeadModule.exportLeadsCSV()" class="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-headline font-bold text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer">
              <span class="material-symbols-outlined text-base">download</span>
              <span class="hidden sm:inline">Exportar CSV</span>
            </button>
          </div>
        </div>

        <!-- CONTENIDO DINÁMICO DE SUB-VISTAS -->
        <div id="leads-subview-container">
          ${isKanban ? this.renderKanbanView() : isTable ? this.renderTableInboxView() : this.renderStoreView()}
        </div>
      </div>
    `;
  },

  // 3. Sub-view 1: Kanban Pipeline CRM (Grilla Adaptativa sin Scroll Horizontal)
  renderKanbanView() {
    const leads = VivatLeadStore.state.leads;

    const columns = [
      { id: 'new', title: 'NUEVAS CONSULTAS', color: 'bg-blue-500', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
      { id: 'contacted', title: 'CONTACTO REALIZADO', color: 'bg-purple-500', badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
      { id: 'visiting', title: 'VISITA AGENDADA', color: 'bg-amber-500', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
      { id: 'negotiating', title: 'RESERVA / EVALUACIÓN', color: 'bg-rose-500', badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' }
    ];

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 font-body">
        ${columns.map(col => {
          const colLeads = leads.filter(l => l.status === col.id);
          return `
            <div class="rounded-3xl p-4 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex flex-col space-y-3.5 shadow-xs">
              <!-- Header de Columna -->
              <div class="flex items-center justify-between px-1">
                <span class="font-headline text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full ${col.color}"></span> ${col.title}
                </span>
                <span class="px-2.5 py-0.5 text-xs font-headline font-black rounded-full ${col.badgeColor}">${colLeads.length}</span>
              </div>

              <!-- Tarjetas de Leads -->
              <div class="space-y-3 flex-grow">
                ${colLeads.length === 0 ? `
                  <div class="p-5 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 text-xs">
                    Sin prospectos en esta etapa
                  </div>
                ` : colLeads.map(l => {
                  const cleanPhone = l.phone.replace(/[^0-9]/g, '');
                  const waUrl = `https://wa.me/${cleanPhone}`;
                  const sourceTag = l.source || 'Vivat';

                  return `
                    <div class="glass-card p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 space-y-2 shadow-sm hover:shadow-md transition-all bg-white dark:bg-zinc-800/90 font-body relative" onclick="VivatLeadModule.openLeadDetailModal('${l.id}')">
                      <!-- Fila Superior: Nombre Cliente + Origen Portal -->
                      <div class="flex items-start justify-between gap-2">
                        <h5 class="font-headline font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white leading-snug">${l.clientName}</h5>
                        <span class="px-2.5 py-0.5 text-[10px] font-headline font-bold rounded-lg ${sourceTag.toLowerCase().includes('zonaprop') ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200' : (sourceTag.toLowerCase().includes('argenprop') ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200' : (sourceTag.toLowerCase().includes('mls') ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'))} shrink-0">
                          ${sourceTag}
                        </span>
                      </div>

                      <!-- Subtítulo Inmueble -->
                      <p class="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">${l.propertyName}</p>

                      <!-- Presupuesto Destacado -->
                      <p class="font-headline text-xs font-bold text-rose-900 dark:text-rose-400">
                        Presupuesto: <span class="text-sm font-black text-rose-900 dark:text-rose-400">${l.propertyPrice}</span>
                      </p>

                      ${l.visitAppointment ? `
                        <p class="text-xs font-headline font-bold text-amber-600 dark:text-amber-400 pt-0.5">
                          Cita: ${l.visitAppointment}
                        </p>
                      ` : ''}

                      <!-- Footer con WhatsApp y Mover -->
                      <div class="pt-2.5 mt-1 border-t border-zinc-100 dark:border-zinc-700/60 flex items-center justify-between" onclick="event.stopPropagation()">
                        <a href="${waUrl}" target="_blank" class="text-xs font-headline font-extrabold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <span class="material-symbols-outlined text-base">chat</span> WhatsApp
                        </a>

                        <div class="flex items-center gap-1">
                          <select onchange="VivatLeadModule.moveLeadStage('${l.id}', this.value)" class="bg-transparent border-none text-xs font-headline font-extrabold text-rose-900 dark:text-rose-400 outline-none cursor-pointer hover:underline">
                            <option value="" disabled selected>Mover →</option>
                            <option value="new">Nuevas Consultas</option>
                            <option value="contacted">Contacto Realizado</option>
                            <option value="visiting">Visita Agendada</option>
                            <option value="negotiating">Reserva / Evaluación</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // 4. Sub-view 2: Table & Inbox View (Responsive Search & Filter Bar)
  renderTableInboxView() {
    const leads = VivatLeadStore.state.leads;

    // Filter leads
    const filtered = leads.filter(l => {
      const q = this.currentSearchQuery.toLowerCase();
      const matchesSearch = !q || l.clientName.toLowerCase().includes(q) || l.phone.includes(q) || l.propertyName.toLowerCase().includes(q) || (l.email && l.email.toLowerCase().includes(q));
      const matchesStatus = this.currentStatusFilter === 'all' || l.status === this.currentStatusFilter;
      const matchesSource = this.currentSourceFilter === 'all' || l.source === this.currentSourceFilter;
      return matchesSearch && matchesStatus && matchesSource;
    });

    return `
      <div class="space-y-4 font-body">
        <!-- Search and Filter controls -->
        <div class="glass-card p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div class="relative flex-1">
            <input type="text" id="lead-search-input" value="${this.currentSearchQuery}" oninput="VivatLeadModule.currentSearchQuery = this.value; VivatLeadModule.renderLeadsMainSection();" placeholder="Buscar por nombre, teléfono, email, propiedad..." class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20">
            <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-lg pointer-events-none">search</span>
          </div>

          <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select onchange="VivatLeadModule.currentStatusFilter = this.value; VivatLeadModule.renderLeadsMainSection();" class="flex-1 sm:flex-initial bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-headline font-bold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer">
              <option value="all" ${this.currentStatusFilter === 'all' ? 'selected' : ''}>Todos los Estados</option>
              <option value="new" ${this.currentStatusFilter === 'new' ? 'selected' : ''}>Nuevas Consultas</option>
              <option value="contacted" ${this.currentStatusFilter === 'contacted' ? 'selected' : ''}>Contacto Realizado</option>
              <option value="visiting" ${this.currentStatusFilter === 'visiting' ? 'selected' : ''}>Visita Programada</option>
              <option value="negotiating" ${this.currentStatusFilter === 'negotiating' ? 'selected' : ''}>Reserva / Evaluación</option>
              <option value="closed" ${this.currentStatusFilter === 'closed' ? 'selected' : ''}>Firmado & Cobrado</option>
              <option value="disputed" ${this.currentStatusFilter === 'disputed' ? 'selected' : ''}>Disputados</option>
            </select>

            <select onchange="VivatLeadModule.currentSourceFilter = this.value; VivatLeadModule.renderLeadsMainSection();" class="flex-1 sm:flex-initial bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-headline font-bold text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer">
              <option value="all" ${this.currentSourceFilter === 'all' ? 'selected' : ''}>Cualquier Origen</option>
              <option value="Vivat Directo" ${this.currentSourceFilter === 'Vivat Directo' ? 'selected' : ''}>Vivat Directo</option>
              <option value="Zonaprop" ${this.currentSourceFilter === 'Zonaprop' ? 'selected' : ''}>Zonaprop</option>
              <option value="Argenprop" ${this.currentSourceFilter === 'Argenprop' ? 'selected' : ''}>Argenprop</option>
              <option value="Red MLS" ${this.currentSourceFilter === 'Red MLS' ? 'selected' : ''}>Red MLS</option>
              <option value="Manual / Presencial" ${this.currentSourceFilter === 'Manual / Presencial' ? 'selected' : ''}>Manual / Presencial</option>
            </select>
          </div>
        </div>

        <!-- Table Container -->
        <div class="glass-card rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div class="overflow-x-auto max-w-full">
            <table class="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr class="bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700 text-[10px] sm:text-[11px] font-headline font-black uppercase tracking-wider whitespace-nowrap">
                  <th class="p-3 sm:p-3.5">Cliente Prospecto</th>
                  <th class="p-3 sm:p-3.5">Contacto / WhatsApp</th>
                  <th class="p-3 sm:p-3.5">Propiedad de Interés</th>
                  <th class="p-3 sm:p-3.5">Plazo Mudanza & Pago</th>
                  <th class="p-3 sm:p-3.5">Origen</th>
                  <th class="p-3 sm:p-3.5">Estado CRM</th>
                  <th class="p-3 sm:p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200/60 dark:divide-zinc-800 text-xs">
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="7" class="p-8 text-center text-zinc-400">No se encontraron prospectos que coincidan con la búsqueda.</td>
                  </tr>
                ` : filtered.map(l => {
                  const cleanPhone = l.phone.replace(/[^0-9]/g, '');
                  const waUrl = `https://wa.me/${cleanPhone}`;
                  const isHigh = l.intentScore === 'high';
                  const isVivat = l.source && (l.source.toLowerCase().includes('vivat') || l.source.toLowerCase().includes('vivat'));
                  const sourceBadgeClass = isVivat
                    ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/30'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700';

                  return `
                    <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td class="p-3 sm:p-3.5 font-bold text-zinc-900 dark:text-white">
                        <div class="flex items-center gap-2">
                          <span class="font-headline font-extrabold text-xs sm:text-sm">${l.clientName}</span>
                          ${isHigh ? '<span class="px-2 py-0.5 text-[9px] font-headline font-black uppercase bg-rose-500/10 text-rose-600 rounded-full border border-rose-500/20">Alta</span>' : ''}
                        </div>
                        <span class="text-[10px] text-zinc-400 font-normal block">${l.email || 'Sin email'}</span>
                      </td>

                      <td class="p-3 sm:p-3.5">
                        <span class="font-extrabold text-zinc-800 dark:text-zinc-200">${l.phone}</span>
                      </td>

                      <td class="p-3 sm:p-3.5">
                        <p class="font-bold text-zinc-900 dark:text-white truncate max-w-[200px]">${l.propertyName}</p>
                        <span class="text-[10px] text-primary font-headline font-extrabold">${l.propertyPrice}</span>
                      </td>

                      <td class="p-3 sm:p-3.5 text-zinc-600 dark:text-zinc-300">
                        <span class="block font-bold">${l.timeline}</span>
                        <span class="text-[10px] text-zinc-400">${l.creditType}</span>
                      </td>

                      <td class="p-3 sm:p-3.5">
                        <span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-headline font-black uppercase tracking-wider ${sourceBadgeClass}">
                          ${l.source || 'Vivat Directo'}
                        </span>
                      </td>

                      <td class="p-3 sm:p-3.5">
                        <select onchange="VivatLeadModule.moveLeadStage('${l.id}', this.value)" class="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1 text-xs font-headline font-bold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer">
                          <option value="new" ${l.status === 'new' ? 'selected' : ''}>Nuevas Consultas</option>
                          <option value="contacted" ${l.status === 'contacted' ? 'selected' : ''}>Contacto Realizado</option>
                          <option value="visiting" ${l.status === 'visiting' ? 'selected' : ''}>Visita Programada</option>
                          <option value="negotiating" ${l.status === 'negotiating' ? 'selected' : ''}>Reserva / Evaluación</option>
                          <option value="closed" ${l.status === 'closed' ? 'selected' : ''}>Firmado & Cobrado</option>
                          <option value="disputed" ${l.status === 'disputed' ? 'selected' : ''}>Disputado</option>
                        </select>
                      </td>

                      <td class="p-3 sm:p-3.5 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-2">
                          <button type="button" onclick="VivatLeadModule.openLeadDetailModal('${l.id}')" class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-headline font-bold text-xs rounded-xl transition-colors">
                            Ficha
                          </button>
                          <a href="${waUrl}" target="_blank" class="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-headline font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">chat</span> WhatsApp
                          </a>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  // 5. Sub-view 3: Tienda & Monetización View
  renderStoreView() {
    return `
      <div class="space-y-6 font-body">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-emerald-600 text-3xl">storefront</span>
              <div>
                <h3 class="font-headline font-extrabold text-base text-zinc-900 dark:text-white">Tienda de Leads por Zona Inmobiliaria</h3>
                <p class="text-xs text-zinc-500">Adquirí paquetes exclusivos por barrio (Palermo, Recoleta, Belgrano, etc.) integrados con Mercado Pago.</p>
              </div>
            </div>
            <button type="button" onclick="VivatLeadModule.openSubscriptionStoreModal()" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-headline font-extrabold text-xs rounded-xl shadow cursor-pointer flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-base">shopping_cart</span>
              <span>Explorar Tienda y Cupos de Zonas</span>
            </button>
          </div>

          <div class="glass-card p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-3">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-blue-600 text-3xl">verified_user</span>
              <div>
                <h3 class="font-headline font-extrabold text-base text-zinc-900 dark:text-white">Validación de Matrícula CUCICBA / CMCPSI</h3>
                <p class="text-xs text-zinc-500">Cumplí con las normativas locales y aumentá la conversión mostrando tu badge verificado.</p>
              </div>
            </div>
            <button type="button" onclick="VivatLeadModule.openOnboardingModal()" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-headline font-extrabold text-xs rounded-xl shadow cursor-pointer flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-base">badge</span>
              <span>Cargar / Actualizar Matrícula</span>
            </button>
          </div>
        </div>

        <div id="lead-inbox-container"></div>
      </div>
    `;
  },

  // 6. Modal: Detalle / Ficha Completa e Historial del Lead
  openLeadDetailModal(leadId) {
    const lead = VivatLeadStore.state.leads.find(l => l.id === leadId);
    if (!lead) return;

    const modalBody = document.getElementById('lead-detail-modal-content');
    const isDisputed = lead.status === 'disputed';
    const notes = lead.notes || [];

    modalBody.innerHTML = `
      <div class="p-4 sm:p-6 space-y-5 max-w-xl w-full mx-auto animate-on-scroll font-body">
        <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-headline font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Ficha CRM de Prospecto
              </span>
              <span class="text-[10px] text-zinc-400">Origen: ${lead.source || 'Vivat'}</span>
            </div>
            <h3 class="font-headline font-extrabold text-lg sm:text-xl text-zinc-900 dark:text-white mt-1">${lead.clientName}</h3>
          </div>
          <button onclick="document.getElementById('lead-detail-modal-backdrop').classList.add('hidden')" class="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
            <span class="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <!-- Prospect Data Grid -->
        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700">
              <span class="text-zinc-400 font-bold block text-[10px] uppercase">Teléfono / WhatsApp</span>
              <span class="font-extrabold text-zinc-900 dark:text-white text-sm">${lead.phone}</span>
            </div>
            <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700">
              <span class="text-zinc-400 font-bold block text-[10px] uppercase">Correo Electrónico</span>
              <span class="font-extrabold text-zinc-900 dark:text-white truncate block">${lead.email}</span>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
            <span class="text-primary font-headline font-black uppercase text-[10px]">Propiedad Consultada</span>
            <p class="font-headline font-extrabold text-zinc-900 dark:text-white text-xs sm:text-sm">${lead.propertyName}</p>
            <p class="text-zinc-500">${lead.propertyAddress} • <strong class="text-primary font-headline font-black">${lead.propertyPrice}</strong></p>
          </div>

          <div class="space-y-2">
            <span class="text-zinc-400 font-bold uppercase text-[10px]">Respuestas de Intención & Calificación</span>
            <div class="flex flex-wrap gap-2">
              <span class="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-600 font-extrabold text-[11px]">${lead.timeline}</span>
              <span class="px-3 py-1 rounded-lg ${lead.hasCredit ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'} font-extrabold text-[11px]">
                ${lead.creditType}
              </span>
              ${lead.hasPropertyToSell ? '<span class="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-600 font-extrabold text-[11px]">Requiere Tasación</span>' : ''}
            </div>
          </div>

          <!-- Timeline / Notes Section -->
          <div class="space-y-3 pt-2">
            <span class="text-zinc-800 dark:text-zinc-200 font-headline font-extrabold text-xs block">Historial de Notas & Eventos CRM</span>
            
            <div class="flex gap-2">
              <input type="text" id="new-lead-note-input" placeholder="Escribir nota interna..." class="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none">
              <button type="button" onclick="VivatLeadModule.addLeadNoteHandler('${lead.id}')" class="px-3.5 py-2 bg-primary text-white font-headline font-extrabold text-xs rounded-xl shadow-sm hover:bg-primary-hover shrink-0">
                Añadir
              </button>
            </div>

            <div class="space-y-2 max-h-36 overflow-y-auto pr-1">
              ${notes.length === 0 ? `
                <p class="text-[11px] text-zinc-400 italic">Sin notas registradas aún.</p>
              ` : notes.map(n => `
                <div class="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-[11px] space-y-0.5 border border-zinc-200/60 dark:border-zinc-700">
                  <div class="flex justify-between text-zinc-400 text-[10px]">
                    <span>Nota Interna</span>
                    <span>${n.date}</span>
                  </div>
                  <p class="text-zinc-800 dark:text-zinc-200 font-medium">${n.text}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <button type="button" onclick="VivatLeadModule.openDisputeModal('${lead.id}'); document.getElementById('lead-detail-modal-backdrop').classList.add('hidden');" class="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-headline font-bold text-xs">
            ${isDisputed ? 'Ver Disputa' : 'Disputar Lead'}
          </button>
          <a href="https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}" target="_blank" class="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-headline font-extrabold text-xs shadow flex items-center gap-1.5">
            <span class="material-symbols-outlined text-base">chat</span>
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    `;
    document.getElementById('lead-detail-modal-backdrop').classList.remove('hidden');
  },

  addLeadNoteHandler(leadId) {
    const input = document.getElementById('new-lead-note-input');
    if (!input || !input.value.trim()) return;
    VivatLeadStore.addLeadNote(leadId, input.value.trim());
    this.openLeadDetailModal(leadId);
    this.showToast('Nota añadida al historial del prospecto.', 'success');
  },

  // 7. Modal: Alta Manual de Lead
  openAddManualLeadModal() {
    this.renderAddManualLeadModal();
    document.getElementById('add-manual-lead-modal-backdrop').classList.remove('hidden');
  },

  closeAddManualLeadModal() {
    document.getElementById('add-manual-lead-modal-backdrop').classList.add('hidden');
  },

  renderAddManualLeadModal() {
    const modalBody = document.getElementById('add-manual-lead-modal-content');
    modalBody.innerHTML = `
      <div class="p-4 sm:p-6 space-y-5 max-w-md w-full mx-auto font-body">
        <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <span class="text-[10px] font-headline font-black uppercase text-emerald-600 tracking-wider">Ingreso CRM Directo</span>
            <h3 class="font-headline font-extrabold text-lg text-zinc-900 dark:text-white">Registrar Nuevo Lead Manual</h3>
          </div>
          <button onclick="VivatLeadModule.closeAddManualLeadModal()" class="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onsubmit="event.preventDefault(); VivatLeadModule.submitAddManualLeadForm();" class="space-y-4 text-xs">
          <div>
            <label class="block font-headline font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Nombre y Apellido del Cliente *</label>
            <input type="text" id="manual-lead-name" placeholder="Ej: Marcelo Fernández" required class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-headline font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Teléfono / WhatsApp *</label>
              <input type="tel" id="manual-lead-phone" placeholder="+54 9 11 5544-3322" required class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
            </div>
            <div>
              <label class="block font-headline font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Correo Electrónico</label>
              <input type="email" id="manual-lead-email" placeholder="cliente@email.com" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
            </div>
          </div>

          <div>
            <label class="block font-headline font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Propiedad o Consulta de Interés</label>
            <input type="text" id="manual-lead-property" placeholder="Ej: Depto 3 Ambientes Palermo Soho" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-headline font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Presupuesto Estimado</label>
              <input type="text" id="manual-lead-price" placeholder="Ej: $ 500.000 / mes o USD 150k" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
            </div>
            <div>
              <label class="block font-headline font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Canal de Origen</label>
              <select id="manual-lead-source" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-headline font-bold text-zinc-900 dark:text-white outline-none">
                <option value="Manual / Presencial">Atención Presencial Oficina</option>
                <option value="Llamada Telefónica">Llamada Telefónica</option>
                <option value="WhatsApp Directo">WhatsApp Directo</option>
                <option value="Referido">Referido de Cliente</option>
                <option value="Cartel en Inmueble">Cartel en Inmueble</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-headline font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Nota Inicial de Seguimiento</label>
            <textarea id="manual-lead-note" rows="2" placeholder="Ej: Llamó preguntando disponibilidad para visitar..." class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs font-bold text-zinc-900 dark:text-white outline-none"></textarea>
          </div>

          <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
            <button type="button" onclick="VivatLeadModule.closeAddManualLeadModal()" class="px-4 py-2 text-xs font-headline font-bold text-zinc-400 hover:text-zinc-600">Cancelar</button>
            <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-headline font-extrabold text-xs rounded-xl shadow cursor-pointer">
              Guardar Prospecto
            </button>
          </div>
        </form>
      </div>
    `;
  },

  submitAddManualLeadForm() {
    const name = document.getElementById('manual-lead-name')?.value;
    const phone = document.getElementById('manual-lead-phone')?.value;
    const email = document.getElementById('manual-lead-email')?.value;
    const property = document.getElementById('manual-lead-property')?.value;
    const price = document.getElementById('manual-lead-price')?.value;
    const source = document.getElementById('manual-lead-source')?.value;
    const note = document.getElementById('manual-lead-note')?.value;

    if (!name || !phone) return;

    VivatLeadStore.addManualLead({
      clientName: name,
      phone: phone,
      email: email,
      propertyName: property,
      propertyPrice: price,
      source: source,
      note: note
    });

    this.closeAddManualLeadModal();
    this.showToast('¡Lead registrado con éxito en el CRM!', 'success');
  },

  moveLeadStage(leadId, targetStage) {
    VivatLeadStore.changeLeadStatus(leadId, targetStage);
    this.showToast(`Estado actualizado a "${targetStage.toUpperCase()}"`, 'info');
  },

  exportLeadsCSV() {
    const leads = VivatLeadStore.state.leads;
    let csv = 'ID,Nombre,Telefono,Email,Propiedad,Precio,Estado,Origen,Fecha\n';
    leads.forEach(l => {
      csv += `"${l.id}","${l.clientName}","${l.phone}","${l.email || ''}","${l.propertyName}","${l.propertyPrice}","${l.status}","${l.source || ''}","${l.createdAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    this.showToast('Exportación CSV completada exitosamente.', 'success');
  },

  // 8. Subscription Store Modal (Tienda de Zonas y Paquetes de Leads)
  openSubscriptionStoreModal() {
    this.renderSubscriptionStoreModal();
    document.getElementById('subscription-store-modal-backdrop').classList.remove('hidden');
  },

  closeSubscriptionStoreModal() {
    document.getElementById('subscription-store-modal-backdrop').classList.add('hidden');
  },

  renderSubscriptionStoreModal() {
    const modalBody = document.getElementById('subscription-store-modal-content');
    const { zones, agent, selectedPackage } = VivatLeadStore.state;

    const pkgPriceARS = selectedPackage === 'starter' ? 180000 : selectedPackage === 'pro' ? 390000 : 850000;
    const pkgLeads = selectedPackage === 'starter' ? 15 : selectedPackage === 'pro' ? 50 : 120;

    modalBody.innerHTML = `
      <div class="p-4 sm:p-6 space-y-6 max-w-4xl w-full mx-auto font-body">
        <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-headline font-black uppercase border border-emerald-500/20">
              Tienda Oficial de Leads por Zona
            </span>
            <h3 class="font-headline font-extrabold text-lg sm:text-xl text-zinc-900 dark:text-white mt-1">Comprar Cupos de Leads Exclusivos</h3>
          </div>
          <button onclick="VivatLeadModule.closeSubscriptionStoreModal()" class="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
            <div>
              <p class="text-xs font-headline font-bold text-zinc-900 dark:text-white">Saldo de Leads Activo</p>
              <p class="text-xs text-zinc-500">${agent.credits} leads disponibles de ${agent.totalCreditsAcquired} totales</p>
            </div>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-headline font-black bg-primary text-white">Matrícula ${agent.matriculaNumber} OK</span>
        </div>

        <div>
          <label class="block text-xs font-headline font-extrabold uppercase text-zinc-500 mb-3">1. Seleccioná tu Paquete de Leads</label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div onclick="VivatLeadModule.selectPackage('starter')" class="p-4 rounded-2xl border-2 ${selectedPackage === 'starter' ? 'border-primary bg-primary/5' : 'border-zinc-200 dark:border-zinc-800'} cursor-pointer hover:border-primary transition-all">
              <span class="text-[10px] font-headline font-black uppercase text-zinc-400">Starter</span>
              <h4 class="font-headline font-extrabold text-lg text-zinc-900 dark:text-white">15 Leads / mes</h4>
              <p class="text-xs font-headline font-extrabold text-primary mt-1">$ 180.000 ARS<span class="text-[10px] text-zinc-400 font-normal"> /mes</span></p>
              <p class="text-[11px] text-zinc-500 mt-2">$ 12.000 ARS por lead</p>
            </div>

            <div onclick="VivatLeadModule.selectPackage('pro')" class="p-4 rounded-2xl border-2 ${selectedPackage === 'pro' ? 'border-primary bg-primary/5 shadow-md' : 'border-zinc-200 dark:border-zinc-800'} cursor-pointer hover:border-primary transition-all relative">
              <span class="absolute -top-3 right-3 px-2 py-0.5 rounded-full bg-primary text-white text-[9px] font-headline font-black uppercase">Más Popular ⭐</span>
              <span class="text-[10px] font-headline font-black uppercase text-zinc-400">Pro Agentes</span>
              <h4 class="font-headline font-extrabold text-lg text-zinc-900 dark:text-white">50 Leads / mes</h4>
              <p class="text-xs font-headline font-extrabold text-primary mt-1">$ 390.000 ARS<span class="text-[10px] text-zinc-400 font-normal"> /mes</span></p>
              <p class="text-[11px] text-zinc-500 mt-2">$ 7.800 ARS por lead</p>
            </div>

            <div onclick="VivatLeadModule.selectPackage('enterprise')" class="p-4 rounded-2xl border-2 ${selectedPackage === 'enterprise' ? 'border-primary bg-primary/5' : 'border-zinc-200 dark:border-zinc-800'} cursor-pointer hover:border-primary transition-all">
              <span class="text-[10px] font-headline font-black uppercase text-zinc-400">Enterprise</span>
              <h4 class="font-headline font-extrabold text-lg text-zinc-900 dark:text-white">120 Leads / mes</h4>
              <p class="text-xs font-headline font-extrabold text-primary mt-1">$ 850.000 ARS<span class="text-[10px] text-zinc-400 font-normal"> /mes</span></p>
              <p class="text-[11px] text-zinc-500 mt-2">$ 7.083 ARS por lead</p>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-headline font-extrabold uppercase text-zinc-500 mb-3">2. Seleccioná las Zonas / Barrios de Cobertura</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${zones.map(z => {
              const isSelected = agent.activeZones.includes(z.id);
              const isFull = z.availableQuota === 0;
              return `
                <div onclick="${isFull ? '' : `VivatLeadModule.toggleZoneSelection('${z.id}')`}" class="p-3 rounded-xl border ${isSelected ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800'} ${isFull ? 'opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/40' : 'cursor-pointer hover:border-emerald-500'} flex items-center justify-between">
                  <div>
                    <h5 class="text-xs font-headline font-extrabold text-zinc-900 dark:text-white">${z.name}</h5>
                    <p class="text-[10px] text-zinc-400">CP ${z.postalCode} • ARS $${z.pricePerLeadARS.toLocaleString('es-AR')}</p>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-headline font-black ${isFull ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'}">
                    ${isFull ? 'Cupos Agotados' : `${z.availableQuota} de ${z.maxQuota} cupos`}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span class="text-[10px] font-headline font-black uppercase text-blue-600">Integración Directa Mercado Pago</span>
            <h4 class="font-headline font-extrabold text-base text-zinc-900 dark:text-white">Total ARS: $${pkgPriceARS.toLocaleString('es-AR')} + IVA</h4>
            <p class="text-xs text-zinc-500">Incluye ${pkgLeads} créditos de leads y asignación a ${agent.activeZones.length} zonas seleccionadas.</p>
          </div>
          <button type="button" onclick="VivatLeadModule.confirmMercadoPagoCheckout()" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#009EE3] hover:bg-[#008ac7] text-white font-headline font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0">
            <span class="material-symbols-outlined">payments</span>
            <span>Pagar con Mercado Pago</span>
          </button>
        </div>
      </div>
    `;
  },

  selectPackage(pkg) {
    VivatLeadStore.state.selectedPackage = pkg;
    this.renderSubscriptionStoreModal();
  },

  toggleZoneSelection(zoneId) {
    const active = VivatLeadStore.state.agent.activeZones;
    const idx = active.indexOf(zoneId);
    if (idx > -1) {
      active.splice(idx, 1);
    } else {
      active.push(zoneId);
    }
    this.renderSubscriptionStoreModal();
  },

  confirmMercadoPagoCheckout() {
    VivatLeadStore.buyPackage(VivatLeadStore.state.agent.activeZones, VivatLeadStore.state.selectedPackage);
    this.closeSubscriptionStoreModal();
    this.showToast('¡Pago procesado con éxito! Créditos acreditados en tu cuenta.', 'success');
  },

  // 9. Onboarding / Matrícula Validation Modal
  openOnboardingModal() {
    this.renderOnboardingModal();
    document.getElementById('onboarding-modal-backdrop').classList.remove('hidden');
  },

  closeOnboardingModal() {
    document.getElementById('onboarding-modal-backdrop').classList.add('hidden');
  },

  renderOnboardingModal() {
    const modalBody = document.getElementById('onboarding-modal-content');
    const agent = VivatLeadStore.state.agent;

    modalBody.innerHTML = `
      <div class="p-4 sm:p-6 space-y-5 max-w-xl w-full mx-auto font-body">
        <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <span class="text-[10px] font-headline font-black uppercase text-primary tracking-wider">Validación de Identidad Profesional</span>
            <h3 class="font-headline font-extrabold text-lg text-zinc-900 dark:text-white">Carga de Matrícula CUCICBA / CMCPSI</h3>
          </div>
          <button onclick="VivatLeadModule.closeOnboardingModal()" class="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onsubmit="event.preventDefault(); VivatLeadModule.submitMatriculaForm();" class="space-y-4">
          <div>
            <label class="block text-xs font-headline font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Colegio Profesional Regulador</label>
            <select id="onboard-jurisdiction" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-headline font-bold text-zinc-900 dark:text-white outline-none">
              <option value="CUCICBA" ${agent.jurisdiction === 'CUCICBA' ? 'selected' : ''}>CUCICBA - Ciudad Autónoma de Buenos Aires</option>
              <option value="CMCPSI" ${agent.jurisdiction === 'CMCPSI' ? 'selected' : ''}>CMCPSI - San Isidro / GBA Norte</option>
              <option value="COCIR" ${agent.jurisdiction === 'COCIR' ? 'selected' : ''}>COCIR - Rosario, Santa Fe</option>
              <option value="CPMCPCR" ${agent.jurisdiction === 'CPMCPCR' ? 'selected' : ''}>CPMCPCR - Córdoba</option>
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-headline font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">N° de Matrícula Profesional</label>
              <input type="text" id="onboard-matricula" value="${agent.matriculaNumber}" placeholder="Ej: 7842" required class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
            </div>

            <div>
              <label class="block text-xs font-headline font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">CUIT del Titular</label>
              <input type="text" id="onboard-cuit" value="${agent.cuit}" placeholder="20-31849201-7" required class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none">
            </div>
          </div>

          <div>
            <label class="block text-xs font-headline font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Credencial Profesional (Frente y Dorso)</label>
            <div class="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 text-center hover:border-primary transition-all cursor-pointer bg-zinc-50 dark:bg-zinc-800/40">
              <span class="material-symbols-outlined text-3xl text-zinc-400 mb-2">badge</span>
              <p class="text-xs font-headline font-bold text-zinc-700 dark:text-zinc-300">Hacé clic para adjuntar foto de tu carnet de corredor</p>
              <p class="text-[10px] text-zinc-400 mt-1">Formatos soportados: JPG, PNG o PDF (Máx. 10 MB)</p>
            </div>
          </div>

          <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
            <button type="button" onclick="VivatLeadModule.closeOnboardingModal()" class="px-4 py-2 text-xs font-headline font-bold text-zinc-400 hover:text-zinc-600">Cancelar</button>
            <button type="submit" class="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-headline font-extrabold text-xs rounded-xl shadow cursor-pointer">
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

    VivatLeadStore.updateAgentMatricula({ matriculaNumber: mat, jurisdiction: jur, cuit: cuit });
    this.closeOnboardingModal();
    this.showToast('Datos de matrícula enviados. El estado cambiará a verificado en breve.', 'info');
  },

  // 10. Dispute Lead Modal (Reembolso por Lead Spam o Inválido)
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
    const lead = VivatLeadStore.state.leads.find(l => l.id === this.currentDisputeLeadId);
    if (!lead) return;

    modalBody.innerHTML = `
      <div class="p-4 sm:p-6 space-y-5 max-w-md w-full mx-auto font-body">
        <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <span class="text-[10px] font-headline font-black uppercase text-red-500 tracking-wider">SLA de Garantía 48 Horas</span>
            <h3 class="font-headline font-extrabold text-lg text-zinc-900 dark:text-white">Disputar / Reportar Lead Inválido</h3>
          </div>
          <button onclick="VivatLeadModule.closeDisputeModal()" class="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
          <p class="text-xs font-headline font-bold text-zinc-900 dark:text-white">${lead.clientName}</p>
          <p class="text-xs text-zinc-500">${lead.phone} • ${lead.propertyName}</p>
        </div>

        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-headline font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Motivo de la Disputa</label>
            <select id="dispute-reason-select" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-headline font-bold text-zinc-900 dark:text-white outline-none">
              <option value="INVALID_PHONE">Teléfono Inexistente / Fuera de Servicio</option>
              <option value="SPAM_OR_BOT">Spam o Bot Publicitario</option>
              <option value="WRONG_NUMBER">Número Equivocado / Persona No Solicitó</option>
              <option value="WRONG_INTENT">Buscaba Alquiler cuando la Propiedad es Venta</option>
            </select>
          </div>

          <div>
            <label class="block font-headline font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Detalles Adicionales</label>
            <textarea id="dispute-comments" rows="3" placeholder="Explique brevemente el intento de contacto realizado..." class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs font-bold text-zinc-900 dark:text-white outline-none"></textarea>
          </div>
        </div>

        <div class="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
          <button type="button" onclick="VivatLeadModule.closeDisputeModal()" class="px-4 py-2 text-xs font-headline font-bold text-zinc-400 hover:text-zinc-600">Cancelar</button>
          <button type="button" onclick="VivatLeadModule.confirmDispute()" class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-headline font-extrabold text-xs rounded-xl shadow cursor-pointer">
            Enviar Disputa de Lead
          </button>
        </div>
      </div>
    `;
  },

  confirmDispute() {
    const reason = document.getElementById('dispute-reason-select').value;
    const comments = document.getElementById('dispute-comments').value;
    VivatLeadStore.disputeLead(this.currentDisputeLeadId, reason, comments);
    this.closeDisputeModal();
    this.showToast('Disputa enviada. El crédito será reembolsado si la revisión es aprobada.', 'warning');
  },

  checkLowBalanceWarning() {
    if (VivatLeadStore.state.agent.credits < 5) {
      this.showToast(`⚠️ ¡Atención! Te quedan solo ${VivatLeadStore.state.agent.credits} leads disponibles. Recargá tu paquete para no perder clientes.`, 'warning');
    }
  },

  renderLeadInbox() {
    const container = document.getElementById('lead-inbox-container');
    if (!container) return;

    const leads = VivatLeadStore.state.leads;

    container.innerHTML = `
      <div class="space-y-4 font-body">
        <div class="flex items-center justify-between">
          <h3 class="font-headline font-extrabold text-base text-zinc-900 dark:text-white">Inbox de Leads en Tiempo Real</h3>
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-headline font-extrabold">${leads.length} Leads Recibidos</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${leads.map(l => {
            const isDisputed = l.status === 'disputed';
            const badgeBg = isDisputed ? 'bg-red-500/10 text-red-600' : l.status === 'new' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600';
            return `
              <div class="glass-card p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-headline font-black uppercase ${badgeBg}">${l.status.toUpperCase()}</span>
                  <span class="text-[10px] text-zinc-400 font-medium">${l.createdAt}</span>
                </div>

                <div>
                  <h4 class="font-headline font-extrabold text-sm text-zinc-900 dark:text-white">${l.clientName}</h4>
                  <p class="text-xs text-zinc-500">${l.phone}</p>
                </div>

                <div class="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-[11px] space-y-1">
                  <p class="font-bold text-zinc-800 dark:text-zinc-200 truncate">${l.propertyName}</p>
                  <p class="text-primary font-headline font-bold">${l.timeline}</p>
                </div>

                <div class="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                  <button type="button" onclick="VivatLeadModule.openLeadDetailModal('${l.id}')" class="text-xs font-headline font-extrabold text-zinc-600 dark:text-zinc-300 hover:text-primary">
                    Ver Detalles
                  </button>
                  <a href="https://wa.me/${l.phone.replace(/[^0-9]/g, '')}" target="_blank" class="px-3 py-1.5 rounded-xl bg-[#25D366] text-white text-xs font-headline font-extrabold flex items-center gap-1">
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

  // Toast Notification System
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = type === 'success' ? 'bg-emerald-600' : type === 'warning' ? 'bg-amber-600' : 'bg-blue-600';
    toast.className = `fixed bottom-6 right-6 ${colors} text-white px-5 py-3 rounded-2xl shadow-xl font-body text-xs font-headline font-extrabold z-[9999] transition-all transform translate-y-0 opacity-100 flex items-center gap-2`;
    toast.innerHTML = `<span class="material-symbols-outlined text-sm">info</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // Modal Container Injector
  injectModalContainers() {
    if (document.getElementById('add-manual-lead-modal-backdrop')) return;

    const modalHTML = `
      <!-- Manual Lead Add Modal Backdrop -->
      <div id="add-manual-lead-modal-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 hidden">
        <div id="add-manual-lead-modal-content" class="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"></div>
      </div>

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
        <div id="lead-detail-modal-content" class="bg-white dark:bg-zinc-900 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"></div>
      </div>

      <!-- Request Agent Modal Backdrop -->
      <div id="request-agent-modal-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 hidden">
        <div id="request-agent-modal-content" class="bg-white dark:bg-zinc-900 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200 dark:border-zinc-800"></div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
};

// Auto Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  VivatLeadModule.init();
});
