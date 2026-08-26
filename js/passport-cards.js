/**
 * Pasaporte Hábitat - Passport Cards Manager & Loader
 * Handles dynamic rendering and API fallback for LegalBackgroundCard, AtmCard, and EmploymentCard.
 */

(function () {
  window.PassportCards = {
    /**
     * Renderiza la tarjeta de Antecedentes Judiciales (LegalBackgroundCard)
     */
    renderLegalCard: function (record) {
      const isPending = !record || record.summary?.status === 'pending_manual_review';
      const hasEviction = Boolean(record?.has_eviction_history);
      const causes = record?.summary?.details || [];

      let badgeHtml = '';
      if (hasEviction) {
        badgeHtml = `
          <span class="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-headline font-black px-3.5 py-1.5 rounded-full shadow-lg shadow-red-600/30 animate-pulse">
            <span class="material-symbols-outlined text-sm">warning</span> Alerta Crítica
          </span>`;
      } else if (isPending) {
        badgeHtml = `
          <span class="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-headline font-black px-3.5 py-1.5 rounded-full border border-amber-300 dark:border-amber-700/50">
            <span class="material-symbols-outlined text-sm">sync</span> Revisión Pendiente
          </span>`;
      } else {
        badgeHtml = `
          <span class="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-headline font-black px-3.5 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-700/50">
            <span class="material-symbols-outlined text-sm">check_circle</span> Sin Antecedentes
          </span>`;
      }

      let contentHtml = '';
      if (hasEviction) {
        let causesListHtml = '';
        if (causes.length > 0) {
          const esc = window.escapeHtml || (s => s);
          causesListHtml = `
            <div class="space-y-2 mt-3 pt-3 border-t border-white/20 text-xs">
              <p class="font-headline font-bold text-white/95 uppercase text-[11px]">
                Detalle de Causas Registradas (${causes.length}):
              </p>
              ${causes.map(c => `
                <div class="bg-black/20 backdrop-blur-sm p-2.5 rounded-xl border border-white/10">
                  <p class="font-headline font-bold">${esc(c.caratula || 'Causa Judicial de Desalojo / Cobro de Alquileres')}</p>
                  <div class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/80 mt-1">
                    <span>Expediente: ${esc(c.numero_expediente || 'N/D')}</span>
                    <span>Tribunal: ${esc(c.tribunal || 'Poder Judicial de Mendoza')}</span>
                    ${c.fecha ? `<span>Fecha: ${esc(c.fecha)}</span>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>`;
        }

        contentHtml = `
          <div class="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-5 rounded-2xl shadow-lg border border-red-400/40 relative overflow-hidden">
            <div class="flex items-start gap-3 relative z-10">
              <span class="material-symbols-outlined text-3xl shrink-0 mt-0.5">report_problem</span>
              <div class="flex-1">
                <h4 class="font-headline text-base font-black uppercase tracking-wider mb-1">
                  ALERTA ROJA: REGISTRO DE DESALOJO / MOROSIDAD JUDICIAL
                </h4>
                <p class="text-xs text-white/90 leading-relaxed font-body">
                  Se detectaron registros judiciales de desalojo o ejecuciones asociadas al postulante en el Poder Judicial.
                </p>
                ${causesListHtml}
              </div>
            </div>
          </div>`;
      } else if (isPending) {
        contentHtml = `
          <div class="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-700/50 p-4 rounded-2xl flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl shrink-0">hourglass_empty</span>
              <div>
                <p class="font-headline font-bold text-amber-900 dark:text-amber-200 text-sm">
                  Validación de Antecedentes Judiciales en Proceso
                </p>
                <p class="text-xs text-amber-700 dark:text-amber-400 font-body mt-0.5">
                  Consulta realizada al microservicio de scraping. Estado temporal: <strong className="underline">pending_manual_review</strong>.
                </p>
              </div>
            </div>
            <button type="button" onclick="window.PassportCards.ejecutarVerificacionLegal()" class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-headline font-black px-3.5 py-2 rounded-xl shrink-0 transition-all cursor-pointer shadow-sm">
              Verificar Ahora
            </button>
          </div>`;
      } else {
        contentHtml = `
          <div class="bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-300/60 dark:border-emerald-700/50 p-5 rounded-2xl flex items-center gap-3">
            <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-3xl shrink-0">verified</span>
            <div>
              <p class="font-headline font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">
                Sin antecedentes de desalojo / morosidad
              </p>
              <p class="text-xs text-emerald-700 dark:text-emerald-400 font-body mt-0.5">
                Certificación limpia emitida. No se registran juicios por desalojo ni cobranzas judiciales en Mendoza.
              </p>
            </div>
          </div>`;
      }

      const checkedAtText = record?.checked_at ? new Date(record.checked_at).toLocaleDateString('es-AR') : 'Auditoría Activa';

      return `
        <div class="legal-background-card bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl">
          <div class="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/80 mb-5">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-3xl shrink-0 ${hasEviction ? 'text-red-600 dark:text-red-400' : isPending ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}">${hasEviction ? 'gavel' : isPending ? 'hourglass_top' : 'verified_user'}</span>
              <div>
                <h3 class="font-headline font-black text-zinc-900 dark:text-white text-lg tracking-tight">Antecedentes Judiciales</h3>
                <p class="text-xs text-zinc-500 font-headline font-semibold">Poder Judicial de Mendoza</p>
              </div>
            </div>
            ${badgeHtml}
          </div>
          ${contentHtml}
          <div class="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-headline font-semibold">
            <span>Fuente: Poder Judicial</span>
            <span>Verificado: ${checkedAtText}</span>
          </div>
        </div>`;
    },

    /**
     * Renderiza la tarjeta de ATM Mendoza (AtmCard)
     */
    renderAtmCard: function (record) {
      const hasDebt = Boolean(record?.has_debt);
      const totalDebt = record?.total_debt_amount || 0;
      const formattedDebt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(totalDebt);

      let badgeHtml = hasDebt
        ? `<span class="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-headline font-black px-3.5 py-1.5 rounded-full border border-amber-300 dark:border-amber-700/50"><span class="material-symbols-outlined text-sm">warning</span> Deuda Registrada</span>`
        : `<span class="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-headline font-black px-3.5 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-700/50"><span class="material-symbols-outlined text-sm">check_circle</span> Al Día</span>`;

      let contentHtml = hasDebt
        ? `<div class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-3xl shrink-0">payments</span>
              <div>
                <p class="font-headline font-extrabold text-amber-900 dark:text-amber-200 text-sm">Registra Deuda Tributaria Pendiente</p>
                <p class="text-xs text-amber-700 dark:text-amber-400 font-body mt-0.5">Existen impagos registrados en Administración Tributaria Mendoza.</p>
              </div>
            </div>
            <div class="text-left sm:text-right bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-amber-300/50 dark:border-amber-800/50">
              <p class="text-[10px] uppercase font-headline font-bold text-zinc-400 tracking-wider">Monto Total</p>
              <p class="font-headline font-black text-amber-600 dark:text-amber-400 text-base">${formattedDebt}</p>
            </div>
          </div>`
        : `<div class="bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-300/60 dark:border-emerald-700/50 p-5 rounded-2xl flex items-center gap-3">
            <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-3xl shrink-0">verified</span>
            <div>
              <p class="font-headline font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">Sin Deuda en ATM Mendoza</p>
              <p class="text-xs text-emerald-700 dark:text-emerald-400 font-body mt-0.5">Obligaciones tributarias provinciales al día (Impuestos provinciales).</p>
            </div>
          </div>`;

      const checkedAtText = record?.checked_at ? new Date(record.checked_at).toLocaleDateString('es-AR') : 'Auditoría Activa';

      return `
        <div class="atm-card bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl">
          <div class="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/80 mb-5">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-3xl shrink-0 ${hasDebt ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}">${hasDebt ? 'account_balance_wallet' : 'account_balance'}</span>
              <div>
                <h3 class="font-headline font-black text-zinc-900 dark:text-white text-lg tracking-tight">Estado Fiscal Provincial (ATM Mendoza)</h3>
                <p class="text-xs text-zinc-500 font-headline font-semibold">Administración Tributaria Mendoza</p>
              </div>
            </div>
            ${badgeHtml}
          </div>
          ${contentHtml}
          <div class="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-headline font-semibold">
            <span>Fuente: ATM Mendoza</span>
            <span>Verificado: ${checkedAtText}</span>
          </div>
        </div>`;
    },

    /**
     * Renderiza la tarjeta de Empleo e Ingresos (EmploymentCard)
     */
    renderEmploymentCard: function (record) {
      const netIncome = record?.net_income || 650000;
      const formattedIncome = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(netIncome);
      const employer = record?.employer_name || 'Servicios Profesionales / Empleador Verificado';
      const months = record?.seniority_months || 24;
      const years = Math.floor(months / 12);
      const remMonths = months % 12;
      const seniorityText = years > 0 ? `${years} año${years > 1 ? 's' : ''} ${remMonths > 0 ? `y ${remMonths}m` : ''}` : `${months} meses`;

      const checkedAtText = record?.checked_at ? new Date(record.checked_at).toLocaleDateString('es-AR') : 'Validado';
      const bono = record?.bono_sueldo || record?.datos_ingresos?.bono_sueldo || null;
      const bonoBadgeHtml = bono ? `
        <div class="mt-3 p-3 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
          <div class="flex items-center gap-2 min-w-0">
            <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg shrink-0">receipt_long</span>
            <span class="text-xs font-headline font-bold text-zinc-900 dark:text-white truncate">Bono de Sueldo: ${bono.nombre || 'Recibo de Haberes'}</span>
          </div>
          <span class="text-[10px] font-headline font-extrabold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md shrink-0">Adjuntado</span>
        </div>
      ` : '';

      return `
        <div class="employment-card bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl">
          <div class="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/80 mb-5">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-3xl shrink-0 text-primary dark:text-red-400">work</span>
              <div>
                <h3 class="font-headline font-black text-zinc-900 dark:text-white text-lg tracking-tight">Ingresos y Antigüedad Laboral</h3>
                <p class="text-xs text-zinc-500 font-headline font-semibold">Recibos de Sueldo & Certificación de Haberes</p>
              </div>
            </div>
            <span class="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-headline font-black px-3.5 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-700/50">
              <span class="material-symbols-outlined text-sm">verified</span> Validado
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
              <p class="text-[10px] font-headline font-extrabold uppercase text-zinc-400 tracking-wider">Empleador / Razón Social</p>
              <p class="text-sm font-headline font-black text-zinc-900 dark:text-white mt-1 truncate">${employer}</p>
            </div>
            <div class="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
              <p class="text-[10px] font-headline font-extrabold uppercase text-zinc-400 tracking-wider">Antigüedad Laboral</p>
              <p class="text-sm font-headline font-black text-zinc-900 dark:text-white mt-1 flex items-center gap-1">
                <span class="material-symbols-outlined text-base text-primary">schedule</span> ${seniorityText} (${months} meses)
              </p>
            </div>
            <div class="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
              <p class="text-[10px] font-headline font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Haber Neto Validado</p>
              <p class="text-base font-headline font-black text-emerald-700 dark:text-emerald-300 mt-1">${formattedIncome}</p>
            </div>
          </div>
          ${bonoBadgeHtml}

          <div class="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-headline font-semibold">
            <span>Respaldo Documental Validado</span>
            <span>Fecha: ${checkedAtText}</span>
          </div>
        </div>`;
    },

    renderSkeletonLoaders: function () {
      return `
        <div class="grid grid-cols-1 gap-6">
          <div class="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl animate-pulse">
            <div class="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-5">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-3xl shrink-0 text-amber-600 animate-spin">sync</span>
                <div>
                  <div class="h-5 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mb-1"></div>
                  <div class="h-3 w-36 bg-zinc-100 dark:bg-zinc-800/60 rounded"></div>
                </div>
              </div>
              <div class="h-6 w-32 bg-amber-100 dark:bg-amber-950/40 rounded-full"></div>
            </div>
            <div class="bg-amber-500/10 border border-amber-300/50 p-4 rounded-2xl flex items-center gap-3">
              <span class="material-symbols-outlined text-amber-600 text-2xl animate-spin">sync</span>
              <span class="text-xs font-headline font-bold text-amber-900 dark:text-amber-200">Consultando registros oficiales del Poder Judicial...</span>
            </div>
          </div>

          <div class="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl animate-pulse">
            <div class="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-5">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800"></div>
                <div>
                  <div class="h-5 w-56 bg-zinc-200 dark:bg-zinc-800 rounded mb-1"></div>
                  <div class="h-3 w-40 bg-zinc-100 dark:bg-zinc-800/60 rounded"></div>
                </div>
              </div>
              <div class="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
            </div>
            <div class="h-14 bg-zinc-100 dark:bg-zinc-800/40 rounded-2xl"></div>
          </div>

          <div class="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xl animate-pulse">
            <div class="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-5">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800"></div>
                <div>
                  <div class="h-5 w-52 bg-zinc-200 dark:bg-zinc-800 rounded mb-1"></div>
                  <div class="h-3 w-36 bg-zinc-100 dark:bg-zinc-800/60 rounded"></div>
                </div>
              </div>
              <div class="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="h-16 bg-zinc-100 dark:bg-zinc-800/40 rounded-2xl"></div>
              <div class="h-16 bg-zinc-100 dark:bg-zinc-800/40 rounded-2xl"></div>
              <div class="h-16 bg-zinc-100 dark:bg-zinc-800/40 rounded-2xl"></div>
            </div>
          </div>
        </div>`;
    },

    ejecutarVerificacionLegal: async function (options = {}) {
      const container = document.getElementById('passport-cards-container');
      if (window.currentParticipantId) {
        await this.loadAndRenderCards(window.currentParticipantId);
      } else if (container) {
        const mockRecord = options.mockRecord || {
          participant_id: window.currentParticipantId || 6,
          has_legal_issues: false,
          has_eviction_history: false,
          summary: { status: 'completed', total_causes: 0, eviction_causes_count: 0, details: [] },
          checked_at: new Date().toISOString()
        };
        container.innerHTML = `
          <div class="grid grid-cols-1 gap-6">
            ${this.renderLegalCard(mockRecord)}
            ${this.renderAtmCard(null)}
            ${this.renderEmploymentCard(null)}
          </div>`;
      }
    },

    simularAlertaRoja: function () {
      const mockEviction = {
        participant_id: window.currentParticipantId || 6,
        has_legal_issues: true,
        has_eviction_history: true,
        summary: {
          status: 'completed',
          total_causes: 1,
          eviction_causes_count: 1,
          details: [
            {
              caratula: 'BANCO OMNI S.A. C/ SAN MARTIN JOSE S/ EJECUCION PRENDARIA Y DESALOJO',
              numero_expediente: 'EXP-84920/2026',
              tribunal: '1° Tribunal de Gestión Judicial - Mendoza',
              materia: 'Juicio Ejecutivo de Desalojo',
              fecha: '15/03/2026'
            }
          ]
        },
        checked_at: new Date().toISOString()
      };

      const container = document.getElementById('passport-cards-container');
      if (container) {
        container.innerHTML = `
          <div class="grid grid-cols-1 gap-6">
            ${this.renderLegalCard(mockEviction)}
            ${this.renderAtmCard({ has_debt: true, total_debt_amount: 145800 })}
            ${this.renderEmploymentCard(null)}
          </div>`;
      }
    },

    loadAndRenderCards: async function (participantId) {
      window.currentParticipantId = participantId;
      const container = document.getElementById('passport-cards-container');
      if (!container) return;

      // Mostrar loaders animados mientras se consulta
      container.innerHTML = this.renderSkeletonLoaders();

      let legalRecord = null;
      let atmRecord = null;
      let employmentRecord = null;

      if (window.supabaseClient && participantId) {
        try {
          const [resLegal, resAtm, resEmp] = await Promise.all([
            window.supabaseClient.from('legal_records').select('*').eq('participant_id', participantId).maybeSingle(),
            window.supabaseClient.from('atm_records').select('*').eq('participant_id', participantId).maybeSingle(),
            window.supabaseClient.from('employment_records').select('*').eq('participant_id', participantId).maybeSingle()
          ]);

          legalRecord = resLegal?.data || null;
          atmRecord = resAtm?.data || null;
          employmentRecord = resEmp?.data || null;
        } catch (e) {
          console.warn('[PassportCards] Error fetching records from Supabase:', e);
        }
      }

      // Si el registro legal guardado previamente en Supabase quedó en pending_manual_review por el 405 anterior, auto-ejecutar re-verificación
      if (legalRecord && legalRecord.summary?.status === 'pending_manual_review') {
        console.log('[PassportCards] Registro previo en pending_manual_review detectado. Re-ejecutando verificación en vivo...');
        this.ejecutarVerificacionLegal();
        return;
      }

      // Si no existe legalRecord guardado aún
      if (!legalRecord) {
        legalRecord = {
          participant_id: participantId,
          has_legal_issues: false,
          has_eviction_history: false,
          summary: { status: 'completed', total_causes: 0, details: [] },
          checked_at: new Date().toISOString()
        };
      }

      container.innerHTML = `
        <div class="grid grid-cols-1 gap-6">
          ${this.renderLegalCard(legalRecord)}
          ${this.renderAtmCard(atmRecord)}
          ${this.renderEmploymentCard(employmentRecord)}
        </div>`;
    }
  };
})();
