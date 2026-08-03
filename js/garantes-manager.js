/**
 * Garantes & Recibos de Sueldo Manager
 * Pasaporte Hábitat - Frontend Module
 * 
 * TypeScript Interfaces (Documentation Reference):
 * 
 * interface ReciboArchivo {
 *   id: string;
 *   nombre: string;
 *   tamano: number;
 *   tipo: string;
 *   url: string;
 * }
 * 
 * type EstadoGarante = 'pendiente' | 'invitado' | 'cargado';
 * 
 * interface Garante {
 *   id: string;
 *   nombre: string;
 *   email: string;
 *   telefono?: string;
 *   token: string;
 *   estado: EstadoGarante;
 *   recibos: ReciboArchivo[];
 *   createdAt: string;
 * }
 */

(function () {
    // Initial Mock State
    const MOCK_GARANTES = [
        {
            id: 'gar_101',
            nombre: 'Carlos Eduardo Rossi',
            email: 'carlos.rossi@gmail.com',
            telefono: '+54 9 261 456-7890',
            token: 'mock-token-carlos-101',
            estado: 'cargado',
            recibos: [
                { id: 'rec_1', nombre: 'Recibo_Mayo_2026.pdf', tamano: 1420000, tipo: 'application/pdf', url: '#' },
                { id: 'rec_2', nombre: 'Recibo_Junio_2026.pdf', tamano: 1380000, tipo: 'application/pdf', url: '#' },
                { id: 'rec_3', nombre: 'Recibo_Julio_2026.pdf', tamano: 1450000, tipo: 'application/pdf', url: '#' }
            ],
            createdAt: '2026-07-28'
        },
        {
            id: 'gar_102',
            nombre: 'Mariana Gomez',
            email: 'marianagomez@hotmail.com',
            telefono: '+54 9 261 512-3456',
            token: 'mock-token-mariana-102',
            estado: 'invitado',
            recibos: [],
            createdAt: '2026-08-01'
        }
    ];

    // Local Storage Keys
    const STORAGE_KEY = 'habitat_garantes_state_v1';

    // State Helper
    function loadState() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.warn('Could not parse stored garantes state', e);
        }
        saveState(MOCK_GARANTES);
        return MOCK_GARANTES;
    }

    function saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Could not save garantes state', e);
        }
    }

    // Handlers (Isolated Backend Interface Stubs)
    const GarantesManager = {
        getState: function () {
            return loadState();
        },

        getOverallStatus: function () {
            const garantes = loadState();
            if (garantes.length === 0) return { status: 'sin_garantes', label: 'Sin Garantes Cargados', color: 'zinc' };
            const todosCargados = garantes.every(g => g.estado === 'cargado');
            if (todosCargados) {
                return { status: 'listo', label: 'Garantías Verificadas', color: 'emerald' };
            }
            return { status: 'incompleto', label: 'Garantías Incompletas', color: 'amber' };
        },

        getGaranteByToken: function (token) {
            const garantes = loadState();
            return garantes.find(g => g.token === token) || null;
        },

        /**
         * Stub Handler: Agregar/Invitar nuevo garante
         */
        onInviteGarante: async function (data) {
            console.log('[API Stub] onInviteGarante called with:', data);
            await new Promise(r => setTimeout(r, 400)); // Simulate API delay

            const garantes = loadState();
            const newToken = 'token-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
            const newGarante = {
                id: 'gar_' + Date.now(),
                nombre: data.nombre.trim(),
                email: data.email.trim(),
                telefono: data.telefono ? data.telefono.trim() : '',
                token: newToken,
                estado: 'invitado',
                recibos: [],
                createdAt: new Date().toISOString().split('T')[0]
            };

            garantes.push(newGarante);
            saveState(garantes);
            this.renderTenantSection();
            return newGarante;
        },

        /**
         * Stub Handler: Eliminar garante
         */
        onDeleteGarante: async function (id) {
            console.log('[API Stub] onDeleteGarante called for ID:', id);
            let garantes = loadState();
            garantes = garantes.filter(g => g.id !== id);
            saveState(garantes);
            this.renderTenantSection();
        },

        /**
         * Stub Handler: Subir recibos de sueldo
         */
        onUploadRecibos: async function (token, files, consentAccepted) {
            console.log('[API Stub] onUploadRecibos called with:', { token, filesCount: files.length, consentAccepted });
            if (!consentAccepted) {
                throw new Error('Debes aceptar los términos y el consentimiento.');
            }
            if (!files || files.length === 0) {
                throw new Error('Debes seleccionar al menos 1 recibo de sueldo.');
            }
            if (files.length > 3) {
                throw new Error('Máximo 3 archivos permitidos.');
            }

            await new Promise(r => setTimeout(r, 1200)); // Simulate upload delay

            const garantes = loadState();
            const garante = garantes.find(g => g.token === token);
            if (garante) {
                garante.estado = 'cargado';
                garante.recibos = Array.from(files).map((f, i) => ({
                    id: 'rec_' + Date.now() + '_' + i,
                    nombre: f.name,
                    tamano: f.size,
                    tipo: f.type,
                    url: '#'
                }));
                saveState(garantes);
            }
            return true;
        },

        getInviteUrl: function (token) {
            const baseUrl = window.location.origin + window.location.pathname;
            return `${baseUrl}?view=garante-invitacion&token=${encodeURIComponent(token)}`;
        },

        // Render Functions
        renderTenantSection: function () {
            const container = document.getElementById('garantes-tenant-container');
            if (!container) return;

            const garantes = loadState();
            const statusInfo = this.getOverallStatus();

            let statusBadgeHtml = '';
            if (statusInfo.color === 'emerald') {
                statusBadgeHtml = `
                    <span class="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-headline font-black uppercase tracking-wider">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Garantías Verificadas
                    </span>`;
            } else if (statusInfo.color === 'amber') {
                statusBadgeHtml = `
                    <span class="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-headline font-black uppercase tracking-wider">
                        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        Garantías Incompletas (Recibos Pendientes)
                    </span>`;
            } else {
                statusBadgeHtml = `
                    <span class="inline-flex items-center gap-1.5 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/30 px-3 py-1 rounded-full text-xs font-headline font-extrabold uppercase tracking-wider">
                        Sin Garantes Registrados
                    </span>`;
            }

            container.innerHTML = `
                <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xl transition-all">
                    <!-- Header -->
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
                        <div>
                            <div class="flex items-center gap-3">
                                <h3 class="font-headline text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <span class="material-symbols-outlined text-primary text-2xl">verified_user</span>
                                    Garantías y Garantes
                                </h3>
                                ${statusBadgeHtml}
                            </div>
                            <p class="font-body text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                Gestioná tus garantes de alquiler. Al enviarles la invitación, podrán subir digitalmente sus últimos 3 recibos de sueldo.
                            </p>
                        </div>

                        <button type="button" onclick="GarantesManager.openAddModal()" class="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-3 rounded-2xl font-headline font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer shrink-0">
                            <span class="material-symbols-outlined text-base">person_add</span>
                            + Agregar Garante
                        </button>
                    </div>

                    <!-- Garantes List -->
                    <div class="mt-6 space-y-4">
                        ${garantes.length === 0 ? `
                            <div class="text-center py-10 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-6">
                                <span class="material-symbols-outlined text-4xl text-zinc-400 mb-2">contacts</span>
                                <h4 class="font-headline font-bold text-zinc-800 dark:text-zinc-200 text-base">Aún no cargaste ningún garante</h4>
                                <p class="font-body text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                                    Agregá un garante para mandarle el link de carga de sus recibos de sueldo.
                                </p>
                                <button type="button" onclick="GarantesManager.openAddModal()" class="inline-flex items-center gap-2 text-primary dark:text-red-400 font-headline font-extrabold text-xs hover:underline cursor-pointer">
                                    + Agregar primer garante
                                </button>
                            </div>
                        ` : garantes.map(g => {
                            let stateBadge = '';
                            if (g.estado === 'cargado') {
                                stateBadge = `<span class="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold"><span class="material-symbols-outlined text-sm">check_circle</span> Recibos cargados (${g.recibos.length})</span>`;
                            } else if (g.estado === 'invitado') {
                                stateBadge = `<span class="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold"><span class="material-symbols-outlined text-sm">mark_email_read</span> Invitación enviada</span>`;
                            } else {
                                stateBadge = `<span class="inline-flex items-center gap-1 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30 px-3 py-1 rounded-full text-xs font-bold"><span class="material-symbols-outlined text-sm">schedule</span> Pendiente de envío</span>`;
                            }

                            const inviteUrl = this.getInviteUrl(g.token);

                            return `
                                <div class="bg-zinc-50/70 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
                                    <div class="flex items-center gap-3.5">
                                        <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center font-headline font-black text-lg shrink-0">
                                            ${g.nombre.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div class="flex items-center gap-2.5 flex-wrap">
                                                <h4 class="font-headline font-black text-zinc-900 dark:text-white text-base">${g.nombre}</h4>
                                                ${stateBadge}
                                            </div>
                                            <p class="font-body text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-3 flex-wrap">
                                                <span>${g.email}</span>
                                                ${g.telefono ? `<span>• ${g.telefono}</span>` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200 dark:border-zinc-800">
                                        <button type="button" onclick="GarantesManager.copyInviteLink('${g.token}')" class="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-3.5 py-2 rounded-xl text-xs font-headline font-extrabold transition-all cursor-pointer shadow-sm">
                                            <span class="material-symbols-outlined text-sm text-primary">link</span>
                                            Copiar Link
                                        </button>
                                        <button type="button" onclick="GarantesManager.shareWhatsApp('${g.token}', '${g.nombre.replace(/'/g, "\\'")}')" class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-headline font-extrabold transition-all cursor-pointer shadow-sm">
                                            <span class="material-symbols-outlined text-sm">chat</span>
                                            WhatsApp
                                        </button>
                                        <button type="button" onclick="GarantesManager.deleteGarante('${g.id}')" class="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer" title="Eliminar garante">
                                            <span class="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        },

        // Modal "Agregar Garante"
        openAddModal: function () {
            let modal = document.getElementById('modal-agregar-garante');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'modal-agregar-garante';
                modal.className = 'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300';
                modal.innerHTML = `
                    <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 sm:p-8 shadow-2xl transform scale-95 transition-all duration-300">
                        <div class="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
                            <h3 class="font-headline text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary">person_add</span>
                                Agregar Garante
                            </h3>
                            <button type="button" onclick="GarantesManager.closeAddModal()" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                                <span class="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>

                        <form id="form-agregar-garante" onsubmit="GarantesManager.handleSubmitAdd(event)">
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">Nombre completo del garante *</label>
                                    <input type="text" id="input-garante-nombre" required placeholder="Ej. Roberto Rossi" class="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40">
                                </div>

                                <div>
                                    <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">Email del garante *</label>
                                    <input type="email" id="input-garante-email" required placeholder="ejemplo@correo.com" class="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40">
                                </div>

                                <div>
                                    <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">Teléfono / WhatsApp (Opcional)</label>
                                    <input type="tel" id="input-garante-telefono" placeholder="+54 9 261 123-4567" class="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40">
                                </div>
                            </div>

                            <div class="mt-8 flex items-center justify-end gap-3">
                                <button type="button" onclick="GarantesManager.closeAddModal()" class="px-5 py-3 rounded-2xl font-headline font-extrabold text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                    Cancelar
                                </button>
                                <button type="submit" id="btn-submit-garante" class="inline-flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-6 py-3 rounded-2xl font-headline font-black text-xs transition-all shadow-md">
                                    Generar Invitación
                                </button>
                            </div>
                        </form>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            // Reset form
            document.getElementById('form-agregar-garante')?.reset();
            modal.classList.remove('opacity-0', 'pointer-events-none');
            modal.querySelector('.transform').classList.remove('scale-95');
            modal.querySelector('.transform').classList.add('scale-100');
        },

        closeAddModal: function () {
            const modal = document.getElementById('modal-agregar-garante');
            if (modal) {
                modal.classList.add('opacity-0', 'pointer-events-none');
                modal.querySelector('.transform')?.classList.remove('scale-100');
                modal.querySelector('.transform')?.classList.add('scale-95');
            }
        },

        handleSubmitAdd: async function (e) {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-garante');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Guardando...`;
            }

            const nombre = document.getElementById('input-garante-nombre').value;
            const email = document.getElementById('input-garante-email').value;
            const telefono = document.getElementById('input-garante-telefono').value;

            try {
                const newGarante = await this.onInviteGarante({ nombre, email, telefono });
                this.closeAddModal();
                this.openInviteSuccessModal(newGarante);
            } catch (err) {
                alert(err.message || 'Error al agregar garante.');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `Generar Invitación`;
                }
            }
        },

        // Modal Toast "Link Listo"
        openInviteSuccessModal: function (garante) {
            const inviteUrl = this.getInviteUrl(garante.token);

            let modal = document.getElementById('modal-invite-success');
            if (modal) modal.remove();

            modal = document.createElement('div');
            modal.id = 'modal-invite-success';
            modal.className = 'fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm opacity-0 transition-opacity duration-300';
            modal.innerHTML = `
                <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center">
                    <div class="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-4">
                        <span class="material-symbols-outlined text-4xl">mark_email_read</span>
                    </div>

                    <h3 class="font-headline text-2xl font-black text-zinc-900 dark:text-white mb-2">
                        ¡Invitación Creada para ${garante.nombre}!
                    </h3>
                    <p class="font-body text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                        Enviale este link a tu garante para que pueda subir sus últimos 3 recibos de sueldo sin necesidad de registrarse.
                    </p>

                    <!-- Link Field -->
                    <div class="bg-zinc-100 dark:bg-zinc-800/80 p-3 rounded-2xl flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 mb-6">
                        <input type="text" readonly value="${inviteUrl}" class="bg-transparent text-xs font-mono text-zinc-700 dark:text-zinc-300 w-full focus:outline-none px-2 select-all">
                        <button type="button" onclick="GarantesManager.copyToClipboard('${inviteUrl.replace(/'/g, "\\'")}')" class="bg-primary hover:bg-primary-container text-white px-4 py-2 rounded-xl font-headline font-bold text-xs shrink-0 cursor-pointer transition-all">
                            Copiar
                        </button>
                    </div>

                    <!-- Direct Quick Share Actions -->
                    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button type="button" onclick="GarantesManager.shareWhatsApp('${garante.token}', '${garante.nombre.replace(/'/g, "\\'")}')" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-headline font-black text-xs transition-all shadow-md cursor-pointer">
                            <span class="material-symbols-outlined text-base">chat</span>
                            Compartir por WhatsApp
                        </button>
                        <button type="button" onclick="document.getElementById('modal-invite-success').remove()" class="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-headline font-extrabold text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer">
                            Entendido / Cerrar
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            setTimeout(() => {
                modal.classList.remove('opacity-0');
            }, 10);
        },

        copyInviteLink: function (token) {
            const url = this.getInviteUrl(token);
            this.copyToClipboard(url);
        },

        copyToClipboard: function (text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Link copiado al portapapeles:\n' + text);
            }).catch(() => {
                prompt('Copiá este enlace manualmente:', text);
            });
        },

        shareWhatsApp: function (token, nombreGarante) {
            const inviteUrl = this.getInviteUrl(token);
            const msg = `Hola ${nombreGarante}, te comparto el link seguro de Hábitat para subir tus últimos 3 recibos de sueldo como mi garante de alquiler:\n\n${inviteUrl}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        },

        deleteGarante: async function (id) {
            if (confirm('¿Estás seguro de que querés eliminar a este garante?')) {
                await this.onDeleteGarante(id);
            }
        },

        // Render Public View for Guarantor Invitation
        renderPublicGuarantorView: function (token) {
            const garante = this.getGaranteByToken(token);
            const tenantName = "Sofía M. Rossi"; // Mock tenant name

            const mainContainer = document.querySelector('main');
            if (!mainContainer) return;

            mainContainer.innerHTML = `
                <div class="max-w-[800px] mx-auto px-4 sm:px-6 pt-6 pb-20">
                    <!-- Top Back / Branding Header -->
                    <div class="text-center mb-8">
                        <img src="img/logo-lite.png" alt="Habitat Logo" class="h-12 w-auto mx-auto mb-4 object-contain">
                        <span class="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-headline font-black uppercase tracking-wider">
                            <span class="material-symbols-outlined text-sm">lock</span> Portal Seguro de Garantías
                        </span>
                    </div>

                    <!-- Main Card -->
                    <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-10 shadow-2xl">
                        <!-- Context Header -->
                        <div class="text-center pb-8 border-b border-zinc-200 dark:border-zinc-800 mb-8">
                            <h1 class="font-headline text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">
                                Carga de Garantía para Pasaporte Hábitat
                            </h1>
                            <p class="font-body text-base text-zinc-600 dark:text-zinc-300 max-w-xl mx-auto">
                                <strong class="text-primary dark:text-red-400 font-headline">${tenantName}</strong> te ha invitado a ser su garante de alquiler.
                            </p>
                        </div>

                        ${garante && garante.estado === 'cargado' ? `
                            <!-- Already Submitted Success State -->
                            <div class="text-center py-10">
                                <div class="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-4">
                                    <span class="material-symbols-outlined text-5xl">task_alt</span>
                                </div>
                                <h3 class="font-headline text-2xl font-black text-zinc-900 dark:text-white mb-2">
                                    ¡Recibos Enviados Correctamente!
                                </h3>
                                <p class="font-body text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-6">
                                    Muchas gracias por completar la documentación. Los recibos de sueldo ya fueron adjuntados de forma segura al Pasaporte Hábitat de <strong>${tenantName}</strong>.
                                </p>
                                <div class="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 max-w-sm mx-auto text-left space-y-2 mb-8">
                                    <p class="text-xs font-headline font-bold text-zinc-400 uppercase tracking-wider">Archivos Recibidos:</p>
                                    ${garante.recibos.map(r => `
                                        <div class="flex items-center gap-2 text-xs font-headline font-extrabold text-zinc-800 dark:text-zinc-200">
                                            <span class="material-symbols-outlined text-emerald-500 text-base">description</span>
                                            <span class="truncate">${r.nombre}</span>
                                        </div>
                                    `).join('')}
                                </div>
                                <p class="text-xs text-zinc-500">Podés cerrar esta ventana de forma segura.</p>
                            </div>
                        ` : `
                            <!-- Upload Form -->
                            <form id="public-upload-form" onsubmit="GarantesManager.handlePublicSubmit(event, '${token}')">
                                
                                <!-- Legend Box (UX Addition) -->
                                <div class="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 mb-8">
                                    <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl shrink-0 mt-0.5">info</span>
                                    <div>
                                        <h4 class="font-headline font-black text-blue-900 dark:text-blue-300 text-sm">Instrucciones de Carga</h4>
                                        <p class="font-body text-xs sm:text-sm text-blue-800 dark:text-blue-300/90 leading-relaxed mt-0.5">
                                            Por favor sube los <strong>últimos 3 recibos de sueldo consecutivos</strong>. Se aceptan fotos claras o archivos PDF (Formatos permitidos: PDF, PNG, JPG. Máximo 10MB por archivo).
                                        </p>
                                    </div>
                                </div>

                                <!-- Drag & Drop Zone -->
                                <div class="mb-8">
                                    <div id="drop-zone" onclick="document.getElementById('recibos-file-input').click()" 
                                         class="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-primary dark:hover:border-red-500 bg-zinc-50/70 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all">
                                        <input type="file" id="recibos-file-input" multiple accept=".pdf,.png,.jpg,.jpeg" class="hidden" onchange="GarantesManager.handleFileSelect(event)">
                                        <div class="w-16 h-16 rounded-2xl bg-primary/10 text-primary dark:text-red-400 mx-auto flex items-center justify-center mb-4">
                                            <span class="material-symbols-outlined text-3xl">upload_file</span>
                                        </div>
                                        <h4 class="font-headline font-black text-zinc-900 dark:text-white text-lg mb-1">
                                            Arrastrá y soltá tus recibos acá
                                        </h4>
                                        <p class="font-body text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                                            o haz click para examinar tus archivos desde este dispositivo (máximo 3 archivos)
                                        </p>
                                        <span class="inline-flex items-center gap-1.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-4 py-2 rounded-xl text-xs font-headline font-extrabold">
                                            <span class="material-symbols-outlined text-base">folder_open</span> Selección manual
                                        </span>
                                    </div>

                                    <!-- Files Preview List -->
                                    <div id="selected-files-list" class="mt-4 space-y-2"></div>
                                    <div id="files-error-msg" class="hidden mt-2 text-xs font-headline font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                        <span class="material-symbols-outlined text-base">error</span>
                                        <span id="files-error-text"></span>
                                    </div>
                                </div>

                                <!-- Terms & Consent Checkbox -->
                                <div class="bg-zinc-50 dark:bg-zinc-800/30 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-8">
                                    <div class="checkbox-wrapper">
                                        <input type="checkbox" id="consent-checkbox" required>
                                        <label class="terms-label" for="consent-checkbox">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                <mask fill="white" id="path-1-inside-1_consent">
                                                    <rect height="200" width="200" rx="30"></rect>
                                                </mask>
                                                <rect mask="url(#path-1-inside-1_consent)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                            </svg>
                                            <span class="font-body text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed ml-3">
                                                Acepto compartir estos documentos con fines de verificación crediticia y validación para la postulación de alquiler de <strong>${tenantName}</strong> en Pasaporte Hábitat.
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <!-- Submit Button -->
                                <button type="submit" id="btn-submit-public-recibos" class="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-white py-4 rounded-2xl font-headline font-black text-sm transition-all shadow-xl active:scale-98 cursor-pointer">
                                    <span class="material-symbols-outlined text-xl">send</span>
                                    Enviar Recibos de Sueldo
                                </button>
                            </form>
                        `}
                    </div>
                </div>
            `;

            // Setup Drag & Drop listeners
            this.setupDragAndDrop();
        },

        selectedFiles: [],

        setupDragAndDrop: function () {
            const dropZone = document.getElementById('drop-zone');
            if (!dropZone) return;

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropZone.classList.add('border-primary', 'bg-primary/5');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropZone.classList.remove('border-primary', 'bg-primary/5');
                }, false);
            });

            dropZone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;
                this.addFiles(files);
            }, false);
        },

        handleFileSelect: function (e) {
            if (e.target.files) {
                this.addFiles(e.target.files);
            }
        },

        addFiles: function (newFiles) {
            const errorContainer = document.getElementById('files-error-msg');
            const errorText = document.getElementById('files-error-text');

            if (errorContainer) errorContainer.classList.add('hidden');

            const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            const maxSize = 10 * 1024 * 1024; // 10MB

            Array.from(newFiles).forEach(file => {
                if (this.selectedFiles.length >= 3) {
                    if (errorContainer && errorText) {
                        errorText.textContent = 'Solo se pueden cargar hasta 3 recibos de sueldo.';
                        errorContainer.classList.remove('hidden');
                    }
                    return;
                }
                if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|png|jpg|jpeg)$/i)) {
                    if (errorContainer && errorText) {
                        errorText.textContent = `El archivo "${file.name}" no tiene un formato permitido (PDF, PNG, JPG).`;
                        errorContainer.classList.remove('hidden');
                    }
                    return;
                }
                if (file.size > maxSize) {
                    if (errorContainer && errorText) {
                        errorText.textContent = `El archivo "${file.name}" supera el peso máximo de 10MB.`;
                        errorContainer.classList.remove('hidden');
                    }
                    return;
                }
                // Avoid duplicates
                if (!this.selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                    this.selectedFiles.push(file);
                }
            });

            this.renderSelectedFiles();
        },

        removeFile: function (index) {
            this.selectedFiles.splice(index, 1);
            this.renderSelectedFiles();
        },

        renderSelectedFiles: function () {
            const container = document.getElementById('selected-files-list');
            if (!container) return;

            if (this.selectedFiles.length === 0) {
                container.innerHTML = '';
                return;
            }

            container.innerHTML = `
                <p class="text-xs font-headline font-extrabold uppercase text-zinc-500 dark:text-zinc-400 mb-2">
                    Archivos Seleccionados (${this.selectedFiles.length}/3):
                </p>
                ${this.selectedFiles.map((file, idx) => `
                    <div class="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="material-symbols-outlined text-primary text-2xl shrink-0">
                                ${file.type.includes('pdf') ? 'picture_as_pdf' : 'image'}
                            </span>
                            <div class="min-w-0">
                                <p class="text-xs font-headline font-bold text-zinc-900 dark:text-white truncate">${file.name}</p>
                                <p class="text-[11px] font-body text-zinc-500">${(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button type="button" onclick="GarantesManager.removeFile(${idx})" class="p-1.5 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer">
                            <span class="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                `).join('')}
            `;
        },

        handlePublicSubmit: async function (e, token) {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-public-recibos');
            const consent = document.getElementById('consent-checkbox')?.checked;

            if (this.selectedFiles.length === 0) {
                alert('Debes seleccionar al menos 1 recibo de sueldo para enviar.');
                return;
            }

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="material-symbols-outlined text-xl animate-spin">progress_activity</span> Enviando recibos de sueldo...`;
            }

            try {
                await this.onUploadRecibos(token, this.selectedFiles, consent);
                this.renderPublicGuarantorView(token); // Re-render success state
            } catch (err) {
                alert(err.message || 'Error al enviar los recibos.');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<span class="material-symbols-outlined text-xl">send</span> Enviar Recibos de Sueldo`;
                }
            }
        },

        // Auto Router Initialization
        init: function () {
            const urlParams = new URLSearchParams(window.location.search);
            const view = urlParams.get('view');
            const token = urlParams.get('token');

            if (view === 'garante-invitacion' && token) {
                this.renderPublicGuarantorView(token);
            } else {
                this.renderTenantSection();
            }
        }
    };

    window.GarantesManager = GarantesManager;

    document.addEventListener('DOMContentLoaded', () => {
        GarantesManager.init();
    });
})();
