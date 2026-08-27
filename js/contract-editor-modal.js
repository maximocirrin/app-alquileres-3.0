/**
 * ==============================================================================
 * HÁBITAT - CONTRACT EDITOR & SMART BUILDER MODAL (v3.4 Legal Architecture)
 * ==============================================================================
 * Modal ejecutivo, minimalista, 100% responsivo y Dual-Pane en Desktop (md/lg/xl)
 * bajo DNU 70/2023 y Ley Nacional N° 25.506 de Firma Digital con Didit KYC.
 * Incluye:
 * - Vista en vivo garantizada del contrato en Desktop (Dual-Pane de altura fija y scroll independiente).
 * - Hoja de estilo papel legal digital inmutable con numeración ordinal consecutiva.
 * - Sub-tabs fluidos en mobile/tablet y soporte para pantalla completa de lectura.
 * - Soporte para cláusulas personalizadas con alta/baja en tiempo real.
 * - Centro de explicaciones y referencias legales interactivas (Info ℹ️) por sección.
 */

(function () {
    'use strict';

    // Diccionario de números ordinales en español para numeración estricta y consecutiva
    const ORDINAL_NAMES = [
        'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA',
        'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA',
        'DÉCIMA PRIMERA', 'DÉCIMA SEGUNDA', 'DÉCIMA TERCERA', 'DÉCIMA CUARTA', 'DÉCIMA QUINTA',
        'DÉCIMA SEXTA', 'DÉCIMA SÉPTIMA', 'DÉCIMA OCTAVA', 'DÉCIMA NOVENA', 'VIGÉSIMA',
        'VIGÉSIMA PRIMERA', 'VIGÉSIMA SEGUNDA', 'VIGÉSIMA TERCERA', 'VIGÉSIMA CUARTA', 'VIGÉSIMA QUINTA',
        'VIGÉSIMA SEXTA', 'VIGÉSIMA SÉPTIMA', 'VIGÉSIMA OCTAVA', 'VIGÉSIMA NOVENA', 'TRIGÉSIMA'
    ];

    function getOrdinalName(idx) {
        return ORDINAL_NAMES[idx] || `CLÁUSULA ${idx + 1}`;
    }

    // Diccionario integral de marco legal, fundamentos y jurisprudencia
    const LEGAL_INFO_DICTIONARY = {
        precio: {
            title: 'Precio Inicial y Moneda de Pago',
            normative: 'Art. 1187 y Art. 765 CCyCN • DNU 70/2023',
            badge: 'Libertad de Moneda',
            summary: 'Pacto de canon y moneda contractual',
            explanation: 'El canon locativo puede fijarse libremente en moneda de curso legal (Pesos Argentinos - ARS) o en moneda extranjera (Dólares Estadounidenses - USD o Euros - EUR). Tras la reforma del DNU 70/2023 al Art. 765 del CCyCN, cuando se pacta en moneda extranjera, el locatario debe cancelar la obligación entregando la especie de moneda pactada y los jueces no pueden modificar la forma ni la moneda elegida por las partes.',
            articleQuote: '«El locatario está obligado a pagar el precio convenido en los plazos fijados en el contrato. Si se pacta en moneda extranjera, la obligación sólo se extingue entregando la moneda designada.»'
        },
        plazo: {
            title: 'Plazo y Duración Contractual',
            normative: 'Art. 1198 CCyCN (sustituido por DNU 70/2023)',
            badge: 'Autonomía de la Voluntad',
            summary: 'Libertad de fijación de plazo locativo',
            explanation: 'El DNU 70/2023 eliminó el plazo mínimo legal obligatorio de 3 años de la derogada Ley 27.551. Las partes son completamente libres para acordar la duración que consideren adecuada (1 mes, 6 meses, 12 meses, 24 meses, 36 meses o más). Si no se estipula plazo expreso en el texto, el Código establece de manera supletoria un término de 2 años para locaciones habitacionales.',
            articleQuote: '«El plazo de la locación inmobiliaria será el que las partes hayan fijado libremente. Si no se hubiere establecido plazo, el contrato regirá por el término de dos años para locaciones habitacionales.»'
        },
        indice: {
            title: 'Índice de Actualización Periódica',
            normative: 'Art. 1199 CCyCN (DNU 70/2023) • Resoluciones BCRA / INDEC',
            badge: 'Indexación Oficial',
            summary: 'Indexación libre y oficial para el canon',
            explanation: 'Las partes pueden elegir libremente cualquier índice público o privado para actualizar el canon locativo. Los más transparentes y seguros en el mercado argentino son:\n\n• IPC (Índice de Precios al Consumidor): Publicado mensualmente por el INDEC, refleja la inflación minorista general.\n• ICL (Índice de Contratos de Locación): Publicado diariamente por el Banco Central (BCRA), pondera en partes iguales la inflación (IPC) y la variación de salarios registrados (RIPTE).\n• CAC (Cámara Argentina de la Construcción): Ajuste vinculado al costo de materiales y mano de obra.\n• Fijo: Valor inalterable sin cláusula de indexación.',
            articleQuote: '«Los alquileres podrán reajustarse utilizando el índice pactado libremente por las partes al celebrar el contrato, sea de carácter público o privado.»'
        },
        frecuencia: {
            title: 'Frecuencia y Periodicidad de Ajuste',
            normative: 'Art. 1199 CCyCN (DNU 70/2023)',
            badge: 'Periodicidad Libre',
            summary: 'Intervalo de tiempo entre actualizaciones',
            explanation: 'Se eliminó la restricción que exigía ajustes únicamente anuales o semestrales. En la actualidad es 100% legal pactar revisiones trimestrales (cada 3 meses), cuatrimestrales (cada 4 meses), semestrales (cada 6 meses) o anuales, garantizando previsibilidad económica y equilibrio financiero para ambas partes ante escenarios inflacionarios.',
            articleQuote: '«Las partes podrán pactar el intervalo de tiempo con el que se actualizará el valor locativo conforme a la autonomía de la voluntad.»'
        },
        cuenta_vencimiento: {
            title: 'Cuenta de Cobro, Vencimiento y Régimen de Mora',
            normative: 'Arts. 886, 887 y 1208 CCyCN',
            badge: 'Mora Automática',
            summary: 'Mora automática y constancia fehaciente de pago',
            explanation: 'La mora en el pago del alquiler opera de pleno derecho de manera automática por el solo vencimiento del plazo fijado (habitualmente del 1 al día 10 de cada mes). El uso de Alias CBU/CVU bancario genera recibo digital automático e inalterable. El contrato estipula una tasa punitoria diaria (por defecto 0.5% por día) para resarcir demoras en la acreditación bancaria.',
            articleQuote: '«El pago debe ser efectuado en el lugar designado en el contrato. La mora se produce por el mero transcurso del tiempo fijado para el cumplimiento de la obligación.»'
        },
        deposito: {
            title: 'Depósito en Garantía y Resguardo Locativo',
            normative: 'Art. 1196 CCyCN (sustituido por DNU 70/2023)',
            badge: 'Garantía Contractual',
            summary: 'Libertad de fijación y reintegro del depósito',
            explanation: 'Bajo el marco del DNU 70/2023, las partes determinan libremente la cantidad de meses de depósito, la moneda (pesos o dólares) y los plazos de restitución. El depósito está destinado exclusivamente a responder por deterioros imputables en el inmueble o deudas impagas de servicios al momento de la entrega de llaves. Puede ser sustituido por fianza digital (Pasaporte Hábitat / Seguro de Caución).',
            articleQuote: '«Las partes pueden determinar libremente el importe del depósito en garantía y la moneda en que se integrará, así como el plazo y condiciones para su devolución.»'
        },
        expensas: {
            title: 'Régimen de Expensas, Impuestos y Servicios',
            normative: 'Arts. 1204 bis, 1208 y 1209 CCyCN',
            badge: 'Distribución de Cargas',
            summary: 'Distribución de cargas, expensas y tributos',
            explanation: '• Expensas Ordinarias: Gastos habituales de administración, mantenimiento y limpieza del edificio; son a cargo del inquilino (locatario).\n• Expensas Extraordinarias: Reparaciones estructurales de envergadura e innovaciones edilicias; son a cargo del propietario (locador).\n• Impuestos Inmobiliarios: Cargas reales que gravan la titularidad del inmueble corresponden al locador, salvo pacto en contrario.',
            articleQuote: '«El locatario tiene a su cargo el pago de las cargas y contribuciones que se originen en el destino que dé a la cosa locada. No tiene a su cargo el pago de las que graven la cosa excepto pacto en contrario.»'
        },
        mascotas: {
            title: 'Cláusula de Tenencia de Mascotas',
            normative: 'Arts. 1197 y 1757 CCyCN (Responsabilidad Civil)',
            badge: 'Responsabilidad Objetiva',
            summary: 'Regulación sobre tenencia de animales domésticos',
            explanation: 'En los contratos de locación es facultativo autorizar o prohibir la permanencia de animales domésticos. Cuando se autoriza, el locatario asume la obligación de velar por la tranquilidad de los vecinos (respetando el Reglamento de Copropiedad del consorcio) y responde de manera objetiva por cualquier daño material ocasionado a la propiedad.',
            articleQuote: '«Las convenciones hechas en los contratos forman para las partes una regla a la cual deben someterse como a la ley misma. El dueño o guardián de un animal responde objetivamente por el daño que este cause.»'
        },
        destino_vivienda: {
            title: 'Destino Exclusivo de Vivienda Familiar',
            normative: 'Arts. 1194 y 1205 CCyCN',
            badge: 'Destino Contractual',
            summary: 'Uso habitacional y prohibición de cambio de destino',
            explanation: 'Estipula que el inmueble solo puede ser utilizado como residencia familiar de las personas autorizadas. El cambio inconsulto de destino hacia actividades comerciales, talleres, consultorios o subalquiler turístico (ej. Airbnb) constituye causal objetiva de incumplimiento contractual grave y habilita al locador a demandar la rescisión culpable y el desalojo inmediato.',
            articleQuote: '«El locatario debe usar y gozar de la cosa conforme al destino determinado en el contrato. No puede variar el destino aunque ello no cause perjuicio al locador.»'
        },
        seguro_incendio: {
            title: 'Seguro de Incendio y Responsabilidad Civil',
            normative: 'Arts. 1206 y 1710 CCyCN (Deber de Prevención)',
            badge: 'Resguardo Patrimonial',
            summary: 'Póliza de cobertura patrimonial a favor del locador',
            explanation: 'Obliga al locatario a mantener vigente una póliza contra incendio del edificio y su contenido, designando al propietario como acreedor/beneficiario de la indemnización en caso de siniestro. Protege el patrimonio inmobiliario ante contingencias fortuitas y resguarda a ambas partes frente a reclamos de terceros linderos.',
            articleQuote: '«El locatario responde por cualquier deterioro causado a la cosa, por su culpa o por la de sus dependientes, visitantes o terceros bajo su custodia.»'
        },
        subalquiler: {
            title: 'Prohibición de Cesión y Sublocación',
            normative: 'Arts. 1213 y 1214 CCyCN',
            badge: 'Inmutabilidad Subjetiva',
            summary: 'Prohibición de subarriendo sin conformidad expresa',
            explanation: 'Prohíbe al locatario ceder sus derechos contractuales, subarrendar total o parcialmente habitaciones o conceder el uso a terceros ajenos al contrato. Cualquier transferencia no consentida por escrito por el locador es inoponible y configura rescisión culposa con derecho a indemnización por daños y perjuicios.',
            articleQuote: '«El locatario puede ceder su posición contractual o sublocar todo o parte de la cosa si no está expresamente prohibido en el contrato. La prohibición contractual de sublocar incluye la de ceder y viceversa.»'
        },
        rescision: {
            title: 'Régimen de Rescisión Anticipada',
            normative: 'Art. 1221 CCyCN (modificado por DNU 70/2023)',
            badge: 'Resolución Unilateral',
            summary: 'Resolución unilateral por el locatario y preaviso',
            explanation: 'El locatario puede resolver el contrato en cualquier momento. Tras la reforma del DNU 70/2023, debe abonar una indemnización equivalente al diez por ciento (10%) del saldo restante del canon locativo futuro hasta el vencimiento del contrato, o la penalidad pactada expresamente por las partes. Se recomienda otorgar una notificación previa fehaciente con al menos un mes de anticipación.',
            articleQuote: '«El locatario podrá, en cualquier momento, resolver la contratación abonando el equivalente al diez por ciento (10%) del saldo del canon locativo futuro, calculado desde la fecha de la notificación de la rescisión hasta la fecha de finalización pactada en el contrato.»'
        },
        clausulas_personalizadas: {
            title: 'Cláusulas Especiales y Autonomía de la Voluntad',
            normative: 'Arts. 958, 959 y 1197 CCyCN',
            badge: 'Pactos Específicos',
            summary: 'Pactos a medida entre propietario e inquilino',
            explanation: 'Las partes tienen plena facultad para incorporar cláusulas accesorias específicas relativas a: mantenimiento de jardines/piscina, normas de convivencia del consorcio, entrega de llaves y estado de pintura, uso de cocheras y bauleras, o acuerdos sobre mejoras autorizadas.',
            articleQuote: '«Las partes son libres para celebrar un contrato y determinar su contenido, dentro de los límites impuestos por la ley, el orden público, la moral y las buenas costumbres.»'
        },
        firma_digital: {
            title: 'Firma Electrónica, Biometría Didit y Sello TSA',
            normative: 'Ley Nacional N° 25.506 de Firma Digital • Arts. 286, 287 y 288 CCyCN',
            badge: 'Plena Validez Legal',
            summary: 'Validez probatoria, autenticidad e inmutabilidad jurídica',
            explanation: 'El contrato firmado digitalmente a través de la plataforma Hábitat utiliza validación biométrica facial en vivo (Didit Liveness Check) y sellado de tiempo criptográfico TSA RFC 3161 sobre el digest SHA-256. Esto otorga presunción de autoría, principio de no repudio e inmutabilidad del documento conforme a los Arts. 286, 287 y 288 del Código Civil y Comercial de la Nación y la Ley 25.506.',
            articleQuote: '«Los instrumentos generados por medios electrónicos tienen eficacia probatoria idéntica a los instrumentos privados firmados en soporte papel cuando se garantiza la autenticidad e integridad del documento.»'
        }
    };

    async function ensureUserProfileResolved() {
        if (window._currentUserProfileId) return window._currentUserProfileId;

        try {
            const stored = localStorage.getItem('habitat_profile_id');
            if (stored && !isNaN(Number(stored))) {
                window._currentUserProfileId = Number(stored);
                return window._currentUserProfileId;
            }
            const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
            const pId = uLocal.id_perfil || uLocal.profileId || (typeof uLocal.id === 'number' ? uLocal.id : null);
            if (pId && !isNaN(Number(pId))) {
                window._currentUserProfileId = Number(pId);
                localStorage.setItem('habitat_profile_id', String(pId));
                return window._currentUserProfileId;
            }
        } catch (e) {}

        if (window.supabaseClient) {
            try {
                let authUser = null;
                const { data: uData } = await window.supabaseClient.auth.getUser();
                authUser = uData?.user;
                if (!authUser) {
                    const { data: sData } = await window.supabaseClient.auth.getSession();
                    authUser = sData?.session?.user;
                }

                if (authUser) {
                    const { data: profiles } = await window.supabaseClient
                        .from('Perfil')
                        .select('id_perfil, mail, dni, nombre_completo, user_id')
                        .or(`user_id.eq.${authUser.id},mail.eq.${authUser.email}`)
                        .limit(1);

                    if (profiles && profiles.length > 0) {
                        const p = profiles[0];
                        window._currentUserProfileId = Number(p.id_perfil);
                        localStorage.setItem('habitat_profile_id', String(p.id_perfil));
                        
                        try {
                            const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
                            uLocal.id_perfil = p.id_perfil;
                            uLocal.email = p.mail || authUser.email;
                            uLocal.dni = p.dni || uLocal.dni;
                            uLocal.nombre_completo = p.nombre_completo || uLocal.nombre_completo;
                            uLocal.user_id = authUser.id || p.user_id;
                            localStorage.setItem('habitat_user', JSON.stringify(uLocal));
                        } catch (e) {}

                        return window._currentUserProfileId;
                    }
                }
            } catch (e) {
                console.warn("Aviso resolviendo perfil en Supabase:", e);
            }
        }

        return null;
    }

    function getContractOwnerProfileId(contract, options = {}) {
        if (!contract && !options) return null;
        const c = contract || options.contract || {};
        const prop = options.property || {};

        const raw = c.id_perfil_propietario ||
                    c.owner?.profileId ||
                    c.owner?.id_perfil ||
                    c.owner_profile_id ||
                    prop.id_perfil_propietario ||
                    prop.id_propietario ||
                    (typeof c.owner?.id === 'number' ? c.owner.id : null) ||
                    c.id_propietario;

        if (raw !== undefined && raw !== null && !isNaN(Number(raw))) {
            return Number(raw);
        }
        return null;
    }

    function isUserOwnerOfContract(contract, options = {}) {
        if (options.role && ['OWNER', 'PROPIETARIO', 'BROKER', 'CORREDOR', 'ADMIN'].includes(options.role.toUpperCase())) {
            return true;
        }

        if (window.location.pathname.includes('administrador') ||
            window.location.pathname.includes('panel-corredor') ||
            window.location.pathname.includes('propietarios') ||
            options.applicant ||
            !contract ||
            !contract.id) {
            return true;
        }

        const activeRole = (localStorage.getItem('habitat_active_role') || localStorage.getItem('habitat_user_role') || '').toUpperCase();
        if (['OWNER', 'PROPIETARIO', 'CORREDOR', 'BROKER'].includes(activeRole)) {
            return true;
        }

        const c = contract || options.contract || {};
        const prop = options.property || c.property || {};
        const contractOwnerProfileId = getContractOwnerProfileId(c, options);

        let userProfileId = window._currentUserProfileId || window.ContractsManager?._currentProfileId || null;
        if (!userProfileId) {
            try {
                const storedProfileId = localStorage.getItem('habitat_profile_id');
                if (storedProfileId && !isNaN(Number(storedProfileId))) {
                    userProfileId = Number(storedProfileId);
                } else {
                    const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
                    const pId = uLocal.id_perfil || uLocal.profileId || (typeof uLocal.id === 'number' ? uLocal.id : null);
                    if (pId && !isNaN(Number(pId))) {
                        userProfileId = Number(pId);
                    }
                }
            } catch (e) {}
        }

        if (userProfileId !== null && contractOwnerProfileId !== null && Number(userProfileId) === Number(contractOwnerProfileId)) {
            return true;
        }

        let userEmail = '';
        try {
            const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
            userEmail = (uLocal.email || uLocal.mail || '').toLowerCase().trim();
        } catch (e) {}

        const ownerEmail = (c.owner?.email || c.owner_email || prop.owner_email || prop.ownerEmail || prop.mail || '').toLowerCase().trim();
        const tenantEmail = (c.tenant?.email || c.tenant_email || options.applicant?.tenant_email || options.applicant?.email || '').toLowerCase().trim();

        if (userEmail && ownerEmail && userEmail === ownerEmail) return true;
        if (userEmail && tenantEmail && userEmail === tenantEmail && userEmail !== ownerEmail) return false;

        return true;
    }

    window.ContractEditorModal = {
        _currentOptions: null,
        _customFile: null,
        _activeTab: 'smart', // 'smart' | 'upload'
        _activeMobileSubtab: 'config', // 'config' | 'preview' (en mobile < md)
        _isExpandedPreview: false, // Modo vista expandida en Desktop
        _customClauses: [], // Lista de cláusulas personalizadas

        /**
         * Abre el modal del editor de contratos (Dual-Pane garantizado en desktop)
         */
        open: async function (options = {}) {
            const contract = options.contract || {};

            // Asegurar resolución del perfil del usuario
            await ensureUserProfileResolved();

            const isSigned = contract.status === 'SIGNED_AND_SEALED' || contract.tenant?.hasSigned || contract.owner?.hasSigned;
            if (isSigned) {
                const msg = 'Este contrato ya cuenta con firmas electrónicas registradas y sus términos se encuentran inmutables y bloqueados bajo la Ley 25.506.';
                if (window.ToastManager) {
                    window.ToastManager.show({
                        title: '🔒 Contrato Bloqueado e Inmutable',
                        message: msg,
                        type: 'warning'
                    });
                } else {
                    alert(msg);
                }
                return;
            }

            this._currentOptions = options;
            this._customFile = null;
            this._activeTab = options.initialTab || (contract.mode === 'custom_file' ? 'upload' : 'smart');
            this._activeMobileSubtab = 'config';
            this._isExpandedPreview = false;
            this._customClauses = Array.isArray(contract.customClauses) ? [...contract.customClauses] : [];

            let existingModal = document.getElementById('contract-editor-modal-container');
            if (existingModal) existingModal.remove();

            const modalContainer = document.createElement('div');
            modalContainer.id = 'contract-editor-modal-container';
            modalContainer.className = 'fixed inset-0 z-[100000] w-full h-full h-[100dvh] bg-black/80 backdrop-blur-md p-0 sm:p-3 md:p-5 flex items-stretch sm:items-center justify-center font-body animate-fadeIn overflow-hidden';
            modalContainer.style.webkitOverflowScrolling = 'touch';

            const applicant = options.applicant || {};
            const property = options.property || {};

            const tenantName = applicant.tenant_name || applicant.name || contract.tenant?.name || 'Inquilino Titular';
            const tenantDni = applicant.tenant_dni || applicant.dni || contract.tenant?.dni || '';
            const tenantCuil = applicant.tenant_cuit || applicant.cuit || (tenantDni ? `20-${tenantDni.replace(/\D/g,'')}-7` : '');
            const tenantEmail = applicant.tenant_email || applicant.email || contract.tenant?.email || 'inquilino@email.com';
            
            const ownerName = property.owner_name || contract.owner?.name || 'Propietario Titular';
            const ownerDni = property.owner_dni || contract.owner?.dni || '';
            const ownerCuil = property.owner_cuit || contract.owner?.cuil || (ownerDni ? `20-${ownerDni.replace(/\D/g,'')}-7` : '');
            const ownerEmail = property.owner_email || contract.owner?.email || 'propietario@email.com';

            const propAddress = property.address || (property.calle ? `${property.calle} ${property.numero || ''}`.trim() : '') || contract.propertyAddress || 'Av. San Martín 1250, Mendoza';
            
            // Valores iniciales reactivos
            const defaultRent = Number(contract.monthlyRent || property.price || property.precio || 450000);
            const defaultCurrency = contract.currency || 'ARS';
            const defaultDuration = String(contract.durationMonths || 24);
            const defaultIndex = contract.adjustmentIndex || 'IPC';
            const defaultFrequency = String(contract.adjustmentFrequencyMonths || 3);
            const defaultDueDay = String(contract.paymentDueDay || 10);
            const defaultAlias = contract.aliasCbu || 'HABITAT.ALQUILER.MP';
            
            const cfg = contract.clauses || {};
            const defaultDeposito = cfg.depositoModalidad || '1_MES';
            const defaultExpensas = cfg.regimenExpensas || 'ORDINARIAS_INQ';
            const defaultMora = cfg.tasaMoraDiaria || 0.5;

            const defaultMascotas = cfg.mascotas !== false;
            const defaultVivienda = cfg.viviendaExclusiva !== false;
            const defaultSeguro = cfg.seguroIncendio !== false;
            const defaultSubalquiler = cfg.prohibirSubalquiler !== false;
            const defaultRescision = cfg.rescisionAnticipada !== false;

            modalContainer.innerHTML = `
                <div class="relative w-full h-full h-[100dvh] sm:h-[92vh] sm:max-h-[900px] sm:max-w-6xl bg-white dark:bg-[#0c0d14] sm:border sm:border-zinc-200/80 sm:dark:border-zinc-800 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100 my-0 sm:my-auto">
                    
                    <!-- Top Header Bar -->
                    <div class="px-4 sm:px-6 py-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
                        <div class="flex items-center gap-3 min-w-0 flex-1">
                            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#811b1e] to-[#a13333] text-white flex items-center justify-center shrink-0 shadow-md shadow-red-950/20">
                                <span class="material-symbols-outlined text-2xl">edit_document</span>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="font-headline font-black text-sm sm:text-lg text-zinc-900 dark:text-white leading-tight truncate">
                                        Editor y Redactor de Contrato
                                    </h3>
                                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider shrink-0">
                                        Ley 25.506 • DNU 70/2023
                                    </span>
                                </div>
                                <p class="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                    Inquilino: <strong class="text-zinc-800 dark:text-zinc-200">${tenantName}</strong> • 📍 ${propAddress}
                                </p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 shrink-0">
                            <!-- Botón Cerrar -->
                            <button type="button" id="btn-close-contract-editor" class="w-9 h-9 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer" title="Cerrar Editor">
                                <span class="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                    </div>

                    <!-- Mode Selector Tab Bar & Mobile Sub-tabs -->
                    <div class="px-4 sm:px-6 py-2 bg-zinc-50/90 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
                        
                        <!-- Tabs Principales -->
                        <div class="flex items-center gap-1.5 sm:gap-2">
                            <button type="button" id="tab-smart-contract" class="tab-btn px-3.5 py-1.5 rounded-xl font-headline font-bold text-xs sm:text-sm flex items-center gap-1.5 border transition-all shrink-0 ${this._activeTab === 'smart' ? 'border-primary/30 text-primary dark:text-red-400 bg-white dark:bg-zinc-900 shadow-xs' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}">
                                <span class="material-symbols-outlined text-base">auto_awesome</span>
                                <span>Generador Inteligente</span>
                            </button>
                            <button type="button" id="tab-upload-contract" class="tab-btn px-3.5 py-1.5 rounded-xl font-headline font-bold text-xs sm:text-sm flex items-center gap-1.5 border transition-all shrink-0 ${this._activeTab === 'upload' ? 'border-primary/30 text-primary dark:text-red-400 bg-white dark:bg-zinc-900 shadow-xs' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}">
                                <span class="material-symbols-outlined text-base">upload_file</span>
                                <span>Subir Documento Propio</span>
                            </button>
                        </div>

                        <!-- Switcher rápido Mobile (< md): Parámetros vs Vista Previa Contrato -->
                        <div class="md:hidden flex items-center p-1 bg-zinc-200/70 dark:bg-zinc-800/80 rounded-xl border border-zinc-300/50 dark:border-zinc-700/60 shadow-xs w-full sm:w-auto mt-1 sm:mt-0">
                            <button type="button" id="mobile-subtab-config" class="flex-1 sm:flex-initial py-1.5 px-3 rounded-lg font-headline font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${this._activeMobileSubtab === 'config' ? 'bg-white dark:bg-zinc-900 text-primary dark:text-red-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400'} cursor-pointer">
                                <span class="material-symbols-outlined text-sm">tune</span>
                                <span>1. Parámetros</span>
                            </button>
                            <button type="button" id="mobile-subtab-preview" class="flex-1 sm:flex-initial py-1.5 px-3 rounded-lg font-headline font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${this._activeMobileSubtab === 'preview' ? 'bg-white dark:bg-zinc-900 text-primary dark:text-red-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400'} cursor-pointer">
                                <span class="material-symbols-outlined text-sm">description</span>
                                <span>2. Ver Contrato Legal</span>
                                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5"></span>
                            </button>
                        </div>

                    </div>

                    <!-- Modal Body Container (Fixed Height Dual-Pane Layout en Desktop) -->
                    <div class="flex-1 min-h-0 overflow-hidden flex flex-col bg-zinc-50/50 dark:bg-[#090a0f]">
                        
                        <!-- TAB 1: SMART CONTRACT BUILDER (Dual-Pane Grid en Desktop md/lg/xl) -->
                        <div id="content-smart-contract" class="${this._activeTab === 'smart' ? 'flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden' : 'hidden'}">
                            
                            <!-- COLUMNA IZQUIERDA: CONTROLES MODERNOS (Scroll independiente) -->
                            <div id="smart-config-col" class="md:col-span-6 lg:col-span-5 h-full overflow-y-auto p-4 sm:p-5 space-y-3.5 ${this._activeMobileSubtab === 'config' ? 'block' : 'hidden md:block'}">
                                
                                <!-- Card 1: Canon & Moneda -->
                                <div class="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3 shadow-xs">
                                    <div class="flex items-center justify-between gap-2">
                                        <div class="flex items-center gap-2 min-w-0">
                                            <span class="material-symbols-outlined text-xl text-primary dark:text-red-400 shrink-0">payments</span>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-1.5">
                                                    <h4 class="font-headline font-bold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">Precio Inicial y Moneda</h4>
                                                    <button type="button" onclick="ContractEditorModal.showLegalInfo('precio')" class="w-5 h-5 rounded-full bg-zinc-100 hover:bg-primary/10 dark:bg-zinc-800 dark:hover:bg-red-950/40 text-zinc-400 hover:text-primary dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Ver explicación y marco legal (Art. 1187 CCyCN)">
                                                        <span class="material-symbols-outlined text-[13px]">info</span>
                                                    </button>
                                                </div>
                                                <p class="text-[10px] text-zinc-400 truncate">Canon mensual acordado</p>
                                            </div>
                                        </div>

                                        <!-- Currency Switcher Pills -->
                                        <div class="flex p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-xs shrink-0" id="currency-switcher-container">
                                            <button type="button" data-currency="ARS" class="currency-chip px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${defaultCurrency === 'ARS' ? 'bg-primary text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">ARS ($)</button>
                                            <button type="button" data-currency="USD" class="currency-chip px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${defaultCurrency === 'USD' ? 'bg-primary text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">USD (U$S)</button>
                                            <input type="hidden" id="editor-moneda" value="${defaultCurrency}">
                                        </div>
                                    </div>

                                    <!-- Monetary Input -->
                                    <div class="flex items-center bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl h-11 px-3.5 focus-within:bg-white dark:focus-within:bg-zinc-800 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                        <span id="editor-moneda-symbol" class="text-zinc-500 dark:text-zinc-400 font-headline font-black text-base mr-2 select-none shrink-0">${defaultCurrency === 'USD' ? 'USD' : '$'}</span>
                                        <input 
                                            type="number" 
                                            id="editor-monto" 
                                            inputmode="numeric"
                                            value="${defaultRent}" 
                                            placeholder="0"
                                            style="border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important;"
                                            class="w-full text-zinc-900 dark:text-white font-headline font-black text-lg tracking-tight p-0"
                                        >
                                    </div>
                                </div>

                                <!-- Card 2: Duración del Contrato -->
                                <div class="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5 shadow-xs">
                                    <div class="flex items-center justify-between gap-2">
                                        <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                            <span class="material-symbols-outlined text-sm text-primary">schedule</span>
                                            <span>Duración del Plazo</span>
                                            <button type="button" onclick="ContractEditorModal.showLegalInfo('plazo')" class="w-5 h-5 rounded-full bg-zinc-100 hover:bg-primary/10 dark:bg-zinc-800 dark:hover:bg-red-950/40 text-zinc-400 hover:text-primary dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Ver explicación y marco legal (Art. 1198 CCyCN)">
                                                <span class="material-symbols-outlined text-[13px]">info</span>
                                            </button>
                                        </label>
                                        <span class="text-[10px] text-zinc-400 font-medium">Pacto libre</span>
                                    </div>
                                    <div class="grid grid-cols-3 sm:grid-cols-5 gap-1.5" id="duracion-chips-container">
                                        <button type="button" data-val="12" class="duration-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultDuration === '12' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">12 meses</button>
                                        <button type="button" data-val="24" class="duration-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultDuration === '24' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">24 meses <span class="block text-[8px] opacity-75">Estándar</span></button>
                                        <button type="button" data-val="36" class="duration-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultDuration === '36' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">36 meses</button>
                                        <button type="button" data-val="6" class="duration-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultDuration === '6' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">6 meses</button>
                                        <button type="button" data-val="3" class="duration-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultDuration === '3' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">3 meses</button>
                                        <input type="hidden" id="editor-duracion" value="${defaultDuration}">
                                    </div>
                                </div>

                                <!-- Card 3: Actualización Periódica (Índice y Frecuencia) -->
                                <div class="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3 shadow-xs">
                                    <div class="space-y-2">
                                        <div class="flex items-center justify-between gap-2">
                                            <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                <span class="material-symbols-outlined text-sm text-primary">trending_up</span>
                                                <span>Índice de Actualización</span>
                                                <button type="button" onclick="ContractEditorModal.showLegalInfo('indice')" class="w-5 h-5 rounded-full bg-zinc-100 hover:bg-primary/10 dark:bg-zinc-800 dark:hover:bg-red-950/40 text-zinc-400 hover:text-primary dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Ver explicación de índices (IPC / ICL / CAC / Fijo)">
                                                    <span class="material-symbols-outlined text-[13px]">info</span>
                                                </button>
                                            </label>
                                            <span class="text-[10px] text-zinc-400">Variación oficial</span>
                                        </div>
                                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5" id="indice-chips-container">
                                            <button type="button" data-val="IPC" class="index-chip py-2 px-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultIndex === 'IPC' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>IPC</span>
                                                <span class="block text-[8px] opacity-75">Consumidor</span>
                                            </button>
                                            <button type="button" data-val="ICL" class="index-chip py-2 px-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultIndex === 'ICL' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>ICL</span>
                                                <span class="block text-[8px] opacity-75">BCRA</span>
                                            </button>
                                            <button type="button" data-val="CAC" class="index-chip py-2 px-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultIndex === 'CAC' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>CAC</span>
                                                <span class="block text-[8px] opacity-75">Construcción</span>
                                            </button>
                                            <button type="button" data-val="FIJO" class="index-chip py-2 px-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultIndex === 'FIJO' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>Fijo</span>
                                                <span class="block text-[8px] opacity-75">Sin indexar</span>
                                            </button>
                                            <input type="hidden" id="editor-indice" value="${defaultIndex}">
                                        </div>
                                    </div>

                                    <div class="space-y-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                                        <div class="flex items-center justify-between gap-2">
                                            <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                <span class="material-symbols-outlined text-sm text-primary">update</span>
                                                <span>Frecuencia de Ajuste</span>
                                                <button type="button" onclick="ContractEditorModal.showLegalInfo('frecuencia')" class="w-5 h-5 rounded-full bg-zinc-100 hover:bg-primary/10 dark:bg-zinc-800 dark:hover:bg-red-950/40 text-zinc-400 hover:text-primary dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Ver explicación de frecuencia">
                                                    <span class="material-symbols-outlined text-[13px]">info</span>
                                                </button>
                                            </label>
                                        </div>
                                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5" id="frecuencia-chips-container">
                                            <button type="button" data-val="3" class="frec-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultFrequency === '3' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Trimestral (3m)</button>
                                            <button type="button" data-val="4" class="frec-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultFrequency === '4' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Cuatrimestral (4m)</button>
                                            <button type="button" data-val="6" class="frec-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultFrequency === '6' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Semestral (6m)</button>
                                            <button type="button" data-val="12" class="frec-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultFrequency === '12' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Anual (12m)</button>
                                            <input type="hidden" id="editor-frecuencia" value="${defaultFrequency}">
                                        </div>
                                    </div>
                                </div>

                                <!-- Card 4: Cobro, Cuenta, Depósito y Expensas -->
                                <div class="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3 shadow-xs">
                                    <div class="flex items-center justify-between gap-2">
                                        <div class="flex items-center gap-2 min-w-0">
                                            <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center shrink-0">
                                                <span class="material-symbols-outlined text-base">account_balance</span>
                                            </div>
                                            <div class="min-w-0">
                                                <h4 class="font-headline font-bold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">Cuenta de Cobro & Vencimiento</h4>
                                                <p class="text-[10px] text-zinc-400 truncate">Datos bancarios y plazo mensual</p>
                                            </div>
                                        </div>
                                        <button type="button" onclick="ContractEditorModal.showLegalInfo('cuenta_vencimiento')" class="w-6 h-6 rounded-full bg-zinc-100 hover:bg-primary/10 dark:bg-zinc-800 dark:hover:bg-red-950/40 text-zinc-400 hover:text-primary dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Ver explicación de pagos y mora">
                                            <span class="material-symbols-outlined text-sm">info</span>
                                        </button>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <!-- Alias CBU / CVU -->
                                        <div class="space-y-1.5">
                                            <div class="flex items-center justify-between">
                                                <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                                                    <span class="material-symbols-outlined text-sm text-primary">qr_code_2</span>
                                                    <span>Alias CBU / CVU</span>
                                                </label>
                                                <span class="text-[10px] text-zinc-400">Transferencias</span>
                                            </div>
                                            <input 
                                                type="text" 
                                                id="editor-alias-cbu" 
                                                value="${defaultAlias}" 
                                                autocapitalize="characters"
                                                placeholder="HABITAT.ALQUILER.MP"
                                                class="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl h-10 px-3 font-mono font-bold text-xs text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-zinc-800 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            >
                                        </div>

                                        <!-- Día Límite de Pago -->
                                        <div class="space-y-1.5">
                                            <div class="flex items-center justify-between">
                                                <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                                                    <span class="material-symbols-outlined text-sm text-primary">event_available</span>
                                                    <span>Día de Vencimiento</span>
                                                </label>
                                                <span class="text-[10px] text-zinc-400">Mensual</span>
                                            </div>
                                            <div class="grid grid-cols-3 gap-1.5" id="dia-venc-chips-container">
                                                <button type="button" data-val="5" class="dia-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultDueDay === '5' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Día 5</button>
                                                <button type="button" data-val="10" class="dia-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultDueDay === '10' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Día 10 <span class="block text-[8px] opacity-75">Estándar</span></button>
                                                <button type="button" data-val="15" class="dia-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultDueDay === '15' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Día 15</button>
                                                <input type="hidden" id="editor-dia-venc" value="${defaultDueDay}">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Depósito en Garantía -->
                                    <div class="space-y-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                                        <div class="flex items-center justify-between gap-2">
                                            <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                <span class="material-symbols-outlined text-sm text-primary">lock</span>
                                                <span>Depósito en Garantía</span>
                                                <button type="button" onclick="ContractEditorModal.showLegalInfo('deposito')" class="w-5 h-5 rounded-full bg-zinc-100 hover:bg-primary/10 dark:bg-zinc-800 dark:hover:bg-red-950/40 text-zinc-400 hover:text-primary dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Ver marco legal de depósitos">
                                                    <span class="material-symbols-outlined text-[13px]">info</span>
                                                </button>
                                            </label>
                                            <span class="text-[10px] text-zinc-400">Resguardo locativo</span>
                                        </div>
                                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5" id="deposito-chips-container">
                                            <button type="button" data-val="1_MES" class="deposito-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultDeposito === '1_MES' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>1 Mes (ARS)</span>
                                                <span class="block text-[8px] opacity-75">Recomendado</span>
                                            </button>
                                            <button type="button" data-val="1_MES_USD" class="deposito-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultDeposito === '1_MES_USD' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>1 Mes (USD)</span>
                                                <span class="block text-[8px] opacity-75">Moneda ext.</span>
                                            </button>
                                            <button type="button" data-val="2_MESES" class="deposito-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultDeposito === '2_MESES' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>2 Meses</span>
                                                <span class="block text-[8px] opacity-75">Doble garantía</span>
                                            </button>
                                            <button type="button" data-val="SIN_DEPOSITO" class="deposito-chip py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultDeposito === 'SIN_DEPOSITO' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>Sin Depósito</span>
                                                <span class="block text-[8px] opacity-75">Pasaporte Hábitat</span>
                                            </button>
                                            <input type="hidden" id="editor-deposito" value="${defaultDeposito}">
                                        </div>
                                    </div>

                                    <!-- Régimen de Expensas -->
                                    <div class="space-y-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                                        <div class="flex items-center justify-between gap-2">
                                            <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                <span class="material-symbols-outlined text-sm text-primary">receipt_long</span>
                                                <span>Régimen de Expensas e Impuestos</span>
                                                <button type="button" onclick="ContractEditorModal.showLegalInfo('expensas')" class="w-5 h-5 rounded-full bg-zinc-100 hover:bg-primary/10 dark:bg-zinc-800 dark:hover:bg-red-950/40 text-zinc-400 hover:text-primary dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Ver marco legal de expensas">
                                                    <span class="material-symbols-outlined text-[13px]">info</span>
                                                </button>
                                            </label>
                                        </div>
                                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5" id="expensas-chips-container">
                                            <button type="button" data-val="ORDINARIAS_INQ" class="expensas-chip py-2 px-2 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultExpensas === 'ORDINARIAS_INQ' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>Ordinarias x Inquilino</span>
                                                <span class="block text-[8px] opacity-75">Extraord. x Locador</span>
                                            </button>
                                            <button type="button" data-val="TOTALES_INQ" class="expensas-chip py-2 px-2 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultExpensas === 'TOTALES_INQ' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>Totales x Inquilino</span>
                                                <span class="block text-[8px] opacity-75">Ordinarias + Extraord.</span>
                                            </button>
                                            <button type="button" data-val="INCLUIDAS" class="expensas-chip py-2 px-2 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${defaultExpensas === 'INCLUIDAS' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>Incluidas en Canon</span>
                                                <span class="block text-[8px] opacity-75">A cargo del Locador</span>
                                            </button>
                                            <input type="hidden" id="editor-expensas" value="${defaultExpensas}">
                                        </div>
                                    </div>
                                    <input type="hidden" id="editor-mora" value="${defaultMora}">
                                </div>

                                <!-- Card 5: Cláusulas y Permisos Especiales -->
                                <div class="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5 shadow-xs">
                                    <div class="flex items-center justify-between gap-2">
                                        <div class="flex items-center gap-2 min-w-0">
                                            <span class="material-symbols-outlined text-xl text-primary dark:text-red-400 shrink-0">policy</span>
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-1.5">
                                                    <h4 class="font-headline font-bold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">Cláusulas y Permisos Especiales</h4>
                                                    <button type="button" onclick="ContractEditorModal.showLegalInfo('clausulas_personalizadas')" class="w-5 h-5 rounded-full bg-zinc-100 hover:bg-primary/10 dark:bg-zinc-800 dark:hover:bg-red-950/40 text-zinc-400 hover:text-primary dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Ver marco legal de cláusulas especiales">
                                                        <span class="material-symbols-outlined text-[13px]">info</span>
                                                    </button>
                                                </div>
                                                <p class="text-[10px] text-zinc-400 truncate">Personalizá las condiciones legales</p>
                                            </div>
                                        </div>
                                        <span class="text-[10px] text-zinc-400 font-medium shrink-0">Ley 25.506 & CCyCN</span>
                                    </div>

                                    <div class="space-y-2 text-xs">
                                        <!-- Mascotas -->
                                        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary/50 transition-all gap-2">
                                            <div class="flex items-center gap-2 min-w-0 pr-1">
                                                <span class="material-symbols-outlined text-lg text-primary dark:text-red-400 shrink-0">pets</span>
                                                <div class="min-w-0">
                                                    <div class="flex items-center gap-1.5 flex-wrap">
                                                        <span class="font-bold text-zinc-900 dark:text-white text-xs block">Permitir Mascotas</span>
                                                        <button type="button" onclick="ContractEditorModal.showLegalInfo('mascotas')" class="text-zinc-400 hover:text-primary dark:hover:text-red-400 transition-colors cursor-pointer shrink-0" title="Ver explicación legal">
                                                            <span class="material-symbols-outlined text-[13px]">info</span>
                                                        </button>
                                                    </div>
                                                    <span class="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">Tenencia responsable de animales domésticos</span>
                                                </div>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input type="checkbox" id="toggle-mascotas" ${defaultMascotas ? 'checked' : ''} class="sr-only peer">
                                                <div class="w-10 h-5 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <!-- Destino Vivienda -->
                                        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary/50 transition-all gap-2">
                                            <div class="flex items-center gap-2 min-w-0 pr-1">
                                                <span class="material-symbols-outlined text-lg text-primary dark:text-red-400 shrink-0">home</span>
                                                <div class="min-w-0">
                                                    <div class="flex items-center gap-1.5 flex-wrap">
                                                        <span class="font-bold text-zinc-900 dark:text-white text-xs block">Destino Exclusivo Vivienda</span>
                                                        <button type="button" onclick="ContractEditorModal.showLegalInfo('destino_vivienda')" class="text-zinc-400 hover:text-primary dark:hover:text-red-400 transition-colors cursor-pointer shrink-0" title="Ver explicación legal">
                                                            <span class="material-symbols-outlined text-[13px]">info</span>
                                                        </button>
                                                    </div>
                                                    <span class="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">Prohíbe uso comercial o profesional</span>
                                                </div>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input type="checkbox" id="toggle-vivienda" ${defaultVivienda ? 'checked' : ''} class="sr-only peer">
                                                <div class="w-10 h-5 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <!-- Seguro Incendio -->
                                        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary/50 transition-all gap-2">
                                            <div class="flex items-center gap-2 min-w-0 pr-1">
                                                <span class="material-symbols-outlined text-lg text-primary dark:text-red-400 shrink-0">shield</span>
                                                <div class="min-w-0">
                                                    <div class="flex items-center gap-1.5 flex-wrap">
                                                        <span class="font-bold text-zinc-900 dark:text-white text-xs block">Seguro de Incendio</span>
                                                        <button type="button" onclick="ContractEditorModal.showLegalInfo('seguro_incendio')" class="text-zinc-400 hover:text-primary dark:hover:text-red-400 transition-colors cursor-pointer shrink-0" title="Ver explicación legal">
                                                            <span class="material-symbols-outlined text-[13px]">info</span>
                                                        </button>
                                                    </div>
                                                    <span class="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">Póliza de seguro a favor del locador</span>
                                                </div>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input type="checkbox" id="toggle-seguro" ${defaultSeguro ? 'checked' : ''} class="sr-only peer">
                                                <div class="w-10 h-5 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <!-- Prohibición Subalquiler -->
                                        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary/50 transition-all gap-2">
                                            <div class="flex items-center gap-2 min-w-0 pr-1">
                                                <span class="material-symbols-outlined text-lg text-primary dark:text-red-400 shrink-0">block</span>
                                                <div class="min-w-0">
                                                    <div class="flex items-center gap-1.5 flex-wrap">
                                                        <span class="font-bold text-zinc-900 dark:text-white text-xs block">Prohibición de Sublocación</span>
                                                        <button type="button" onclick="ContractEditorModal.showLegalInfo('subalquiler')" class="text-zinc-400 hover:text-primary dark:hover:text-red-400 transition-colors cursor-pointer shrink-0" title="Ver explicación legal">
                                                            <span class="material-symbols-outlined text-[13px]">info</span>
                                                        </button>
                                                    </div>
                                                    <span class="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">Prohíbe ceder o subarrendar a terceros</span>
                                                </div>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input type="checkbox" id="toggle-subalquiler" ${defaultSubalquiler ? 'checked' : ''} class="sr-only peer">
                                                <div class="w-10 h-5 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <!-- Rescisión Anticipada -->
                                        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary/50 transition-all gap-2">
                                            <div class="flex items-center gap-2 min-w-0 pr-1">
                                                <span class="material-symbols-outlined text-lg text-primary dark:text-red-400 shrink-0">contract_delete</span>
                                                <div class="min-w-0">
                                                    <div class="flex items-center gap-1.5 flex-wrap">
                                                        <span class="font-bold text-zinc-900 dark:text-white text-xs block">Rescisión Anticipada (Art. 1221)</span>
                                                        <button type="button" onclick="ContractEditorModal.showLegalInfo('rescision')" class="text-zinc-400 hover:text-primary dark:hover:text-red-400 transition-colors cursor-pointer shrink-0" title="Ver explicación legal">
                                                            <span class="material-symbols-outlined text-[13px]">info</span>
                                                        </button>
                                                    </div>
                                                    <span class="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">Notificación previa con 1 mes de antelación</span>
                                                </div>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input type="checkbox" id="toggle-rescision" ${defaultRescision ? 'checked' : ''} class="sr-only peer">
                                                <div class="w-10 h-5 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <!-- Contenedor dinámico de cláusulas adicionales personalizadas -->
                                        <div id="custom-clauses-list-container" class="space-y-2 pt-1">
                                            <!-- Se inyectan dinámicamente -->
                                        </div>

                                        <!-- Formulario colapsable para agregar cláusula personalizada -->
                                        <div id="add-custom-clause-box" class="hidden p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/30 space-y-2.5 mt-2">
                                            <div class="flex items-center justify-between">
                                                <span class="font-headline font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                                    <span class="material-symbols-outlined text-sm">add_circle</span>
                                                    <span>Nueva Cláusula Personalizada</span>
                                                </span>
                                                <button type="button" id="btn-cancel-custom-clause" class="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs cursor-pointer">Cancelar</button>
                                            </div>
                                            <input type="text" id="new-clause-title" placeholder="Título (ej: PINTURA Y RESTITUCIÓN)" class="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-bold uppercase focus:ring-1 focus:ring-primary outline-none">
                                            <textarea id="new-clause-text" rows="2" placeholder="Redacción legal de la cláusula acordada..." class="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"></textarea>
                                            <button type="button" id="btn-save-custom-clause" class="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                                                <span class="material-symbols-outlined text-sm">check</span>
                                                <span>Insertar Cláusula al Contrato</span>
                                            </button>
                                        </div>

                                        <button type="button" id="btn-show-add-clause" class="w-full py-2 px-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-primary dark:hover:text-red-400 hover:border-primary font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2 bg-white/50 dark:bg-zinc-900/50">
                                            <span class="material-symbols-outlined text-base">add</span>
                                            <span>+ Agregar Cláusula Personalizada</span>
                                        </button>
                                    </div>
                                </div>

                                <!-- Botón rápido Mobile para ver la vista previa del contrato -->
                                <button type="button" id="btn-mobile-goto-preview" class="md:hidden w-full py-3 px-4 rounded-2xl bg-zinc-900 dark:bg-zinc-800 hover:bg-black dark:hover:bg-zinc-700 text-white font-headline font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer">
                                    <span class="material-symbols-outlined text-base">visibility</span>
                                    <span>Ver Documento Legal en Vista Previa</span>
                                    <span class="material-symbols-outlined text-base">arrow_forward</span>
                                </button>
                            </div>

                            <!-- COLUMNA DERECHA: HOJA LEGAL DIGITAL EN VIVO (Dual-Pane permanente en Desktop) -->
                            <div id="smart-preview-col" class="md:col-span-6 lg:col-span-7 h-full flex flex-col p-3 sm:p-5 bg-zinc-100/70 dark:bg-[#08090d] border-t md:border-t-0 md:border-l border-zinc-200/80 dark:border-zinc-800/80 min-h-0 ${this._activeMobileSubtab === 'preview' ? 'flex' : 'hidden md:flex'}">
                                
                                <div class="shrink-0 flex items-center justify-between text-xs pb-2.5 px-1">
                                    <div class="flex items-center gap-2">
                                        <button type="button" id="btn-mobile-back-to-config" class="md:hidden p-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 font-bold text-[11px] cursor-pointer">
                                            <span class="material-symbols-outlined text-sm">arrow_back</span>
                                            <span>Parámetros</span>
                                        </button>
                                        <span class="font-headline font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 text-xs sm:text-sm">
                                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Documento Legal en Vivo
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-1.5 sm:gap-2">
                                        <button type="button" id="btn-copy-preview-text" class="p-1 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-primary hover:text-white transition-all cursor-pointer flex items-center gap-1" title="Copiar texto del borrador">
                                            <span class="material-symbols-outlined text-xs">content_copy</span>
                                            <span class="hidden sm:inline">Copiar</span>
                                        </button>
                                        <button type="button" onclick="ContractEditorModal.showLegalInfo('firma_digital')" class="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-zinc-500 hover:text-primary dark:hover:text-red-400 transition-colors cursor-pointer" title="Ver marco de validez probatoria">
                                            <span class="material-symbols-outlined text-sm">gavel</span>
                                            <span>Ley 25.506</span>
                                        </button>
                                        <span class="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                            Reactivo
                                        </span>
                                    </div>
                                </div>

                                <!-- Hoja Estilo Papel Legal (Blanco / Dark contrastado, seleccionable y con scroll propio perfecto) -->
                                <div class="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-[#12131a] border border-zinc-300/80 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-lg space-y-4 text-zinc-800 dark:text-zinc-200 text-[11px] sm:text-xs leading-relaxed font-mono select-text" id="contract-live-preview-box">
                                    <!-- Se renderiza reactivamente con _updateLivePreview -->
                                </div>

                            </div>

                        </div>

                        <!-- TAB 2: SUBIR CONTRATO PROPIO (PDF / DOCX) -->
                        <div id="content-upload-contract" class="${this._activeTab === 'upload' ? 'flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 max-w-3xl mx-auto' : 'hidden'}">
                            <div class="bg-white dark:bg-zinc-900 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 space-y-4 sm:space-y-5 shadow-xs">
                                <div class="flex items-start gap-3 sm:gap-4">
                                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center shrink-0">
                                        <span class="material-symbols-outlined text-xl sm:text-2xl">cloud_upload</span>
                                    </div>
                                    <div>
                                        <h4 class="font-headline font-bold text-sm sm:text-base text-zinc-900 dark:text-white">Subí tu propio documento de contrato</h4>
                                        <p class="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                            Si ya contás con un modelo redactado por tu escribanía o abogado en formato PDF o Word, podés cargarlo aquí. El sistema lo vinculará automáticamente al proceso de firma biométrica facial (Didit KYC) y sellado criptográfico TSA bajo Ley 25.506.
                                        </p>
                                    </div>
                                </div>

                                <!-- Drag & Drop Zone -->
                                <div id="drop-zone-custom-contract" class="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-primary dark:hover:border-primary rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center transition-all bg-zinc-50 dark:bg-zinc-800/40 cursor-pointer flex flex-col items-center justify-center gap-2.5 sm:gap-3 group">
                                    <input type="file" id="input-file-custom-contract" accept=".pdf,.doc,.docx" class="hidden">
                                    <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 group-hover:scale-110 group-hover:text-primary transition-all flex items-center justify-center shadow-xs">
                                        <span class="material-symbols-outlined text-2xl sm:text-3xl">upload_file</span>
                                    </div>
                                    <div>
                                        <p class="font-headline font-bold text-xs sm:text-sm text-zinc-800 dark:text-zinc-200">
                                            Hacé clic para seleccionar o arrastrá tu contrato aquí
                                        </p>
                                        <p class="text-[10px] sm:text-xs text-zinc-400 mt-1">Formatos soportados: PDF, DOCX (Máximo 25 MB)</p>
                                    </div>
                                </div>

                                <!-- File Preview Box -->
                                <div id="custom-file-preview" class="hidden p-3 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3 text-xs">
                                    <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                        <span class="material-symbols-outlined text-emerald-600 text-2xl sm:text-3xl shrink-0">picture_as_pdf</span>
                                        <div class="min-w-0">
                                            <p id="custom-file-name" class="font-headline font-bold text-emerald-900 dark:text-emerald-300 truncate text-xs sm:text-sm">contrato_personalizado.pdf</p>
                                            <p id="custom-file-info" class="text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-xs truncate">Listo para firma biométrica y resguardo criptográfico</p>
                                        </div>
                                    </div>
                                    <button type="button" id="btn-remove-custom-file" class="px-2.5 sm:px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-bold text-xs transition-colors cursor-pointer shrink-0">
                                        Cambiar
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Bottom Action Footer Bar -->
                    <div class="px-4 sm:px-6 py-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-3">
                        
                        <div class="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 order-2 sm:order-1">
                            <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base sm:text-lg shrink-0">verified_user</span>
                            <span class="truncate">Custodia e Inmutabilidad con <strong>Firma Didit KYC</strong></span>
                        </div>

                        <div class="flex items-center gap-2 sm:gap-3 order-1 sm:order-2">
                            <button type="button" id="btn-cancel-contract-editor" class="px-3.5 sm:px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0">
                                Cancelar
                            </button>
                            <button type="button" id="btn-confirm-contract-editor" class="flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container active:scale-[0.98] text-white font-headline font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer">
                                <span class="material-symbols-outlined text-base">check_circle</span>
                                <span>Aplicar Condiciones <span class="hidden xs:inline sm:inline">al Contrato</span></span>
                            </button>
                        </div>
                    </div>

                </div>
            `;

            document.body.appendChild(modalContainer);

            // Inicializar eventos y renderizar el contrato inmediatamente
            this._setupEvents(tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress, defaultRent);
            this._renderCustomClausesList(tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress);
            this._updateLivePreview(tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress);
        },

        close: function () {
            const modal = document.getElementById('contract-editor-modal-container');
            if (modal) modal.remove();
            this.closeLegalInfo();
        },

        /**
         * Muestra el modal interactivo de Explicación y Marco Legal para una sección específica
         */
        showLegalInfo: function (topicKey) {
            const info = LEGAL_INFO_DICTIONARY[topicKey];
            if (!info) return;

            this.closeLegalInfo();

            const infoModal = document.createElement('div');
            infoModal.id = 'contract-legal-info-modal';
            infoModal.className = 'fixed inset-0 z-[110000] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn font-body';

            infoModal.innerHTML = `
                <div class="relative w-full max-w-lg sm:max-w-xl max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 text-zinc-900 dark:text-zinc-100 animate-scaleUp">
                    
                    <!-- Header -->
                    <div class="flex items-start justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center shrink-0 border border-primary/20">
                                <span class="material-symbols-outlined text-lg sm:text-xl">gavel</span>
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    <h3 class="font-headline font-black text-sm sm:text-base text-zinc-900 dark:text-white leading-tight truncate">
                                        ${info.title}
                                    </h3>
                                    <span class="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-primary/10 text-primary dark:text-red-300 border border-primary/20 uppercase tracking-wider shrink-0">
                                        ${info.badge || 'Marco Jurídico'}
                                    </span>
                                </div>
                                <p class="text-[11px] font-mono font-bold text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                                    📜 ${info.normative}
                                </p>
                            </div>
                        </div>

                        <button type="button" onclick="ContractEditorModal.closeLegalInfo()" class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer" title="Cerrar">
                            <span class="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>

                    <!-- Explicación Didáctica -->
                    <div class="space-y-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 font-body">
                        <div class="p-3 sm:p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200 font-medium">
                            ${info.explanation.replace(/\n/g, '<br>')}
                        </div>

                        <!-- Cita Textual de la Ley -->
                        <div class="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 text-amber-950 dark:text-amber-200 space-y-1">
                            <div class="flex items-center gap-1.5 font-headline font-bold text-[10px] sm:text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-400">
                                <span class="material-symbols-outlined text-sm">menu_book</span>
                                <span>Texto de la Norma Aplicable</span>
                            </div>
                            <p class="italic text-[10px] sm:text-[11px] font-serif leading-relaxed text-zinc-800 dark:text-zinc-200">
                                ${info.articleQuote}
                            </p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                        <span class="text-[10px] sm:text-[11px] text-zinc-400 truncate">Asesoría Legal Hábitat • DNU 70/2023</span>
                        <button type="button" onclick="ContractEditorModal.closeLegalInfo()" class="px-4 sm:px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-white font-headline font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0">
                            Entendido
                        </button>
                    </div>

                </div>
            `;

            // Cerrar con Escape o click fuera
            infoModal.addEventListener('click', (e) => {
                if (e.target === infoModal) this.closeLegalInfo();
            });

            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    ContractEditorModal.closeLegalInfo();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);

            document.body.appendChild(infoModal);
        },

        closeLegalInfo: function () {
            const el = document.getElementById('contract-legal-info-modal');
            if (el) el.remove();
        },

        _setupEvents: function (tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress, defaultRent) {
            const self = this;

            // Cerrar
            document.getElementById('btn-close-contract-editor')?.addEventListener('click', () => self.close());
            document.getElementById('btn-cancel-contract-editor')?.addEventListener('click', () => self.close());

            // Tabs Principales (Generador vs Subir Documento)
            const tabSmart = document.getElementById('tab-smart-contract');
            const tabUpload = document.getElementById('tab-upload-contract');
            const contentSmart = document.getElementById('content-smart-contract');
            const contentUpload = document.getElementById('content-upload-contract');

            tabSmart?.addEventListener('click', () => {
                self._activeTab = 'smart';
                tabSmart.className = 'tab-btn px-3.5 py-1.5 rounded-xl font-headline font-bold text-xs sm:text-sm flex items-center gap-1.5 border transition-all shrink-0 border-primary/30 text-primary dark:text-red-400 bg-white dark:bg-zinc-900 shadow-xs';
                tabUpload.className = 'tab-btn px-3.5 py-1.5 rounded-xl font-headline font-bold text-xs sm:text-sm flex items-center gap-1.5 border transition-all shrink-0 border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300';
                contentSmart.className = 'flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden';
                contentUpload.className = 'hidden';
                self._updateLivePreview(tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress);
            });

            tabUpload?.addEventListener('click', () => {
                self._activeTab = 'upload';
                tabUpload.className = 'tab-btn px-3.5 py-1.5 rounded-xl font-headline font-bold text-xs sm:text-sm flex items-center gap-1.5 border transition-all shrink-0 border-primary/30 text-primary dark:text-red-400 bg-white dark:bg-zinc-900 shadow-xs';
                tabSmart.className = 'tab-btn px-3.5 py-1.5 rounded-xl font-headline font-bold text-xs sm:text-sm flex items-center gap-1.5 border transition-all shrink-0 border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300';
                contentUpload.className = 'flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 max-w-3xl mx-auto';
                contentSmart.className = 'hidden';
            });

            // Sub-tabs Mobile (Configuración vs Vista Previa en pantallas < md)
            const subtabConfig = document.getElementById('mobile-subtab-config');
            const subtabPreview = document.getElementById('mobile-subtab-preview');
            const colConfig = document.getElementById('smart-config-col');
            const colPreview = document.getElementById('smart-preview-col');
            const btnGotoPreview = document.getElementById('btn-mobile-goto-preview');
            const btnBackToConfig = document.getElementById('btn-mobile-back-to-config');

            const setMobileSubtab = (tab) => {
                self._activeMobileSubtab = tab;
                if (tab === 'config') {
                    if (colConfig) colConfig.className = 'md:col-span-6 lg:col-span-5 h-full overflow-y-auto p-4 sm:p-5 space-y-3.5 block';
                    if (colPreview) colPreview.className = 'md:col-span-6 lg:col-span-7 h-full flex flex-col p-3 sm:p-5 bg-zinc-100/70 dark:bg-[#08090d] border-t md:border-t-0 md:border-l border-zinc-200/80 dark:border-zinc-800/80 min-h-0 hidden md:flex';

                    if (subtabConfig) {
                        subtabConfig.className = 'flex-1 sm:flex-initial py-1.5 px-3 rounded-lg font-headline font-bold text-xs flex items-center justify-center gap-1.5 transition-all bg-white dark:bg-zinc-900 text-primary dark:text-red-400 shadow-xs cursor-pointer';
                    }
                    if (subtabPreview) {
                        subtabPreview.className = 'flex-1 sm:flex-initial py-1.5 px-3 rounded-lg font-headline font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-zinc-600 dark:text-zinc-400 cursor-pointer';
                    }
                } else {
                    if (colConfig) colConfig.className = 'md:col-span-6 lg:col-span-5 h-full overflow-y-auto p-4 sm:p-5 space-y-3.5 hidden md:block';
                    if (colPreview) colPreview.className = 'md:col-span-6 lg:col-span-7 h-full flex flex-col p-3 sm:p-5 bg-zinc-100/70 dark:bg-[#08090d] border-t md:border-t-0 md:border-l border-zinc-200/80 dark:border-zinc-800/80 min-h-0 flex';

                    if (subtabPreview) {
                        subtabPreview.className = 'flex-1 sm:flex-initial py-1.5 px-3 rounded-lg font-headline font-bold text-xs flex items-center justify-center gap-1.5 transition-all bg-white dark:bg-zinc-900 text-primary dark:text-red-400 shadow-xs cursor-pointer';
                    }
                    if (subtabConfig) {
                        subtabConfig.className = 'flex-1 sm:flex-initial py-1.5 px-3 rounded-lg font-headline font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-zinc-600 dark:text-zinc-400 cursor-pointer';
                    }

                    self._updateLivePreview(tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress);
                }
            };

            subtabConfig?.addEventListener('click', () => setMobileSubtab('config'));
            subtabPreview?.addEventListener('click', () => setMobileSubtab('preview'));
            btnGotoPreview?.addEventListener('click', () => setMobileSubtab('preview'));
            btnBackToConfig?.addEventListener('click', () => setMobileSubtab('config'));

            // Botón Copiar Texto del Borrador
            document.getElementById('btn-copy-preview-text')?.addEventListener('click', () => {
                const box = document.getElementById('contract-live-preview-box');
                if (!box) return;
                const text = box.innerText || box.textContent || '';
                navigator.clipboard.writeText(text).then(() => {
                    if (window.ToastManager) {
                        window.ToastManager.show({
                            title: '✓ Contrato Copiado',
                            message: 'El texto completo del contrato ha sido copiado al portapapeles.',
                            type: 'success'
                        });
                    } else {
                        alert('Texto del contrato copiado al portapapeles.');
                    }
                }).catch(() => {});
            });

            // Reactividad de Inputs para Previsualización en Vivo
            const triggerPreview = () => {
                const moneda = document.getElementById('editor-moneda')?.value || 'ARS';
                const sym = document.getElementById('editor-moneda-symbol');
                if (sym) sym.textContent = moneda === 'USD' ? 'USD' : '$';
                self._updateLivePreview(tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress);
            };

            // Currency Chips
            const curContainer = document.getElementById('currency-switcher-container');
            const curChips = curContainer?.querySelectorAll('.currency-chip');
            const curInput = document.getElementById('editor-moneda');
            curChips?.forEach(chip => {
                chip.addEventListener('click', () => {
                    const cur = chip.getAttribute('data-currency');
                    if (curInput) curInput.value = cur;
                    curChips.forEach(c => {
                        c.className = 'currency-chip px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-zinc-900';
                    });
                    chip.className = 'currency-chip px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer bg-primary text-white shadow-xs';
                    triggerPreview();
                });
            });

            // Helper for chip groups
            function setupChipGroup(containerId, inputId, chipClass) {
                const container = document.getElementById(containerId);
                const input = document.getElementById(inputId);
                if (!container || !input) return;

                const chips = container.querySelectorAll('.' + chipClass);
                chips.forEach(chip => {
                    chip.addEventListener('click', () => {
                        const val = chip.getAttribute('data-val');
                        input.value = val;
                        chips.forEach(c => {
                            c.className = `${chipClass} py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50`;
                        });
                        chip.className = `${chipClass} py-2 px-1 rounded-xl border text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer bg-primary text-white border-primary shadow-xs`;
                        triggerPreview();
                    });
                });
            }

            setupChipGroup('duracion-chips-container', 'editor-duracion', 'duration-chip');
            setupChipGroup('indice-chips-container', 'editor-indice', 'index-chip');
            setupChipGroup('frecuencia-chips-container', 'editor-frecuencia', 'frec-chip');
            setupChipGroup('dia-venc-chips-container', 'editor-dia-venc', 'dia-chip');
            setupChipGroup('deposito-chips-container', 'editor-deposito', 'deposito-chip');
            setupChipGroup('expensas-chips-container', 'editor-expensas', 'expensas-chip');

            // Form inputs & Toggles reactivos
            ['editor-monto', 'editor-alias-cbu',
             'toggle-mascotas', 'toggle-vivienda', 'toggle-seguro', 'toggle-subalquiler', 'toggle-rescision'
            ].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('input', triggerPreview);
                    el.addEventListener('change', triggerPreview);
                }
            });

            // Cláusulas personalizadas - Controles
            const btnShowAdd = document.getElementById('btn-show-add-clause');
            const addBox = document.getElementById('add-custom-clause-box');
            const btnCancelCustom = document.getElementById('btn-cancel-custom-clause');
            const btnSaveCustom = document.getElementById('btn-save-custom-clause');
            const newTitleInput = document.getElementById('new-clause-title');
            const newTextInput = document.getElementById('new-clause-text');

            btnShowAdd?.addEventListener('click', () => {
                addBox?.classList.remove('hidden');
                btnShowAdd?.classList.add('hidden');
                newTitleInput?.focus();
            });

            btnCancelCustom?.addEventListener('click', () => {
                addBox?.classList.add('hidden');
                btnShowAdd?.classList.remove('hidden');
                if (newTitleInput) newTitleInput.value = '';
                if (newTextInput) newTextInput.value = '';
            });

            btnSaveCustom?.addEventListener('click', () => {
                const title = (newTitleInput?.value || '').trim();
                const text = (newTextInput?.value || '').trim();
                if (!title || !text) {
                    alert('Por favor ingrese el título y la redacción de la cláusula.');
                    return;
                }

                self._customClauses.push({
                    id: 'cc_' + Date.now(),
                    title: title.toUpperCase(),
                    text: text
                });

                if (newTitleInput) newTitleInput.value = '';
                if (newTextInput) newTextInput.value = '';
                addBox?.classList.add('hidden');
                btnShowAdd?.classList.remove('hidden');

                self._renderCustomClausesList(tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress);
                triggerPreview();
            });

            // Carga de Archivo Propio (Drag & Drop)
            const dropZone = document.getElementById('drop-zone-custom-contract');
            const fileInput = document.getElementById('input-file-custom-contract');
            const previewBox = document.getElementById('custom-file-preview');
            const fileNameEl = document.getElementById('custom-file-name');
            const fileInfoEl = document.getElementById('custom-file-info');
            const btnRemove = document.getElementById('btn-remove-custom-file');

            dropZone?.addEventListener('click', () => fileInput?.click());

            dropZone?.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-primary', 'bg-primary/5');
            });
            dropZone?.addEventListener('dragleave', () => {
                dropZone.classList.remove('border-primary', 'bg-primary/5');
            });
            dropZone?.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-primary', 'bg-primary/5');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFile(e.dataTransfer.files[0]);
                }
            });

            fileInput?.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    handleFile(e.target.files[0]);
                }
            });

            btnRemove?.addEventListener('click', (e) => {
                e.stopPropagation();
                self._customFile = null;
                previewBox.classList.add('hidden');
                dropZone.classList.remove('hidden');
                if (fileInput) fileInput.value = '';
            });

            async function handleFile(file) {
                self._customFile = file;
                const sizeKb = Math.round(file.size / 1024);
                fileNameEl.textContent = file.name;
                fileInfoEl.textContent = `Tamaño: ${sizeKb} KB • Archivo listo para custodia criptográfica`;
                dropZone.classList.add('hidden');
                previewBox.classList.remove('hidden');
            }

            // Confirmar y Aplicar
            document.getElementById('btn-confirm-contract-editor')?.addEventListener('click', async () => {
                const btn = document.getElementById('btn-confirm-contract-editor');
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">sync</span> Aplicando Términos...';

                const terms = self._collectTerms();

                if (typeof self._currentOptions?.onConfirm === 'function') {
                    await self._currentOptions.onConfirm(terms);
                } else {
                    const appId = self._currentOptions?.applicant?.id;
                    let targetContractId = self._currentOptions?.contract?.id || self._currentOptions?.contractId || null;
                    if (window.DataManager && window.DataManager.acceptApplication && appId) {
                        try {
                            const res = await window.DataManager.acceptApplication(appId, terms);
                            if (res && res.contractId) targetContractId = res.contractId;
                        } catch (e) {
                            console.warn("Aviso guardando términos:", e);
                        }
                    }
                    self.close();
                    if (targetContractId) {
                        window.location.href = `contratos.html?contract=${targetContractId}&sign=1&role=OWNER`;
                    } else {
                        window.location.href = `contratos.html?role=OWNER`;
                    }
                }
            });
        },

        _renderCustomClausesList: function (tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress) {
            const container = document.getElementById('custom-clauses-list-container');
            if (!container) return;

            if (!this._customClauses || this._customClauses.length === 0) {
                container.innerHTML = '';
                return;
            }

            container.innerHTML = this._customClauses.map((cc) => `
                <div class="flex items-start justify-between p-2.5 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/30 text-xs gap-2">
                    <div class="min-w-0 space-y-0.5">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="font-headline font-black text-amber-950 dark:text-amber-300 uppercase text-xs">${cc.title}</span>
                            <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">Personalizada</span>
                        </div>
                        <p class="text-zinc-600 dark:text-zinc-400 text-[10px] sm:text-[11px] leading-relaxed">${cc.text}</p>
                    </div>
                    <button type="button" onclick="ContractEditorModal.removeCustomClause('${cc.id}')" class="p-1.5 rounded-xl text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer" title="Eliminar cláusula">
                        <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                </div>
            `).join('');
        },

        removeCustomClause: function (clauseId) {
            this._customClauses = this._customClauses.filter(c => c.id !== clauseId);
            const applicant = this._currentOptions?.applicant || {};
            const property = this._currentOptions?.property || {};
            const contract = this._currentOptions?.contract || {};
            const tenantName = applicant.tenant_name || applicant.name || contract.tenant?.name || 'Inquilino Titular';
            const tenantDni = applicant.tenant_dni || applicant.dni || contract.tenant?.dni || '';
            const tenantCuil = applicant.tenant_cuit || applicant.cuit || (tenantDni ? `20-${tenantDni.replace(/\D/g,'')}-7` : '');
            const tenantEmail = applicant.tenant_email || applicant.email || contract.tenant?.email || 'inquilino@email.com';
            const ownerName = property.owner_name || contract.owner?.name || 'Propietario Titular';
            const ownerDni = property.owner_dni || contract.owner?.dni || '';
            const ownerCuil = property.owner_cuit || contract.owner?.cuil || (ownerDni ? `20-${ownerDni.replace(/\D/g,'')}-7` : '');
            const ownerEmail = property.owner_email || contract.owner?.email || 'propietario@email.com';
            const propAddress = property.address || (property.calle ? `${property.calle} ${property.numero || ''}`.trim() : '') || contract.propertyAddress || 'Av. San Martín 1250, Mendoza';

            this._renderCustomClausesList(tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress);
            this._updateLivePreview(tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress);
        },

        /**
         * Construye la lista de cláusulas activas de forma estrictamente consecutiva
         */
        buildActiveClauses: function (propAddress) {
            const duracion = document.getElementById('editor-duracion')?.value || 24;
            const moneda = document.getElementById('editor-moneda')?.value || 'ARS';
            const indice = document.getElementById('editor-indice')?.value || 'IPC';
            const frecuencia = document.getElementById('editor-frecuencia')?.value || 3;
            const montoRaw = document.getElementById('editor-monto')?.value || 450000;
            const num = isNaN(Number(montoRaw)) ? 450000 : Number(montoRaw);
            const sym = moneda === 'USD' ? 'USD ' : '$ ';
            const montoFmt = sym + num.toLocaleString('es-AR') + (moneda === 'USD' ? ' (Dólares Estadounidenses)' : ' (Pesos Argentinos)');
            const diaVenc = document.getElementById('editor-dia-venc')?.value || 10;
            const aliasCbu = document.getElementById('editor-alias-cbu')?.value || 'HABITAT.ALQUILER.MP';
            const depositoSel = document.getElementById('editor-deposito')?.value || '1_MES';
            const moraSel = document.getElementById('editor-mora')?.value || '0.5';
            const expensasSel = document.getElementById('editor-expensas')?.value || 'ORDINARIAS_INQ';

            const allowPets = document.getElementById('toggle-mascotas')?.checked;
            const onlyResidential = document.getElementById('toggle-vivienda')?.checked;
            const needInsurance = document.getElementById('toggle-seguro')?.checked;
            const noSublease = document.getElementById('toggle-subalquiler')?.checked;
            const allowEarlyTermination = document.getElementById('toggle-rescision')?.checked;

            const today = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const finalAddress = propAddress || this._currentOptions?.property?.address || this._currentOptions?.contract?.propertyAddress || 'Av. San Martín 1250, Mendoza';

            let depositoTxt = 'equivalente a UN (1) mes de canon locativo inicial';
            if (depositoSel === '1_MES_USD') depositoTxt = 'en Dólares Estadounidenses (USD) equivalente al valor inicial acordado';
            if (depositoSel === '2_MESES') depositoTxt = 'equivalente a DOS (2) meses de canon locativo inicial';
            if (depositoSel === 'SIN_DEPOSITO') depositoTxt = 'respaldado íntegramente mediante Pasaporte Hábitat / Seguro de Caución sin integración de efectivo en garantía';

            let expensasTxt = 'Las expensas comunes ordinarias y los consumos de servicios (energía eléctrica, gas natural, agua potable, telecomunicaciones) serán por cuenta exclusiva del LOCATARIO. Las expensas extraordinarias e impuestos sobre el inmueble serán a cargo del LOCADOR.';
            if (expensasSel === 'TOTALES_INQ') expensasTxt = 'La totalidad de las expensas (ordinarias y extraordinarias) y servicios serán solventadas por EL LOCATARIO.';
            if (expensasSel === 'INCLUIDAS') expensasTxt = 'Las expensas e impuestos se encuentran incluidos dentro del monto del canon locativo mensual fijado.';

            const clauses = [];

            // 1. Objeto y Destino
            clauses.push({
                tag: 'OBJETO Y DESTINO',
                body: `EL LOCADOR cede en locación a EL LOCATARIO, y éste acepta, el inmueble ubicado en <strong>${finalAddress}</strong>.${onlyResidential !== false ? ' Dicho inmueble tendrá como <strong>destino exclusivo el de vivienda familiar y permanente</strong>, quedando expresamente prohibido su cambio de destino o explotación comercial o profesional.' : ' Con destino habitacional conforme a derecho.'}`
            });

            // 2. Plazo
            clauses.push({
                tag: 'PLAZO DE LOCACIÓN',
                body: `El plazo contractual se pacta libremente entre las partes en <strong>${duracion} meses corridos</strong>, comenzando su vigencia el día <strong>${today}</strong>.`
            });

            // 3. Canon Locativo y Actualización
            clauses.push({
                tag: 'CANON LOCATIVO Y ACTUALIZACIÓN',
                body: `El precio del alquiler se fija en la suma inicial de <strong class="text-primary dark:text-red-400">${montoFmt}</strong> mensuales. Dicho importe se actualizará de forma periódica cada <strong>${frecuencia} meses</strong> aplicando la variación porcentual del índice oficial <strong>${indice}</strong>.`
            });

            // 4. Lugar y Forma de Pago / Mora
            clauses.push({
                tag: 'LUGAR Y FORMA DE PAGO',
                body: `El pago del alquiler mensual deberá efectuarse del 1 al día <strong>${diaVenc}</strong> de cada mes calendario mediante transferencia bancaria a la cuenta bancaria / Alias CBU: <strong class="font-mono text-emerald-600 dark:text-emerald-400">${aliasCbu}</strong>. En caso de mora, se devengará un interés punitorio del <strong>${moraSel}% por cada día de atraso</strong> hasta su efectiva cancelación.`
            });

            // 5. Expensas, Servicios e Impuestos
            clauses.push({
                tag: 'EXPENSAS, SERVICIOS E IMPUESTOS',
                body: `${expensasTxt}`
            });

            // 6. Depósito en Garantía
            clauses.push({
                tag: 'DEPÓSITO EN GARANTÍA',
                body: `EL LOCATARIO entrega a EL LOCADOR la suma ${depositoTxt}, suma que será restituida al finalizar la locación previa verificación del estado de conservación del inmueble y entrega de llaves.`
            });

            // 7. Mascotas
            if (allowPets) {
                clauses.push({
                    tag: 'TENENCIA DE MASCOTAS',
                    body: `Se autoriza la tenencia de animales domésticos en la propiedad bajo exclusiva responsabilidad del LOCATARIO por los cuidados sanitarios, ruidos y eventuales deterioros que pudieran ocasionar.`
                });
            } else {
                clauses.push({
                    tag: 'PROHIBICIÓN DE MASCOTAS',
                    body: `Queda terminantemente prohibida la tenencia o permanencia de animales de cualquier especie en el inmueble arrendado.`
                });
            }

            // 8. Seguro contra Incendio (solo si activo)
            if (needInsurance) {
                clauses.push({
                    tag: 'SEGURO CONTRA INCENDIO',
                    body: `EL LOCATARIO se obliga a contratar y mantener vigente durante todo el plazo contractual una póliza de seguro contra incendio y responsabilidad civil sobre la propiedad, designando al LOCADOR como beneficiario.`
                });
            }

            // 9. Prohibición de Sublocación (solo si activo)
            if (noSublease) {
                clauses.push({
                    tag: 'PROHIBICIÓN DE CESIÓN Y SUBLOCACIÓN',
                    body: `Queda expresamente prohibida la cesión total o parcial del presente contrato, el subarriendo total o parcial y el préstamo de uso del inmueble a terceros bajo apercibimiento de rescisión culposa (Art. 1213 CCyCN).`
                });
            }

            // 10. Rescisión Anticipada (solo si activo)
            if (allowEarlyTermination) {
                clauses.push({
                    tag: 'RESCISIÓN ANTICIPADA',
                    body: `EL LOCATARIO podrá rescindir el presente contrato en cualquier momento transcurridos los primeros seis meses de vigencia, notificando fehacientemente al LOCADOR con al menos un mes de anticipación conforme a las pautas del Art. 1221 del Código Civil y Comercial de la Nación.`
                });
            }

            // 11. Cláusulas Personalizadas
            if (this._customClauses && this._customClauses.length > 0) {
                this._customClauses.forEach(cc => {
                    if (cc.title && cc.text) {
                        clauses.push({
                            tag: cc.title.toUpperCase(),
                            body: cc.text
                        });
                    }
                });
            }

            // Última: Firma Electrónica y Didit Liveness
            clauses.push({
                tag: 'FIRMA ELECTRÓNICA Y BIOMETRÍA DIDIT',
                body: `Las partes prestan su expreso e irrevocable consentimiento para la suscripción del presente contrato mediante <strong>Firma Electrónica, Verificación Biométrica Facial en Vivo (Didit KYC) y Sello de Tiempo TSA RFC 3161</strong>, reconociéndole plena validez legal, eficacia probatoria y fuerza ejecutoria bajo la <strong>Ley Nacional N° 25.506</strong>.`
            });

            return clauses;
        },

        _collectTerms: function () {
            const isUpload = this._activeTab === 'upload';
            const duracion = parseInt(document.getElementById('editor-duracion')?.value || 24, 10);
            const moneda = document.getElementById('editor-moneda')?.value || 'ARS';
            const indice = document.getElementById('editor-indice')?.value || 'IPC';
            const frecuencia = parseInt(document.getElementById('editor-frecuencia')?.value || 3, 10);
            const monto = parseFloat(document.getElementById('editor-monto')?.value || 450000);
            const diaVenc = parseInt(document.getElementById('editor-dia-venc')?.value || 10, 10);
            const aliasCbu = document.getElementById('editor-alias-cbu')?.value || 'HABITAT.ALQUILER.MP';
            const deposito = document.getElementById('editor-deposito')?.value || '1_MES';
            const mora = parseFloat(document.getElementById('editor-mora')?.value || 0.5);
            const expensas = document.getElementById('editor-expensas')?.value || 'ORDINARIAS_INQ';

            const propAddress = this._currentOptions?.property?.address || this._currentOptions?.contract?.propertyAddress || 'Av. San Martín 1250, Mendoza';
            const activeClauses = this.buildActiveClauses(propAddress);

            const clausesConfig = {
                mascotas: document.getElementById('toggle-mascotas')?.checked ?? true,
                viviendaExclusiva: document.getElementById('toggle-vivienda')?.checked ?? true,
                seguroIncendio: document.getElementById('toggle-seguro')?.checked ?? true,
                prohibirSubalquiler: document.getElementById('toggle-subalquiler')?.checked ?? true,
                rescisionAnticipada: document.getElementById('toggle-rescision')?.checked ?? true,
                moneda: moneda,
                depositoModalidad: deposito,
                tasaMoraDiaria: mora,
                regimenExpensas: expensas
            };

            return {
                mode: isUpload ? 'custom_file' : 'smart_model',
                customFile: this._customFile,
                currency: moneda,
                durationMonths: duracion,
                adjustmentIndex: indice,
                adjustmentFrequencyMonths: frecuencia,
                monthlyRent: monto,
                paymentDueDay: diaVenc,
                aliasCbu: aliasCbu,
                clauses: clausesConfig,
                customClauses: this._customClauses,
                activeClausesList: activeClauses
            };
        },

        _updateLivePreview: function (tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress) {
            const previewEl = document.getElementById('contract-live-preview-box');
            if (!previewEl) return;

            const finalPropAddress = propAddress || this._currentOptions?.property?.address || this._currentOptions?.contract?.propertyAddress || 'Av. San Martín 1250, Mendoza';
            const activeClauses = this.buildActiveClauses(finalPropAddress);

            let clausesHtml = activeClauses.map((clause, idx) => {
                const ordinal = getOrdinalName(idx);
                const isSignatureClause = clause.tag.includes('FIRMA ELECTRÓNICA');
                return `
                    <div class="space-y-1 ${isSignatureClause ? 'border-t border-zinc-200 dark:border-zinc-800 pt-3 text-[10px] sm:text-[11px] text-zinc-500' : ''}">
                        <p class="text-justify leading-relaxed">
                            <strong class="text-zinc-900 dark:text-white font-bold">${ordinal} (${clause.tag}):</strong> ${clause.body}
                        </p>
                    </div>
                `;
            }).join('');

            previewEl.innerHTML = `
                <div class="border-b-2 border-primary pb-3 text-center mb-4 space-y-1.5">
                    <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary dark:text-red-300 text-[10px] font-black uppercase tracking-wider mb-1">
                        <span class="material-symbols-outlined text-xs">verified</span>
                        <span>Documento Oficial Certificado</span>
                    </div>
                    <p class="font-headline font-black text-xs sm:text-sm text-primary dark:text-red-400 tracking-wider uppercase">CONTRATO DE LOCACIÓN INMOBILIARIA CON FIRMA ELECTRÓNICA</p>
                    <p class="text-[9px] sm:text-[10px] text-zinc-500 font-sans">Identificador Oficial Hábitat: CTR-2026-OFICIAL • Conforme Ley Nacional N° 25.506 y DNU 70/2023</p>
                </div>

                <div class="p-3 sm:p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 mb-4 font-sans text-xs">
                    <p class="font-bold text-[10px] uppercase tracking-wider text-zinc-400">Partes Intervinientes Registradas</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                            <span class="font-bold text-zinc-900 dark:text-white block">EL LOCADOR (Propietario):</span>
                            <span class="text-zinc-600 dark:text-zinc-300">${ownerName}</span><br>
                            <span class="text-zinc-500 text-[10px]">DNI ${ownerDni} • CUIL ${ownerCuil} • ${ownerEmail}</span>
                        </div>
                        <div>
                            <span class="font-bold text-zinc-900 dark:text-white block">EL LOCATARIO (Inquilino):</span>
                            <span class="text-zinc-600 dark:text-zinc-300">${tenantName}</span><br>
                            <span class="text-zinc-500 text-[10px]">DNI ${tenantDni} • CUIL ${tenantCuil} • ${tenantEmail}</span>
                        </div>
                    </div>
                </div>

                <p class="text-justify leading-relaxed font-sans text-xs sm:text-[13px] text-zinc-700 dark:text-zinc-300 mb-3">
                    <strong>COMPARECENCIA Y CONVENIO:</strong> En la República Argentina, entre <strong>${ownerName}</strong> en adelante denominado <strong>"EL LOCADOR"</strong>; y por la otra <strong>${tenantName}</strong> en adelante denominado <strong>"EL LOCATARIO"</strong>, convienen en celebrar el presente contrato de locación sujeto a las siguientes cláusulas consecutivas:
                </p>

                <div class="space-y-3.5 pt-1 text-zinc-800 dark:text-zinc-200 font-sans text-xs sm:text-[13px]">
                    ${clausesHtml}
                </div>

                <div class="mt-6 pt-4 border-t-2 border-dashed border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center font-sans text-[10px]">
                    <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                        <div class="h-8 border-b border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400 italic">
                            [ Espacio para Firma Biométrica Didit KYC ]
                        </div>
                        <p class="font-bold text-zinc-800 dark:text-zinc-200 mt-1">LOCADOR: ${ownerName}</p>
                        <p class="text-zinc-500">DNI ${ownerDni}</p>
                    </div>
                    <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                        <div class="h-8 border-b border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400 italic">
                            [ Espacio para Firma Biométrica Didit KYC ]
                        </div>
                        <p class="font-bold text-zinc-800 dark:text-zinc-200 mt-1">LOCATARIO: ${tenantName}</p>
                        <p class="text-zinc-500">DNI ${tenantDni}</p>
                    </div>
                </div>

                <div class="mt-4 text-center text-[9px] text-zinc-400 font-sans">
                    Certificado criptográficamente con SHA-256 y sello de tiempo TSA RFC 3161 • Validez probatoria plena Arts. 286, 287 y 288 CCyCN
                </div>
            `;
        }
    };

    // Auto-disponible globalmente
    window.openContractEditorModal = function (options) {
        window.ContractEditorModal.open(options);
    };

})();
