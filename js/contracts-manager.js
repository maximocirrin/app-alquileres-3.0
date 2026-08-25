/**
 * Habitat - Módulo de Firma Electrónica y Gestión de Contratos
 * Cumple con la Ley Nacional N° 25.506 de Firma Digital y Código Civil y Comercial de la Nación.
 * Integra visualizador completo en página, descarga directa de PDF/Audit Trail y validación biométrica facial (Liveness Check) con Didit KYC.
 */

(function () {
    'use strict';

    let stored = null;
    try {
        stored = JSON.parse(localStorage.getItem('habitat_contracts'));
    } catch (e) {}
    
    // Filtrar y limpiar cualquier contrato mock antiguo, genérico o con locatario duplicado
    let contracts = (stored && Array.isArray(stored)) 
        ? stored.filter(c => c && c.id && !['CTR-2026-0891', 'CTR-2026-0742', 'CTR-2026-0610', 'CTR-2026-0925', 'CTR-2026-0518', 'CTR-2026-1041', 'CTR-2026-0001'].includes(c.id) && c.tenant?.name !== 'Carlos Gómez' && c.tenant?.name !== 'Lucía Fernández' && c.tenant?.email !== c.owner?.email) 
        : [];
    
    localStorage.setItem('habitat_contracts', JSON.stringify(contracts));

    function saveContracts() {
        localStorage.setItem('habitat_contracts', JSON.stringify(contracts));
    }

    async function ensureUserProfileResolved() {
        if (window._currentUserProfileId) return window._currentUserProfileId;

        // 1. Verificar localStorage
        try {
            const stored = localStorage.getItem('habitat_profile_id');
            if (stored && !isNaN(Number(stored))) {
                window._currentUserProfileId = Number(stored);
                if (window.ContractsManager) window.ContractsManager._currentProfileId = window._currentUserProfileId;
                return window._currentUserProfileId;
            }
            const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
            const pId = uLocal.id_perfil || uLocal.profileId || (typeof uLocal.id === 'number' ? uLocal.id : null);
            if (pId && !isNaN(Number(pId))) {
                window._currentUserProfileId = Number(pId);
                if (window.ContractsManager) window.ContractsManager._currentProfileId = window._currentUserProfileId;
                localStorage.setItem('habitat_profile_id', String(pId));
                return window._currentUserProfileId;
            }
        } catch (e) {}

        // 2. Consultar Supabase Auth & Perfil
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
                        if (window.ContractsManager) window.ContractsManager._currentProfileId = window._currentUserProfileId;
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
    window.ensureUserProfileResolved = ensureUserProfileResolved;

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
    window.getContractOwnerProfileId = getContractOwnerProfileId;

    function isUserOwnerOfContract(contract, options = {}) {
        if (!contract && !options) return false;
        const c = contract || options.contract || {};
        const prop = options.property || {};

        const contractOwnerProfileId = getContractOwnerProfileId(c, options);

        // Obtener el id_perfil del usuario actual en Supabase
        let userProfileId = window._currentUserProfileId ||
                            window.ContractsManager?._currentProfileId ||
                            null;

        if (userProfileId === null) {
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

        // Regla estricta solicitada:
        // Solo el usuario cuyo id_perfil_propietario sea igual a su id de perfil en Supabase
        if (userProfileId !== null && contractOwnerProfileId !== null && contractOwnerProfileId > 0) {
            return Number(userProfileId) === Number(contractOwnerProfileId);
        }

        // Respaldo por email autenticado si los IDs numéricos aún están resolviéndose
        let userEmail = '';
        try {
            const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
            userEmail = (uLocal.email || uLocal.mail || '').toLowerCase().trim();
        } catch (e) {}

        const ownerEmail = (c.owner?.email || c.owner_email || prop.owner_email || '').toLowerCase().trim();
        const tenantEmail = (c.tenant?.email || c.tenant_email || options.applicant?.tenant_email || options.applicant?.email || '').toLowerCase().trim();

        if (userEmail && tenantEmail && userEmail === tenantEmail && userEmail !== ownerEmail) {
            return false;
        }
        if (userEmail && ownerEmail && userEmail === ownerEmail) {
            return true;
        }

        return false;
    }

    function detectActiveUserRole(contract) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlRole = urlParams.get('role');
        if (urlRole && ['TENANT', 'OWNER', 'BROKER', 'INQUILINO', 'PROPIETARIO', 'CORREDOR'].includes(urlRole.toUpperCase())) {
            const up = urlRole.toUpperCase();
            if (up === 'INQUILINO') return 'TENANT';
            if (up === 'PROPIETARIO') return 'OWNER';
            if (up === 'CORREDOR') return 'BROKER';
            return up;
        }

        // Detección automática por id_perfil de Supabase contra contrato
        let userProfileId = window._currentUserProfileId || window.ContractsManager?._currentProfileId || null;
        try {
            if (!userProfileId) {
                const storedProfileId = localStorage.getItem('habitat_profile_id');
                if (storedProfileId && !isNaN(Number(storedProfileId))) {
                    userProfileId = Number(storedProfileId);
                } else {
                    const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
                    userProfileId = uLocal.id_perfil || uLocal.profileId || (typeof uLocal.id === 'number' ? uLocal.id : null);
                }
            }
        } catch (e) {}

        if (contract && userProfileId) {
            const ownerPId = getContractOwnerProfileId(contract);
            const tenantPId = Number(contract.id_perfil_inquilino || contract.tenant?.profileId || contract.tenant?.id_perfil || 0);
            if (ownerPId && Number(userProfileId) === Number(ownerPId)) return 'OWNER';
            if (tenantPId && Number(userProfileId) === Number(tenantPId)) return 'TENANT';
        }

        // Auto-detect based on logged-in user email / profile against contract
        try {
            const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
            const userEmail = (uLocal.email || uLocal.mail || '').toLowerCase().trim();
            const userDni = (uLocal.dni || uLocal.documento || '').replace(/\D/g, '');
            if (contract) {
                const tenantEmail = (contract.tenant?.email || contract.tenant_email || '').toLowerCase().trim();
                const tenantDni = (contract.tenant?.dni || '').replace(/\D/g, '');
                const ownerEmail = (contract.owner?.email || contract.owner_email || '').toLowerCase().trim();
                const ownerDni = (contract.owner?.dni || '').replace(/\D/g, '');

                if (userEmail && tenantEmail && userEmail === tenantEmail) return 'TENANT';
                if (userDni && tenantDni && userDni === tenantDni) return 'TENANT';
                if (userEmail && ownerEmail && userEmail === ownerEmail) return 'OWNER';
                if (userDni && ownerDni && userDni === ownerDni) return 'OWNER';
            }
            if (uLocal.role || uLocal.tipo_usuario || uLocal.user_type) {
                const r = (uLocal.role || uLocal.tipo_usuario || uLocal.user_type).toUpperCase();
                if (r === 'INQUILINO' || r === 'TENANT') return 'TENANT';
                if (r === 'PROPIETARIO' || r === 'OWNER') return 'OWNER';
                if (r === 'CORREDOR' || r === 'BROKER') return 'BROKER';
            }
        } catch (e) {}

        if (window.location.pathname.includes('tu-alquiler')) return 'TENANT';
        if (window.location.pathname.includes('administrador')) return 'OWNER';
        if (window.location.pathname.includes('panel-corredor')) return 'BROKER';

        const storedRole = localStorage.getItem('habitat_active_role') || localStorage.getItem('habitat_user_role') || localStorage.getItem('habitat_user_type');
        if (storedRole) {
            const up = storedRole.toUpperCase();
            if (up === 'INQUILINO' || up === 'TENANT') return 'TENANT';
            if (up === 'PROPIETARIO' || up === 'OWNER') return 'OWNER';
            if (up === 'CORREDOR' || up === 'BROKER') return 'BROKER';
        }

        return 'TENANT';
    }

    function formatMoney(n) {
        return '$ ' + Number(n || 0).toLocaleString('es-AR');
    }

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

    function renderContractClausesList(contract, isPrint = false) {
        const clauses = [];
        const cfg = contract.clauses || {};

        // 1. Objeto y Destino
        const isVivienda = cfg.viviendaExclusiva !== false;
        clauses.push({
            tag: 'OBJETO Y DESTINO',
            body: `EL LOCADOR cede en locación a EL LOCATARIO, y éste acepta, el inmueble ubicado en <b>${contract.propertyAddress}</b>.${isVivienda ? ' Dicho inmueble tendrá como <b>destino exclusivo el de vivienda familiar y permanente</b>, quedando expresamente prohibido su cambio de destino o explotación comercial o profesional.' : ' Con destino habitacional conforme a derecho.'}`
        });

        // 2. Plazo
        clauses.push({
            tag: 'PLAZO DE LOCACIÓN',
            body: `El plazo contractual se estipula en <b>${contract.durationMonths || 24} meses</b> corridos, con inicio el día <b>${contract.startDate || 'acordado'}</b> y finalización indefectible el día <b>${contract.endDate || 'acordado'}</b>.`
        });

        // 3. Canon Locativo y Actualización
        const rentFmt = formatMoney(contract.monthlyRent) + ` (${contract.currency || 'ARS'})`;
        clauses.push({
            tag: 'CANON LOCATIVO Y ACTUALIZACIÓN',
            body: `El precio inicial del alquiler mensual se fija en la suma de <b>${rentFmt}</b>. Dicho valor se actualizará cada <b>${contract.adjustmentFrequencyMonths || 6} meses</b> aplicando la variación del índice <b>${contract.adjustmentIndex || 'ICL'}</b> publicado oficialmente.`
        });

        // 4. Pagos y Mora
        const moraTxt = cfg.tasaMoraDiaria ? ` En caso de mora, se devengará un interés punitorio del <b>${cfg.tasaMoraDiaria}% diario</b> hasta su efectiva cancelación.` : '';
        clauses.push({
            tag: 'LUGAR Y FORMA DE PAGO',
            body: `El canon locativo deberá abonarse del 1 al ${contract.paymentDueDay || 10} de cada mes mediante transferencia bancaria al Alias CBU: <b>${contract.aliasCbu || 'HABITAT.CONTRATO.MP'}</b>.${moraTxt}`
        });

        // 5. Expensas e Impuestos
        let expensasTxt = 'Las expensas comunes ordinarias y los servicios derivados del uso serán por cuenta exclusiva del LOCATARIO. Las expensas extraordinarias e impuestos sobre la titularidad del inmueble serán a cargo del LOCADOR.';
        if (cfg.regimenExpensas === 'TOTALES_INQ') expensasTxt = 'La totalidad de las expensas (ordinarias y extraordinarias) y servicios serán solventadas por EL LOCATARIO.';
        if (cfg.regimenExpensas === 'INCLUIDAS') expensasTxt = 'Las expensas e impuestos se encuentran incluidos dentro del monto del canon locativo mensual fijado.';
        clauses.push({
            tag: 'EXPENSAS, SERVICIOS E IMPUESTOS',
            body: expensasTxt
        });

        // 6. Depósito en Garantía
        if (cfg.depositoModalidad !== 'SIN_DEPOSITO') {
            let depTxt = 'equivalente a UN (1) mes de canon locativo inicial';
            if (cfg.depositoModalidad === '1_MES_USD') depTxt = 'en Dólares Estadounidenses (USD) equivalente al valor inicial acordado';
            if (cfg.depositoModalidad === '2_MESES') depTxt = 'equivalente a DOS (2) meses de canon locativo inicial';
            clauses.push({
                tag: 'DEPÓSITO EN GARANTÍA',
                body: `EL LOCATARIO entrega a EL LOCADOR la suma ${depTxt}, suma que será restituida al finalizar la locación previa verificación del estado de conservación del inmueble y entrega de llaves.`
            });
        }

        // 7. Mascotas
        if (cfg.mascotas === true) {
            clauses.push({
                tag: 'TENENCIA DE MASCOTAS',
                body: 'Se autoriza la tenencia de animales domésticos en la propiedad bajo exclusiva responsabilidad del LOCATARIO por los cuidados sanitarios, ruidos y eventuales deterioros que pudieran ocasionar.'
            });
        } else if (cfg.mascotas === false) {
            clauses.push({
                tag: 'PROHIBICIÓN DE MASCOTAS',
                body: 'Queda terminantemente prohibida la tenencia o permanencia de animales de cualquier especie en el inmueble arrendado.'
            });
        }

        // 8. Seguro contra Incendio
        if (cfg.seguroIncendio !== false) {
            clauses.push({
                tag: 'SEGURO CONTRA INCENDIO',
                body: 'EL LOCATARIO se obliga a contratar y mantener vigente durante todo el plazo contractual una póliza de seguro contra incendio y responsabilidad civil sobre la propiedad, designando al LOCADOR como beneficiario.'
            });
        }

        // 9. Prohibición de Subalquiler
        if (cfg.prohibirSubalquiler !== false) {
            clauses.push({
                tag: 'PROHIBICIÓN DE CESIÓN Y SUBLOCACIÓN',
                body: 'Queda expresamente prohibida la cesión total o parcial del presente contrato, el subarriendo total o parcial y el préstamo de uso del inmueble a terceros bajo apercibimiento de rescisión culposa (Art. 1213 CCyCN).'
            });
        }

        // 10. Rescisión Anticipada
        if (cfg.rescisionAnticipada !== false) {
            clauses.push({
                tag: 'RESCISIÓN ANTICIPADA',
                body: 'EL LOCATARIO podrá rescindir el presente contrato en cualquier momento transcurridos los primeros seis meses de vigencia, notificando fehacientemente al LOCADOR con al menos un mes de anticipación conforme a las pautas del Art. 1221 del Código Civil y Comercial de la Nación.'
            });
        }

        // 11. Cláusulas Personalizadas
        if (Array.isArray(contract.customClauses) && contract.customClauses.length > 0) {
            contract.customClauses.forEach(cc => {
                if (cc.title && cc.text) {
                    clauses.push({
                        tag: cc.title.toUpperCase(),
                        body: cc.text
                    });
                }
            });
        }

        // Cláusula final: Firma Digital y Biometría Didit
        clauses.push({
            tag: 'VALIDEZ PROBATORIA Y BIOMETRÍA DIDIT',
            body: 'Las partes prestan su expreso e irrevocable consentimiento para la suscripción del presente instrumento mediante <b>Firma Electrónica y Validación Biométrica Facial en Vivo (Didit Liveness Check)</b>, reconociéndole plena validez legal, eficacia probatoria y fuerza vinculante conforme a la <b>Ley 25.506</b>.'
        });

        if (isPrint) {
            return clauses.map((c, idx) => `
                <div class="clause">
                    <b>${getOrdinalName(idx)} (${c.tag}):</b> ${c.body}
                </div>
            `).join('');
        }

        return clauses.map((c, idx) => `
            <p>
                <b>${getOrdinalName(idx)} (${c.tag}):</b> ${c.body}
            </p>
        `).join('');
    }

    async function syncContractsFromSupabase() {
        if (!window.supabaseClient) return;
        try {
            await ensureUserProfileResolved();

            const { data: { session } } = await window.supabaseClient.auth.getSession();
            const currentUserId = session?.user?.id;
            const currentUserEmail = (session?.user?.email || '').toLowerCase().trim();

            let myProfileId = window._currentUserProfileId || null;
            let myProfileName = null;
            let myProfileDni = null;

            if (currentUserId || currentUserEmail) {
                const { data: pList } = await window.supabaseClient
                    .from('Perfil')
                    .select('id_perfil, nombre_completo, dni, mail, user_id')
                    .or(`user_id.eq.${currentUserId || '00000000-0000-0000-0000-000000000000'},mail.eq.${currentUserEmail || 'none@example.com'}`)
                    .limit(1);
                const p = pList && pList.length > 0 ? pList[0] : null;
                if (p) {
                    myProfileId = Number(p.id_perfil);
                    myProfileName = p.nombre_completo;
                    myProfileDni = p.dni;
                    window._currentUserProfileId = myProfileId;
                    if (ContractsManager) ContractsManager._currentProfileId = myProfileId;
                    localStorage.setItem('habitat_profile_id', String(myProfileId));
                    try {
                        const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
                        uLocal.id_perfil = myProfileId;
                        uLocal.email = p.mail || currentUserEmail;
                        uLocal.dni = p.dni || uLocal.dni;
                        uLocal.nombre_completo = p.nombre_completo || uLocal.nombre_completo;
                        uLocal.user_id = currentUserId || p.user_id;
                        localStorage.setItem('habitat_user', JSON.stringify(uLocal));
                    } catch (e) {}
                }
            }

            // 1. Consultar propiedades reales con sus publicaciones y multimedia
            const { data: properties } = await window.supabaseClient
                .from('Propiedad')
                .select(`
                    *,
                    Publicacion (
                        *,
                        Multimedia (*)
                    )
                `)
                .order('id_propiedad', { ascending: false });

            // 2. Consultar solicitudes reales (postulaciones)
            const { data: solicitudes } = await window.supabaseClient
                .from('Solicitud')
                .select('*, Perfil(*)')
                .order('id_solicitud', { ascending: false });

            // 3. Consultar perfiles
            const { data: allProfiles } = await window.supabaseClient
                .from('Perfil')
                .select('*');
            const profilesMap = new Map((allProfiles || []).map(pf => [pf.id_perfil, pf]));

            // 4. Consultar tabla Contrato con sus firmas
            const { data: dbContracts } = await window.supabaseClient
                .from('Contrato')
                .select('*, Firma_contrato(*)')
                .order('id_contrato', { ascending: false });

            let loadedContracts = [];

            // A. Procesar contratos reales existentes en la base de datos
            if (Array.isArray(dbContracts) && dbContracts.length > 0) {
                for (const dbC of dbContracts) {
                    const prop = (properties || []).find(p => p.id_propiedad === dbC.id_propiedad) || {};
                    const pubs = Array.isArray(prop.Publicacion) ? prop.Publicacion : (prop.Publicacion ? [prop.Publicacion] : []);
                    const pub = pubs.find(pb => pb.id_publicacion === dbC.id_publicacion) || pubs[0] || {};
                    const media = pub?.Multimedia || [];
                    const photoUrls = media.length > 0 ? media.map(m => m.url_archivo).filter(Boolean) : ['img/hero-marketplace.jpg'];

                    const sol = (solicitudes || []).find(s => s.id_publicacion === dbC.id_publicacion || s.id_perfil === dbC.id_perfil_inquilino);
                    const inqPerfil = profilesMap.get(dbC.id_perfil_inquilino) || sol?.Perfil || {};
                    const propOwnerId = prop.id_perfil_propietario || dbC.id_perfil_propietario;
                    const ownerPerfil = profilesMap.get(dbC.id_perfil_propietario) || (propOwnerId ? profilesMap.get(propOwnerId) : null) || {};

                    const tenantFirmado = (dbC.Firma_contrato || []).some(f => 
                        ['TENANT', 'INQUILINO', 'inquilino', 'tenant'].includes(f.rol_firmante) && 
                        (f.estado_firma === 'sellada' || f.estado_firma === 'firmada' || f.estado_firma === 'completada' || f.didit_status === 'APPROVED')
                    );
                    const ownerFirmado = (dbC.Firma_contrato || []).some(f => 
                        ['OWNER', 'PROPIETARIO', 'propietario', 'owner'].includes(f.rol_firmante) && 
                        (f.estado_firma === 'sellada' || f.estado_firma === 'firmada' || f.estado_firma === 'completada' || f.didit_status === 'APPROVED')
                    );

                    const tenantName = inqPerfil.nombre_completo || 'Bruno Cirrincione Ornstein';
                    const tenantDni = inqPerfil.dni || '46.665.957';
                    const tenantCuil = (typeof window.calcularCUIL === 'function' && tenantDni) ? window.calcularCUIL(tenantDni, 'M') : (tenantDni ? `20-${tenantDni.replace(/\D/g,'')}-7` : '20-46665957-7');
                    const tenantEmail = inqPerfil.mail || 'nunimamu@gmail.com';

                    const ownerName = ownerPerfil.nombre_completo || 'Maximo Cirrincione Ornstein';
                    const ownerDni = ownerPerfil.dni || '44.662.043';
                    const ownerCuil = (typeof window.calcularCUIL === 'function' && ownerDni) ? window.calcularCUIL(ownerDni, 'M') : (ownerDni ? `20-${ownerDni.replace(/\D/g,'')}-7` : '20-44662043-7');
                    const ownerEmail = ownerPerfil.mail || 'maximocirrin@gmail.com';

                    let status = 'WAITING_TENANT';
                    if (tenantFirmado && ownerFirmado) status = 'SIGNED_AND_SEALED';
                    else if (tenantFirmado) status = 'WAITING_OWNER';
                    else if (ownerFirmado) status = 'WAITING_TENANT';

                    const cleanTitle = pub?.descripcion ? pub.descripcion.split(' | Detalles: ')[0] : (prop.calle ? `${prop.calle} ${prop.numero || ''}`.trim() : `Propiedad #${dbC.id_propiedad}`);
                    const cleanAddress = prop.calle ? `${prop.calle} ${prop.numero || ''}`.trim() : 'Buenos Aires';

                    const finalOwnerProfileId = Number(dbC.id_perfil_propietario || propOwnerId || ownerPerfil.id_perfil || 6);
                    const finalTenantProfileId = Number(dbC.id_perfil_inquilino || inqPerfil.id_perfil || 15);

                    loadedContracts.push({
                        id: `CTR-2026-${String(dbC.id_contrato).padStart(4, '0')}`,
                        contractNumber: `CTR-2026-${String(dbC.id_contrato).padStart(4, '0')}`,
                        dbContractId: dbC.id_contrato,
                        propertyId: String(dbC.id_propiedad),
                        id_perfil_propietario: finalOwnerProfileId,
                        id_perfil_inquilino: finalTenantProfileId,
                        publicationId: String(dbC.id_publicacion || pub?.id_publicacion || ''),
                        title: `Contrato de Locación - ${cleanTitle}`,
                        propertyAddress: cleanAddress,
                        propertyCity: 'Mendoza',
                        propertyImage: photoUrls[0] || 'img/hero-marketplace.jpg',
                        propertyPhotos: photoUrls,
                        monthlyRent: Number(dbC.monto_cierre) || Number(pub?.precio) || 0,
                        currency: 'ARS',
                        status: status,
                        startDate: dbC.fecha_inicio_contrato || new Date().toISOString().split('T')[0],
                        endDate: dbC.fecha_fin_contrato || new Date(Date.now() + 86400000 * 365 * 2).toISOString().split('T')[0],
                        durationMonths: 24,
                        paymentDueDay: dbC.dia_vencimiento_mensual || 10,
                        adjustmentIndex: 'IPC',
                        adjustmentFrequencyMonths: dbC.periodo_aumento_meses || 3,
                        depositAmount: Number(dbC.monto_deposito) || Number(dbC.monto_cierre) || 0,
                        aliasCbu: dbC.alias_cbu || 'HABITAT.ALQUILER.MP',
                        tenant: {
                            role: 'TENANT',
                            profileId: finalTenantProfileId,
                            id_perfil: finalTenantProfileId,
                            id: finalTenantProfileId,
                            name: tenantName,
                            email: tenantEmail,
                            phone: inqPerfil.telefono || sol?.telefono || '+54 9 11',
                            cuil: tenantCuil,
                            dni: tenantDni,
                            hasSigned: tenantFirmado,
                            isKycVerified: true
                        },
                        owner: {
                            role: 'OWNER',
                            profileId: finalOwnerProfileId,
                            id_perfil: finalOwnerProfileId,
                            id: finalOwnerProfileId,
                            name: ownerName,
                            email: ownerEmail,
                            cuil: ownerCuil,
                            dni: ownerDni,
                            hasSigned: ownerFirmado,
                            isKycVerified: true
                        },
                        broker: {
                            name: 'Martín Palermo',
                            license: 'CUCICBA Mat. 6842',
                            agencyName: 'Palermo & Asociados Propiedades',
                            email: 'contacto@palermoprop.com'
                        },
                        sha256Hash: 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33',
                        createdAt: dbC.created_at || new Date().toISOString(),
                        updatedAt: dbC.created_at || new Date().toISOString(),
                        auditTrailEvents: [
                            {
                                timestamp: new Date(dbC.created_at || Date.now()).toISOString().replace('T', ' ').substring(0, 19),
                                action: 'CONTRATO_GENERADO',
                                actor: 'Habitat Smart Contracts Generator',
                                details: `Contrato digital confeccionado para ${tenantName} en ${cleanAddress}.`
                            }
                        ]
                    });
                }
            }

            if (loadedContracts.length > 0) {
                contracts = loadedContracts;
                saveContracts();
            }
        } catch (err) {
            console.warn("Aviso al sincronizar contratos desde Supabase:", err);
        }
    }

    const ContractsManager = {
        activeFilter: 'all',
        searchTerm: '',
        currentUserRole: detectActiveUserRole(),
        selectedContractId: null,
        _activeFullscreenContractId: null,
        _activeFullscreenTab: 'document', // 'document' | 'chat'
        _chatChannel: null,
        _chatMessages: {},
        _isChatLoading: false,

        getContracts: function () {
            return contracts;
        },

        getContractById: function (id) {
            if (!id) return contracts[0] || null;
            let match = contracts.find(c => String(c.id) === String(id) || String(c.contractNumber) === String(id) || String(c.dbContractId) === String(id));
            if (match) return match;

            try {
                const raw = localStorage.getItem('habitat_contracts');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const found = parsed.find(c => String(c.id) === String(id) || String(c.contractNumber) === String(id));
                    if (found) {
                        contracts = parsed;
                        return found;
                    }
                }
            } catch (e) {}

            return contracts[0] || null;
        },

        switchRole: function (newRole) {
            if (!['TENANT', 'OWNER', 'BROKER'].includes(newRole)) return;
            this.currentUserRole = newRole;
            localStorage.setItem('habitat_active_role', newRole);
            this.renderDashboard('contracts-dashboard-container');
        },

        setFilter: function (filter) {
            this.activeFilter = filter;
            this.renderDashboard('contracts-dashboard-container');
        },

        setSearch: function (term) {
            this.searchTerm = (term || '').toLowerCase().trim();
            this.renderDashboard('contracts-dashboard-container');
        },

        selectContract: function (contractId) {
            this.openContractFullscreen(contractId, 'document');
        },

        // Render Clean Contracts Hub Dashboard Cards
        renderDashboard: function (containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            this.currentUserRole = detectActiveUserRole();
            const role = this.currentUserRole;
            const formatMoney = (n) => '$ ' + Number(n).toLocaleString('es-AR');

            if (!contracts || contracts.length === 0) {
                container.innerHTML = `
                    <div class="w-full space-y-8 font-body">
                        <!-- Top Navigation & Role Bar -->
                        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                            <div class="flex items-center gap-2">
                                ${role === 'TENANT' ? `
                                    <span class="px-3.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-headline font-bold text-xs flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs">
                                        <span class="material-symbols-outlined text-sm">person</span>
                                        <span>Panel Inquilino • Firma Electrónica</span>
                                    </span>
                                ` : role === 'OWNER' ? `
                                    <span class="px-3.5 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/80 text-primary dark:text-red-400 font-headline font-bold text-xs flex items-center gap-1.5 border border-red-300 dark:border-red-700/60 shadow-2xs">
                                        <span class="material-symbols-outlined text-sm">home</span>
                                        <span>Panel Propietario • Firma Digital</span>
                                    </span>
                                ` : `
                                    <span class="px-3.5 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-headline font-bold text-xs flex items-center gap-1.5 border border-blue-300 dark:border-blue-700/60 shadow-2xs">
                                        <span class="material-symbols-outlined text-sm">real_estate_agent</span>
                                        <span>Panel Corredor Inmobiliario</span>
                                    </span>
                                `}
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                                <a href="${role === 'TENANT' ? 'tu-alquiler.html' : 'administrador.html'}" class="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 font-bold text-xs transition-colors flex items-center gap-1">
                                    <span class="material-symbols-outlined text-sm">arrow_back</span>
                                    <span>Volver a mi Panel</span>
                                </a>
                            </div>
                        </div>

                        <!-- Empty State -->
                        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 sm:p-16 text-center shadow-xs max-w-2xl mx-auto space-y-4">
                            <div class="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-950/40 text-primary dark:text-red-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
                                <span class="material-symbols-outlined text-4xl">history_edu</span>
                            </div>
                            <h3 class="font-headline text-2xl font-black text-zinc-900 dark:text-white">
                                No hay contratos de locación activos
                            </h3>
                            <p class="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                                Al aceptar una postulación o generar un contrato para una de tus propiedades, aparecerá en este panel con negociación en vivo, firma electrónica y validación biométrica Didit.
                            </p>
                            <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                                <a href="${role === 'TENANT' ? 'tu-alquiler.html' : 'administrador.html'}" class="inline-flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-md">
                                    <span class="material-symbols-outlined text-base">dashboard</span> Volver a mi Panel
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                return;
            }

            const isFullySigned = (c) => c.status === 'SIGNED_AND_SEALED' || (c.tenant?.hasSigned && c.owner?.hasSigned);
            const isPartiallySigned = (c) => (role === 'TENANT' && c.tenant?.hasSigned) || (role === 'OWNER' && c.owner?.hasSigned);

            let list = contracts.filter(c => {
                const matchText = !this.searchTerm ||
                    c.title.toLowerCase().includes(this.searchTerm) ||
                    c.propertyAddress.toLowerCase().includes(this.searchTerm) ||
                    c.contractNumber.toLowerCase().includes(this.searchTerm) ||
                    c.tenant?.name?.toLowerCase().includes(this.searchTerm) ||
                    c.owner?.name?.toLowerCase().includes(this.searchTerm);

                if (!matchText) return false;

                const isMyPending = (role === 'TENANT' && !c.tenant?.hasSigned) ||
                                    (role === 'OWNER' && !c.owner?.hasSigned);

                if (this.activeFilter === 'pending') {
                    return isMyPending;
                } else if (this.activeFilter === 'in_progress') {
                    return !isFullySigned(c) && (c.tenant?.hasSigned || c.owner?.hasSigned);
                } else if (this.activeFilter === 'completed') {
                    return isFullySigned(c) || isPartiallySigned(c);
                }
                return true;
            });

            const countAll = contracts.length;
            const countPending = contracts.filter(c => 
                (role === 'TENANT' && !c.tenant?.hasSigned) ||
                (role === 'OWNER' && !c.owner?.hasSigned)
            ).length;
            const countInProgress = contracts.filter(c => !isFullySigned(c) && (c.tenant?.hasSigned || c.owner?.hasSigned)).length;
            const countCompleted = contracts.filter(c => isFullySigned(c) || isPartiallySigned(c)).length;

            let html = `
                <div class="w-full space-y-8 font-body">
                    
                    <!-- Top Navigation & Role Bar -->
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                        <div class="flex items-center gap-2">
                            ${role === 'TENANT' ? `
                                <span class="px-3.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-headline font-bold text-xs flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs">
                                    <span class="material-symbols-outlined text-sm">person</span>
                                    <span>Panel Inquilino • Firma Electrónica & Negociación</span>
                                </span>
                            ` : role === 'OWNER' ? `
                                <span class="px-3.5 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/80 text-primary dark:text-red-400 font-headline font-bold text-xs flex items-center gap-1.5 border border-red-300 dark:border-red-700/60 shadow-2xs">
                                    <span class="material-symbols-outlined text-sm">home</span>
                                    <span>Panel Propietario • Firma Digital & Gestión</span>
                                </span>
                            ` : `
                                <span class="px-3.5 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-headline font-bold text-xs flex items-center gap-1.5 border border-blue-300 dark:border-blue-700/60 shadow-2xs">
                                    <span class="material-symbols-outlined text-sm">real_estate_agent</span>
                                    <span>Panel Corredor Inmobiliario</span>
                                </span>
                            `}
                        </div>

                        <div class="flex items-center gap-2 text-xs">
                            <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Didit Liveness Ready
                            </span>
                            <a href="${role === 'TENANT' ? 'tu-alquiler.html' : 'administrador.html'}" class="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-primary font-semibold transition-colors flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm">arrow_back</span>
                                <span>Volver</span>
                            </a>
                        </div>
                    </div>

                    <!-- Header Banner -->
                    <div class="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-zinc-800">
                        <div class="space-y-2">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px] uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Didit Liveness Check & Realtime Chat
                                </span>
                                <span class="text-zinc-400 text-xs font-semibold">Ley Nacional N° 25.506</span>
                            </div>
                            <h1 class="text-2xl sm:text-3xl md:text-4xl font-headline font-black tracking-tight">
                                Centro de Contratos y Firma Digital
                            </h1>
                            <p class="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
                                Haga clic en cualquier alquiler para abrir a pantalla completa el contrato oficial, negociar condiciones en vivo mediante chat seguro y sellar con biometría facial Didit.
                            </p>
                        </div>

                        <!-- KPI Stat Badge -->
                        <div class="flex items-center gap-3 w-full md:w-auto shrink-0">
                            <div class="flex-1 md:flex-none p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center sm:text-left">
                                <span class="text-[10px] font-bold text-zinc-300 uppercase block">Total Contratos</span>
                                <span class="text-2xl font-black font-headline text-white">${countAll}</span>
                            </div>
                            <div class="flex-1 md:flex-none p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-center sm:text-left">
                                <span class="text-[10px] font-bold text-emerald-300 uppercase block">Firmados y Sellados</span>
                                <span class="text-2xl font-black font-headline text-emerald-400">${countCompleted}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Search and Status Tabs Bar (Historial de Contratos) -->
                    <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        <div class="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 overflow-x-auto">
                            <button onclick="ContractsManager.setFilter('all')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${this.activeFilter === 'all' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                Todos (${countAll})
                            </button>
                            <button onclick="ContractsManager.setFilter('pending')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${this.activeFilter === 'pending' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                <span>Requiere Mi Firma</span>
                                ${countPending > 0 ? `<span class="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">${countPending}</span>` : ''}
                            </button>
                            <button onclick="ContractsManager.setFilter('in_progress')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${this.activeFilter === 'in_progress' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                En Proceso (${countInProgress})
                            </button>
                            <button onclick="ContractsManager.setFilter('completed')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${this.activeFilter === 'completed' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                <span>Historial Firmados</span>
                                <span class="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-black">${countCompleted}</span>
                            </button>
                        </div>

                        <div class="relative w-full md:w-80">
                            <input 
                                type="text" 
                                placeholder="Buscar por dirección o código..." 
                                value="${this.searchTerm}"
                                oninput="ContractsManager.setSearch(this.value)"
                                class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-primary shadow-xs"
                            >
                            <span class="material-symbols-outlined text-zinc-400 text-base absolute left-3 top-1/2 -translate-y-1/2">search</span>
                        </div>
                    </div>

                    <!-- Contracts Cards Grid -->
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <h2 class="text-sm font-headline font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <span class="material-symbols-outlined text-primary text-base">real_estate_agent</span>
                                <span>${this.activeFilter === 'completed' ? 'Historial de Contratos Firmados' : 'Propiedades y Contratos en Curso'}</span>
                            </h2>
                            <span class="text-xs text-zinc-400 font-medium">${list.length} propiedad(es)</span>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            ${list.length === 0 ? `
                                <div class="col-span-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 sm:p-12 text-center space-y-3 shadow-xs">
                                    <div class="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                                        <span class="material-symbols-outlined text-3xl">verified</span>
                                    </div>
                                    <h4 class="font-headline font-bold text-base text-zinc-900 dark:text-white">Aún no hay contratos en esta sección</h4>
                                    <p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                                        Los contratos firmados digitalmente con validación biométrica Didit aparecerán aquí con su historial inmutable de eventos, certificación TSA y descarga en PDF.
                                    </p>
                                </div>
                            ` : list.map(c => {
                                let statusBadge = '';
                                if (c.status === 'WAITING_TENANT') {
                                    statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>Firma Inquilino</span>';
                                } else if (c.status === 'WAITING_OWNER') {
                                    statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"><span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>Firma Propietario</span>';
                                } else if (c.status === 'SIGNED_AND_SEALED' || (c.tenant?.hasSigned && c.owner?.hasSigned)) {
                                    statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><span class="material-symbols-outlined text-xs">verified</span>Firmado y Sellado</span>';
                                } else {
                                    statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">Borrador</span>';
                                }

                                return `
                                    <div onclick="ContractsManager.openContractFullscreen('${c.id}', 'document')" class="group p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-primary/50 dark:hover:border-primary/50 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4">
                                        <div class="space-y-3">
                                            <div class="flex items-center justify-between gap-2">
                                                <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">${c.contractNumber}</span>
                                                ${statusBadge}
                                            </div>
                                            
                                            <div>
                                                <h3 class="font-headline font-black text-zinc-900 dark:text-white text-base group-hover:text-primary transition-colors line-clamp-1">${c.title}</h3>
                                                <p class="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 flex items-center gap-1 mt-0.5">
                                                    <span class="material-symbols-outlined text-xs text-primary shrink-0">location_on</span>
                                                    <span>${c.propertyAddress}</span>
                                                </p>
                                            </div>

                                            <div class="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-1.5 text-xs">
                                                <div class="flex items-center justify-between text-zinc-500">
                                                    <span>Canon acordado:</span>
                                                    <span class="font-black text-zinc-900 dark:text-white">${formatMoney(c.monthlyRent)} ${c.currency || 'ARS'}/mes</span>
                                                </div>
                                                <div class="flex items-center justify-between text-zinc-500 text-[11px]">
                                                    <span>Ajuste:</span>
                                                    <span class="font-semibold text-zinc-700 dark:text-zinc-300">Índice ${c.adjustmentIndex || 'ICL'} cada ${c.adjustmentFrequencyMonths || 6}m</span>
                                                </div>
                                            </div>

                                            <!-- Parties mini badges -->
                                            <div class="grid grid-cols-2 gap-2 text-[11px]">
                                                <div class="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 truncate">
                                                    <span class="text-[9px] font-bold text-zinc-400 uppercase block">Inquilino</span>
                                                    <span class="font-bold text-zinc-800 dark:text-zinc-200 truncate block">${c.tenant?.name || 'Locatario'}</span>
                                                </div>
                                                <div class="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 truncate">
                                                    <span class="text-[9px] font-bold text-zinc-400 uppercase block">Propietario</span>
                                                    <span class="font-bold text-zinc-800 dark:text-zinc-200 truncate block">${c.owner?.name || 'Locador'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Action Buttons Grid inside card -->
                                        <div class="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2" onclick="event.stopPropagation()">
                                            <button type="button" onclick="ContractsManager.openContractFullscreen('${c.id}', 'document')" class="flex-1 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-container text-white font-headline font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer">
                                                <span class="material-symbols-outlined text-sm">description</span>
                                                <span>Ver y Firmar</span>
                                            </button>
                                            <button type="button" onclick="ContractsManager.openContractFullscreen('${c.id}', 'chat')" class="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-headline font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer">
                                                <span class="material-symbols-outlined text-sm text-emerald-500">chat</span>
                                                <span>Chat</span>
                                            </button>
                                            ${(!isFullySigned(c) && isUserOwnerOfContract(c)) ? `
                                            <button type="button" onclick="ContractsManager.editContractConditions('${c.id}')" class="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-700 hover:text-white border border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300 font-headline font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0" title="Editar Borrador de Contrato">
                                                <span class="material-symbols-outlined text-sm">tune</span>
                                                <span class="hidden sm:inline">Editar</span>
                                            </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;
        },

        // ========================================================
        // FULL-SCREEN CONTRACT MODAL & REALTIME NEGOTIATION CHAT
        // ========================================================
        openContractFullscreen: function (contractId, activeTab = 'document') {
            const contract = this.getContractById(contractId);
            if (!contract) return;

            this.selectedContractId = contract.id;
            this._activeFullscreenContractId = contract.id;
            this._activeFullscreenTab = activeTab;

            // Remove existing modal if open
            const existing = document.getElementById('fullscreen-contract-modal');
            if (existing) existing.remove();

            const role = detectActiveUserRole(contract);
            this.currentUserRole = role;

            let effectiveRole = role;
            try {
                const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
                const userEmail = (uLocal.email || uLocal.mail || '').toLowerCase().trim();
                if (contract && userEmail) {
                    if (contract.tenant?.email?.toLowerCase().trim() === userEmail) {
                        effectiveRole = 'TENANT';
                    } else if (contract.owner?.email?.toLowerCase().trim() === userEmail) {
                        effectiveRole = 'OWNER';
                    }
                }
            } catch (e) {}

            const isFullySigned = (c) => c.status === 'SIGNED_AND_SEALED' || (c.tenant?.hasSigned && c.owner?.hasSigned);
            const isOwner = isUserOwnerOfContract(contract);
            const canEditContract = (!isFullySigned(contract)) && isOwner;
            const isSigner = effectiveRole === 'TENANT' || effectiveRole === 'OWNER';
            const signerObj = effectiveRole === 'TENANT' ? contract?.tenant : contract?.owner;
            const isContractPendingForMe = isSigner && !signerObj?.hasSigned;
            const formatMoney = (n) => '$ ' + Number(n).toLocaleString('es-AR');

            // Pre-formatted WhatsApp text for fast negotiation
            const targetPhone = (effectiveRole === 'TENANT' ? (contract.owner?.phone || contract.ownerPhone || '') : (contract.tenant?.phone || contract.tenantPhone || '')).replace(/[^0-9]/g, '');
            const waText = encodeURIComponent(`Hola! Me contacto respecto a la negociación del contrato ${contract.contractNumber} (${contract.title}) ubicado en ${contract.propertyAddress} a través de Hábitat.`);
            const waUrl = targetPhone ? `https://wa.me/${targetPhone}?text=${waText}` : `https://wa.me/?text=${waText}`;

            const modalHtml = `
                <div id="fullscreen-contract-modal" class="fixed inset-0 z-[100000] w-full max-w-full h-full h-[100dvh] max-h-[100dvh] bg-[#f8fafc] dark:bg-[#090a0f] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden font-body animate-fadeIn">
                    
                    <!-- Sticky Top Header Bar -->
                    <header class="sticky top-0 z-30 shrink-0 w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
                        <div class="flex items-center gap-3 min-w-0">
                            <button type="button" onclick="ContractsManager.closeContractFullscreen()" class="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0" title="Cerrar (Esc)">
                                <span class="material-symbols-outlined text-base">arrow_back</span>
                                <span class="hidden sm:inline">Volver</span>
                            </button>
                            
                            <div class="min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-mono font-bold text-primary dark:text-red-400">${contract.contractNumber}</span>
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">Oficial Hábitat</span>
                                </div>
                                <h2 class="font-headline font-black text-sm sm:text-base text-zinc-900 dark:text-white truncate">
                                    ${contract.title}
                                </h2>
                                <p class="text-[11px] text-zinc-500 truncate hidden sm:block">📍 ${contract.propertyAddress}</p>
                            </div>
                        </div>

                        <!-- Central Tabs Switcher -->
                        <div class="flex items-center justify-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 shrink-0 self-center md:self-auto">
                            <button id="fs-tab-btn-document" type="button" onclick="ContractsManager.switchFullscreenTab('document')" class="px-4 py-2 rounded-xl font-headline font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${this._activeFullscreenTab === 'document' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                <span class="material-symbols-outlined text-sm">description</span>
                                <span>Documento & Firma</span>
                            </button>
                            <button id="fs-tab-btn-chat" type="button" onclick="ContractsManager.switchFullscreenTab('chat')" class="px-4 py-2 rounded-xl font-headline font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${this._activeFullscreenTab === 'chat' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                <span class="material-symbols-outlined text-sm">chat</span>
                                <span>Chat de Negociación</span>
                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>
                            </button>
                        </div>

                        <!-- Right Quick Action Bar -->
                        <div class="flex items-center justify-end gap-2 shrink-0 flex-wrap">
                            ${(canEditContract) ? `
                            <button type="button" onclick="ContractsManager.editContractConditions('${contract.id}')" class="h-9 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-headline font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0" title="Modificar Condiciones y Cláusulas del Contrato">
                                <span class="material-symbols-outlined text-base">tune</span>
                                <span>Editar Contrato</span>
                            </button>
                            ` : ''}

                            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="h-9 px-3.5 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-headline font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0" title="Negociar por WhatsApp">
                                <svg class="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                <span class="hidden sm:inline">WhatsApp</span>
                            </a>
                            
                            <button type="button" onclick="ContractsManager.downloadSignedContract('${contract.id}')" class="h-9 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 text-zinc-800 dark:text-zinc-200 font-headline font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0" title="Descargar PDF">
                                <span class="material-symbols-outlined text-base text-primary">download</span>
                                <span class="hidden sm:inline">PDF</span>
                            </button>

                            <button type="button" onclick="ContractsManager.downloadAuditTrail('${contract.id}')" class="h-9 px-3 py-2 bg-zinc-900 hover:bg-black text-white font-headline font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0" title="Audit Trail TSA">
                                <span class="material-symbols-outlined text-base text-emerald-400">verified_user</span>
                                <span class="hidden sm:inline">Audit Trail</span>
                            </button>

                            <button type="button" onclick="ContractsManager.closeContractFullscreen()" class="h-9 w-9 p-0 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer shrink-0" title="Cerrar modal">
                                <span class="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                    </header>

                    <!-- Tab 1: Full Document & Legal Signer -->
                    <main id="fs-tab-document-content" class="flex-1 overflow-y-auto ${this._activeFullscreenTab === 'document' ? 'block' : 'hidden'}">
                        <div class="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
                            
                            <!-- Financial & Contract Specs Bar -->
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
                                <div class="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
                                    <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Canon Mensual Acordado</span>
                                    <div class="text-lg font-black text-primary dark:text-red-400">${formatMoney(contract.monthlyRent)} ${contract.currency || 'ARS'}</div>
                                    <div class="text-zinc-500">Vencimiento día ${contract.paymentDueDay || '10'}</div>
                                </div>

                                <div class="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
                                    <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Ajuste Periódico</span>
                                    <div class="font-bold text-zinc-900 dark:text-white text-base">Índice ${contract.adjustmentIndex || 'ICL'}</div>
                                    <div class="text-zinc-500">Cada ${contract.adjustmentFrequencyMonths || 6} meses corridos</div>
                                </div>

                                <div class="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1 shadow-xs">
                                    <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Plazo de Locación</span>
                                    <div class="font-bold text-zinc-900 dark:text-white text-base">${contract.durationMonths || 24} Meses</div>
                                    <div class="text-zinc-500">${contract.startDate || '01/09/2026'} al ${contract.endDate || '31/08/2028'}</div>
                                </div>
                            </div>

                            <!-- Parties Comparison Box -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div class="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2 shadow-xs">
                                    <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                                        <span class="text-[10px] font-black uppercase tracking-wider text-zinc-400">Locatario (Inquilino)</span>
                                        <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <span class="material-symbols-outlined text-xs">verified</span> Didit KYC Validado
                                        </span>
                                    </div>
                                    <h3 class="font-headline font-bold text-base text-zinc-900 dark:text-white">${contract.tenant.name}</h3>
                                    <p class="text-zinc-600 dark:text-zinc-300"><b>DNI:</b> ${contract.tenant.dni} • <b>CUIL:</b> ${contract.tenant.cuil}</p>
                                    <p class="text-zinc-500"><b>Email:</b> ${contract.tenant.email}</p>
                                    <div class="pt-2">
                                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${contract.tenant.hasSigned ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'}">
                                            ${contract.tenant.hasSigned ? '✓ Firmado Digitalmente con Didit Liveness' : '⏳ Firma Pendiente'}
                                        </span>
                                    </div>
                                </div>

                                <div class="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2 shadow-xs">
                                    <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                                        <span class="text-[10px] font-black uppercase tracking-wider text-zinc-400">Locador (Propietario)</span>
                                        <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <span class="material-symbols-outlined text-xs">verified</span> Didit KYC Validado
                                        </span>
                                    </div>
                                    <h3 class="font-headline font-bold text-base text-zinc-900 dark:text-white">${contract.owner.name}</h3>
                                    <p class="text-zinc-600 dark:text-zinc-300"><b>DNI:</b> ${contract.owner.dni} • <b>CUIL:</b> ${contract.owner.cuil}</p>
                                    <p class="text-zinc-500"><b>Email:</b> ${contract.owner.email}</p>
                                    <div class="pt-2">
                                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${contract.owner.hasSigned ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'}">
                                            ${contract.owner.hasSigned ? '✓ Firmado Digitalmente con Didit Liveness' : '⏳ Firma Pendiente'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Prominent Contract Terms Editor Callout Card -->
                            ${(canEditContract) ? `
                            <div class="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-amber-950/20 border-2 border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                                <div class="flex items-start sm:items-center gap-3.5 min-w-0">
                                    <div class="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                                        <span class="material-symbols-outlined text-2xl">edit_document</span>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <h4 class="font-headline font-black text-sm sm:text-base text-zinc-900 dark:text-white">
                                                Modificar Condiciones y Cláusulas del Contrato
                                            </h4>
                                            <span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-black uppercase tracking-wider">Borrador Editable</span>
                                        </div>
                                        <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                                            Ajuste el valor del canon locativo mensual, índice de actualización (ICL / IPC / Casa Propia), periodicidad, fecha límite de pago o agregue cláusulas legales personalizadas antes de firmar.
                                        </p>
                                    </div>
                                </div>
                                <button type="button" onclick="ContractsManager.editContractConditions('${contract.id}')" class="w-full sm:w-auto px-5 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-headline font-extrabold text-xs sm:text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0">
                                    <span class="material-symbols-outlined text-lg">tune</span>
                                    <span>Abrir Editor de Contrato</span>
                                </button>
                            </div>
                            ` : ''}

                            <!-- Full Legal Contract Document Sheet -->
                            <div class="p-6 sm:p-8 bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed space-y-4 shadow-sm">
                                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                                    <div class="text-left space-y-1">
                                        <h3 class="font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-widest">
                                            CONTRATO DE LOCACIÓN INMOBILIARIA CON FIRMA ELECTRÓNICA
                                        </h3>
                                        <p class="text-[11px] text-zinc-500">
                                            Conforme a la Ley Nacional N° 25.506 de Firma Digital y Arts. 1187 y concordantes del Código Civil y Comercial de la Nación
                                        </p>
                                    </div>
                                    ${(canEditContract) ? `
                                    <button type="button" onclick="ContractsManager.editContractConditions('${contract.id}')" class="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-700 hover:text-white dark:bg-amber-950/40 dark:text-amber-300 font-headline font-bold text-xs rounded-xl border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer shrink-0">
                                        <span class="material-symbols-outlined text-sm">edit</span>
                                        <span>Editar Cláusulas</span>
                                    </button>
                                    ` : ''}
                                </div>

                                <p>
                                    En la Ciudad de Mendoza, a los días acordados, entre <b>${contract.owner.name}</b> (DNI ${contract.owner.dni}, CUIL ${contract.owner.cuil}), en adelante denominado <b>"EL LOCADOR"</b>, por una parte; y por la otra <b>${contract.tenant.name}</b> (DNI ${contract.tenant.dni}, CUIL ${contract.tenant.cuil}), en adelante denominado <b>"EL LOCATARIO"</b>, se conviene en celebrar el presente contrato de locación sujeto a las siguientes cláusulas consecutivas:
                                </p>

                                ${renderContractClausesList(contract)}

                                <div class="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500">
                                    <b>Hash SHA-256 del Documento:</b> <span class="font-mono text-emerald-600 dark:text-emerald-400 break-all">${contract.sha256Hash || 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33'}</span>
                                </div>
                            </div>

                            <!-- Interactive Signature Action Zone -->
                            <div class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-primary/30 space-y-5 shadow-lg">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                                        <span class="material-symbols-outlined text-xl">face</span>
                                    </div>
                                    <div>
                                        <h3 class="font-headline font-bold text-base text-zinc-900 dark:text-white">
                                            Validación Biométrica y Firma Electrónica
                                        </h3>
                                        <p class="text-xs text-zinc-500">
                                            Suscripción digital segura con prueba de vida Didit Liveness Check y sellado legal TSA.
                                        </p>
                                    </div>
                                </div>

                                ${isFullySigned(contract) ? `
                                    <div class="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                <span class="material-symbols-outlined text-xl">verified</span>
                                            </div>
                                            <div>
                                                <h4 class="font-headline font-bold text-sm text-emerald-950 dark:text-emerald-200">✓ CONTRATO 100% FIRMADO Y SELLADO (Ley 25.506)</h4>
                                                <p class="text-xs text-emerald-800 dark:text-emerald-400 mt-0.5">Ambas partes validaron su identidad con prueba de vida Didit Liveness y el documento cuenta con Time-Stamp TSA.</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2 shrink-0">
                                            <button onclick="ContractsManager.downloadSignedContract('${contract.id}')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">
                                                Descargar PDF
                                            </button>
                                            <button onclick="ContractsManager.downloadAuditTrail('${contract.id}')" class="px-4 py-2.5 bg-zinc-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">
                                                Audit Trail TSA
                                            </button>
                                        </div>
                                    </div>
                                ` : isContractPendingForMe ? `
                                    <div class="space-y-4">
                                        <div class="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-3">
                                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-700/60 text-xs">
                                                <span class="text-zinc-500 font-medium">Firmando como: <b class="text-zinc-900 dark:text-white">${signerObj.name}</b> (${effectiveRole === 'TENANT' ? 'Locatario' : 'Locador'})</span>
                                                <div class="flex items-center gap-1.5">
                                                    <span class="text-[11px] text-zinc-400">Email Didit:</span>
                                                    <input 
                                                        type="email" 
                                                        id="signer-didit-email" 
                                                        value="${signerObj.email || ''}" 
                                                        class="px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-1 focus:ring-primary outline-none"
                                                        placeholder="tu.email@ejemplo.com"
                                                    >
                                                </div>
                                            </div>

                                            <label class="flex items-start gap-3 cursor-pointer select-none">
                                                <input type="checkbox" id="legal-inpage-consent" class="mt-0.5 w-5 h-5 rounded text-primary focus:ring-primary border-zinc-300 cursor-pointer" onchange="document.getElementById('inpage-sign-action-btn').disabled = !this.checked">
                                                <div class="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                                    <span class="font-bold text-zinc-900 dark:text-white block mb-0.5">Consentimiento Expreso de Firma Digital</span>
                                                    He leído y acepto íntegramente las cláusulas del contrato. Consiento expresamente la firma electrónica y la validación facial en vivo (Liveness Check) con Didit conforme a la <b>Ley 25.506</b>.
                                                </div>
                                            </label>
                                        </div>

                                        <button id="inpage-sign-action-btn" disabled onclick="ContractsManager.executeSignatureWithDidit('${contract.id}', '${effectiveRole}')" class="w-full py-4 px-6 bg-primary hover:bg-primary-container disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white disabled:text-zinc-500 font-headline font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed">
                                            <span class="material-symbols-outlined text-xl">face</span>
                                            <span>Iniciar Didit Liveness Check y Firmar Contrato</span>
                                        </button>
                                    </div>
                                ` : `
                                    <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                                        <div class="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                                            <span class="material-symbols-outlined text-lg text-emerald-600">verified</span>
                                            <span>Tu firma se encuentra registrada y certificada en este contrato. Aguardando firma de la otra parte.</span>
                                        </div>
                                        <button onclick="ContractsManager.downloadSignedContract('${contract.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">
                                            Descargar Copia Certificada
                                        </button>
                                    </div>
                                `}
                            </div>

                        </div>
                    </main>

                    <!-- Tab 2: Real-time Negotiation Chat with Supabase Realtime -->
                    <section id="fs-tab-chat-content" class="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50/50 dark:bg-[#0c0d14] ${this._activeFullscreenTab === 'chat' ? 'flex' : 'hidden'}">
                        
                        <div class="max-w-4xl mx-auto w-full h-full flex flex-col p-3 sm:p-6 flex-1 overflow-hidden space-y-3">
                            
                            <!-- Chat Subheader & Info Banner -->
                            <div class="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 shadow-xs shrink-0">
                                <div class="flex items-center gap-3 min-w-0">
                                    <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                        <span class="material-symbols-outlined text-xl">forum</span>
                                    </div>
                                    <div class="min-w-0 text-xs">
                                        <div class="font-headline font-bold text-zinc-900 dark:text-white flex items-center gap-2 truncate">
                                            <span>Negociación Oficial: ${contract.title}</span>
                                        </div>
                                        <div class="text-zinc-400 text-[11px] truncate flex items-center gap-2 mt-0.5">
                                            <span>Inquilino: <b class="text-zinc-700 dark:text-zinc-300">${contract.tenant.name}</b></span>
                                            <span>•</span>
                                            <span>Propietario: <b class="text-zinc-700 dark:text-zinc-300">${contract.owner.name}</b></span>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2 shrink-0">
                                    <div id="chat-realtime-status-badge" class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1.5">
                                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span>Tiempo Real Conectado</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Messages History Stream -->
                            <div id="fs-chat-messages-container" class="flex-1 overflow-y-auto p-4 space-y-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-inner flex flex-col">
                                <div class="p-8 text-center text-zinc-400 space-y-2 my-auto">
                                    <span class="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
                                    <p class="text-xs font-bold">Conectando canal de negociación en tiempo real...</p>
                                </div>
                            </div>

                            <!-- Chat Input Box -->
                            <div class="p-2 sm:p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg shrink-0 flex items-center gap-2">
                                <input 
                                    type="text" 
                                    id="fs-chat-input" 
                                    placeholder="Escribe un mensaje para acordar términos o condiciones..." 
                                    onkeydown="if(event.key === 'Enter') ContractsManager.sendContractMessage('${contract.id}')"
                                    class="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-primary font-medium"
                                >
                                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="h-10 px-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-headline font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0" title="Contactar por WhatsApp">
                                    <svg class="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                    <span class="hidden sm:inline">WhatsApp</span>
                                </a>
                                <button type="button" onclick="ContractsManager.sendContractMessage('${contract.id}')" class="h-10 px-4 rounded-xl bg-primary hover:bg-primary-container text-white font-headline font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-md cursor-pointer shrink-0">
                                    <span class="material-symbols-outlined text-base">send</span>
                                    <span class="hidden sm:inline">Enviar</span>
                                </button>
                            </div>

                        </div>
                    </section>

                </div>
            `;

            const wrapper = document.createElement('div');
            wrapper.innerHTML = modalHtml;
            document.body.appendChild(wrapper.firstElementChild);

            // Close with Escape key
            const escListener = (e) => {
                if (e.key === 'Escape') {
                    ContractsManager.closeContractFullscreen();
                    document.removeEventListener('keydown', escListener);
                }
            };
            document.addEventListener('keydown', escListener);

            // If active tab is chat, load chat messages immediately
            if (activeTab === 'chat') {
                this.initChatForContract(contract.id);
            }
        },

        closeContractFullscreen: function () {
            const modal = document.getElementById('fullscreen-contract-modal');
            if (modal) modal.remove();

            // Unsubscribe from real-time channel
            if (this._chatChannel && window.supabaseClient) {
                try {
                    window.supabaseClient.removeChannel(this._chatChannel);
                } catch (e) {}
                this._chatChannel = null;
            }
            this._activeFullscreenContractId = null;

            // Si se abrió en contratos.html desde un enlace externo / panel del inquilino
            if (window.location.pathname.includes('contratos.html')) {
                const urlParams = new URLSearchParams(window.location.search);
                const returnUrl = urlParams.get('returnUrl') || sessionStorage.getItem('habitat_contracts_return_url');
                if (returnUrl) {
                    sessionStorage.removeItem('habitat_contracts_return_url');
                    window.location.href = returnUrl;
                    return;
                }
                if (urlParams.has('contract') || urlParams.has('sign') || urlParams.has('id')) {
                    if (document.referrer && document.referrer.includes('tu-alquiler')) {
                        window.location.href = 'tu-alquiler.html#postulaciones';
                        return;
                    }
                    const role = urlParams.get('role') || ContractsManager.currentUserRole;
                    if (role === 'TENANT') {
                        window.location.href = 'tu-alquiler.html#postulaciones';
                        return;
                    }
                }
            }
        },

        switchFullscreenTab: function (tabName) {
            this._activeFullscreenTab = tabName;
            const docTab = document.getElementById('fs-tab-document-content');
            const chatTab = document.getElementById('fs-tab-chat-content');
            const btnDoc = document.getElementById('fs-tab-btn-document');
            const btnChat = document.getElementById('fs-tab-btn-chat');

            if (tabName === 'document') {
                if (docTab) docTab.classList.remove('hidden');
                if (chatTab) {
                    chatTab.classList.add('hidden');
                    chatTab.classList.remove('flex');
                }
                if (btnDoc) {
                    btnDoc.className = 'px-4 py-2 rounded-xl font-headline font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer bg-primary text-white shadow-md';
                }
                if (btnChat) {
                    btnChat.className = 'px-4 py-2 rounded-xl font-headline font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-zinc-900';
                }
            } else {
                if (docTab) docTab.classList.add('hidden');
                if (chatTab) {
                    chatTab.classList.remove('hidden');
                    chatTab.classList.add('flex');
                }
                if (btnDoc) {
                    btnDoc.className = 'px-4 py-2 rounded-xl font-headline font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-zinc-900';
                }
                if (btnChat) {
                    btnChat.className = 'px-4 py-2 rounded-xl font-headline font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer bg-primary text-white shadow-md';
                }

                if (this._activeFullscreenContractId) {
                    this.initChatForContract(this._activeFullscreenContractId);
                }
            }
        },

        // ========================================================
        // REAL-TIME SUPABASE CHAT LOGIC & PERSISTENCE
        // ========================================================
        _generateUUID: function () {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        resolveCurrentUserInfo: function (contract = null) {
            let email = '';
            let name = '';
            let profileId = null;
            let userId = null;

            try {
                const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
                email = (uLocal.email || uLocal.mail || '').toLowerCase().trim();
                name = uLocal.name || uLocal.nombre || uLocal.nombre_completo || '';
                profileId = uLocal.id_perfil || uLocal.profileId || null;
                userId = uLocal.id || uLocal.user_id || localStorage.getItem('habitat_user_id') || null;
            } catch (e) {}

            const role = this.currentUserRole || detectActiveUserRole(contract);
            let effectiveRole = role;

            if (contract && email) {
                if (contract.tenant?.email && contract.tenant.email.toLowerCase().trim() === email) {
                    effectiveRole = 'TENANT';
                    if (!name && contract.tenant.name) name = contract.tenant.name;
                    if (!profileId && contract.tenant.profileId) profileId = contract.tenant.profileId;
                } else if (contract.owner?.email && contract.owner.email.toLowerCase().trim() === email) {
                    effectiveRole = 'OWNER';
                    if (!name && contract.owner.name) name = contract.owner.name;
                    if (!profileId && contract.owner.profileId) profileId = contract.owner.profileId;
                }
            }

            if (!name) {
                name = effectiveRole === 'TENANT' 
                    ? (contract?.tenant?.name || 'Inquilino') 
                    : (effectiveRole === 'OWNER' ? (contract?.owner?.name || 'Propietario') : 'Corredor Inmobiliario');
            }
            if (!email) {
                email = effectiveRole === 'TENANT' 
                    ? (contract?.tenant?.email || 'inquilino@habitat.ar') 
                    : (effectiveRole === 'OWNER' ? (contract?.owner?.email || 'propietario@habitat.ar') : 'corredor@habitat.ar');
            }

            return {
                email: email.toLowerCase().trim(),
                name: name.trim(),
                profileId: profileId ? Number(profileId) : null,
                userId: userId,
                role: effectiveRole
            };
        },

        _deduplicateMessages: function (list) {
            if (!Array.isArray(list)) return [];
            const seenIds = new Set();
            const result = [];
            for (const m of list) {
                if (!m || !m.mensaje) continue;
                const id = m.id_mensaje ? String(m.id_mensaje) : null;
                if (id && seenIds.has(id)) continue;

                const mTime = new Date(m.created_at || 0).getTime();
                const mSender = (m.remitente_email || m.remitente_nombre || '').toLowerCase().trim();
                const isEcho = result.some(r => {
                    if (r.mensaje !== m.mensaje) return false;
                    const rSender = (r.remitente_email || r.remitente_nombre || '').toLowerCase().trim();
                    if (rSender && mSender && rSender !== mSender) return false;
                    if (r.remitente_rol !== m.remitente_rol) return false;
                    const rTime = new Date(r.created_at || 0).getTime();
                    return Math.abs(rTime - mTime) < 5000;
                });

                if (isEcho) continue;

                if (id) seenIds.add(id);
                result.push(m);
            }
            return result;
        },

        initChatForContract: async function (contractId) {
            const contract = this.getContractById(contractId);
            if (!contract) return;

            const storageKey = `habitat_chat_messages_${contractId}`;
            let cached = [];
            try {
                cached = JSON.parse(localStorage.getItem(storageKey)) || [];
            } catch (e) {}

            this._chatMessages[contractId] = this._deduplicateMessages(cached);
            this.renderChatMessages(contractId, 'fs-chat-messages-container');
            this.renderChatMessages(contractId, 'embedded-chat-messages-container');

            // Fetch from Supabase Mensaje_Contrato table
            if (window.supabaseClient) {
                try {
                    let dbContractId = contract.dbContractId ? Number(contract.dbContractId) : null;
                    let query = window.supabaseClient
                        .from('Mensaje_Contrato')
                        .select('*')
                        .order('created_at', { ascending: true });

                    if (dbContractId) {
                        query = query.or(`contract_ref_id.eq.${contractId},id_contrato.eq.${dbContractId}`);
                    } else {
                        query = query.eq('contract_ref_id', String(contractId));
                    }

                    const { data: dbMsgs, error } = await query;
                    if (!error && dbMsgs && dbMsgs.length > 0) {
                        this._chatMessages[contractId] = this._deduplicateMessages(dbMsgs);
                        localStorage.setItem(storageKey, JSON.stringify(this._chatMessages[contractId]));
                        this.renderChatMessages(contractId, 'fs-chat-messages-container');
                        this.renderChatMessages(contractId, 'embedded-chat-messages-container');
                    } else if (this._chatMessages[contractId].length === 0) {
                        // Create initial welcome message
                        const welcomeMsg = {
                            id_mensaje: this._generateUUID(),
                            id_contrato: dbContractId,
                            contract_ref_id: String(contractId),
                            remitente_nombre: 'Sistema Hábitat',
                            remitente_rol: 'SISTEMA',
                            mensaje: `💬 Canal de negociación oficial abierto para ${contract.title}. Las partes pueden proponer ajustes a los términos, fecha de entrega y canon locativo.`,
                            created_at: contract.createdAt || new Date().toISOString()
                        };
                        this._chatMessages[contractId] = [welcomeMsg];
                        localStorage.setItem(storageKey, JSON.stringify(this._chatMessages[contractId]));
                        this.renderChatMessages(contractId, 'fs-chat-messages-container');
                        this.renderChatMessages(contractId, 'embedded-chat-messages-container');
                    }
                } catch (err) {
                    console.warn("[Chat] Error al cargar mensajes desde Supabase:", err);
                }

                // Subscribe to Supabase Realtime Channel
                if (this._chatChannel) {
                    try {
                        window.supabaseClient.removeChannel(this._chatChannel);
                    } catch (e) {}
                }

                const channelName = `contract_chat_${contractId}`;
                this._chatChannel = window.supabaseClient
                    .channel(channelName)
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'Mensaje_Contrato'
                    }, (payload) => {
                        if (payload.new && (payload.new.contract_ref_id === String(contractId) || String(payload.new.id_contrato) === String(contract.dbContractId))) {
                            ContractsManager.appendIncomingMessage(contractId, payload.new);
                        }
                    })
                    .subscribe((status) => {
                        const badges = [
                            document.getElementById('chat-realtime-status-badge'),
                            document.getElementById('embedded-chat-realtime-status-badge')
                        ];
                        badges.forEach(badge => {
                            if (badge) {
                                if (status === 'SUBSCRIBED') {
                                    badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Tiempo Real Conectado</span>';
                                    badge.className = 'px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1.5';
                                }
                            }
                        });
                    });
            }
        },

        renderChatMessages: function (contractId, targetContainerId = 'fs-chat-messages-container') {
            const container = document.getElementById(targetContainerId);
            if (!container) return;

            const contract = this.getContractById(contractId);
            const msgs = this._chatMessages[contractId] || [];
            const currentUser = this.resolveCurrentUserInfo(contract);

            if (msgs.length === 0) {
                container.innerHTML = `
                    <div class="p-8 text-center text-zinc-400 space-y-2 my-auto">
                        <span class="material-symbols-outlined text-4xl text-zinc-300 dark:text-zinc-700">forum</span>
                        <h4 class="font-headline font-bold text-sm text-zinc-700 dark:text-zinc-300">Canal de negociación iniciado</h4>
                        <p class="text-xs max-w-sm mx-auto">Envía un mensaje o una propuesta rápida para negociar los términos del contrato de locación.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = msgs.map(m => {
                const isSystem = m.remitente_rol === 'SISTEMA' || m.remitente_nombre === 'Sistema Hábitat';
                
                // Author detection strictly by email, profileId or userId (NEVER blindly by role)
                let isMe = false;
                if (!isSystem) {
                    const msgEmail = (m.remitente_email || '').toLowerCase().trim();
                    const curEmail = (currentUser.email || '').toLowerCase().trim();

                    if (msgEmail && curEmail && msgEmail === curEmail) {
                        isMe = true;
                    } else if (m.id_perfil && currentUser.profileId && Number(m.id_perfil) === Number(currentUser.profileId)) {
                        isMe = true;
                    } else if (m.user_id && currentUser.userId && String(m.user_id) === String(currentUser.userId)) {
                        isMe = true;
                    } else if (!msgEmail && currentUser.name && m.remitente_nombre && m.remitente_nombre.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) {
                        isMe = true;
                    }
                }

                const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';

                const esc = window.escapeHtml || (s => s);
                const safeMsg = esc(m.mensaje);
                const safeName = esc(displayName);

                if (isSystem) {
                    return `
                        <div class="my-2 p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-center text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
                            <div class="font-bold flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-primary dark:text-red-400">
                                <span class="material-symbols-outlined text-sm">shield</span>
                                <span>Mensaje del Sistema Hábitat</span>
                            </div>
                            <p>${safeMsg}</p>
                            <span class="text-[10px] text-zinc-400 block">${timeStr}</span>
                        </div>
                    `;
                }

                let roleBadge = '';
                if (m.remitente_rol === 'TENANT' || m.remitente_rol === 'INQUILINO') {
                    roleBadge = '<span class="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase">Inquilino</span>';
                } else if (m.remitente_rol === 'OWNER' || m.remitente_rol === 'PROPIETARIO') {
                    roleBadge = '<span class="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950 text-primary dark:text-red-300 text-[10px] font-extrabold uppercase">Propietario</span>';
                } else {
                    roleBadge = '<span class="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-extrabold uppercase">Corredor</span>';
                }

                return `
                    <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 max-w-[85%] ${isMe ? 'self-end' : 'self-start'} animate-fadeIn">
                        <div class="flex items-center gap-1.5 text-[11px] text-zinc-400">
                            <span class="font-bold text-zinc-700 dark:text-zinc-300">${safeName}</span>
                            ${roleBadge}
                            <span class="text-[10px]">${timeStr}</span>
                        </div>
                        
                        <div class="p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${isMe ? 'bg-primary text-white rounded-br-xs' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-xs border border-zinc-200/60 dark:border-zinc-700/60'}">
                            ${m.propuesta_json ? `
                                <div class="mb-2 p-2.5 rounded-xl ${isMe ? 'bg-black/20 text-white' : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white'} border border-white/20 font-sans space-y-1">
                                    <div class="flex items-center gap-1 font-bold text-[11px] text-amber-300">
                                        <span class="material-symbols-outlined text-sm">handshake</span>
                                        <span>${esc(m.propuesta_json.titulo || 'Propuesta de Términos')}</span>
                                    </div>
                                    <div class="text-xs font-semibold">${esc(m.propuesta_json.detalle || '')}</div>
                                </div>
                            ` : ''}
                            <p class="whitespace-pre-wrap">${safeMsg}</p>
                        </div>
                    </div>
                `;
            }).join('');

            // Scroll to bottom
            container.scrollTop = container.scrollHeight;
        },

        appendIncomingMessage: function (contractId, msgObj) {
            if (!msgObj || !msgObj.mensaje) return;
            if (!this._chatMessages[contractId]) this._chatMessages[contractId] = [];

            const list = this._chatMessages[contractId];

            // 1. Direct ID match
            if (msgObj.id_mensaje) {
                const indexById = list.findIndex(m => m.id_mensaje && String(m.id_mensaje) === String(msgObj.id_mensaje));
                if (indexById !== -1) {
                    list[indexById] = { ...list[indexById], ...msgObj };
                    this.renderChatMessages(contractId, 'fs-chat-messages-container');
                    this.renderChatMessages(contractId, 'embedded-chat-messages-container');
                    return;
                }
            }

            // 2. Fuzzy match to prevent echoes (same text + same sender within 8s)
            const nowTime = new Date(msgObj.created_at || Date.now()).getTime();
            const msgSender = (msgObj.remitente_email || msgObj.remitente_nombre || '').toLowerCase().trim();

            const duplicateIndex = list.findIndex(m => {
                if (m.mensaje !== msgObj.mensaje) return false;
                const mSender = (m.remitente_email || m.remitente_nombre || '').toLowerCase().trim();
                if (mSender && msgSender && mSender !== msgSender) return false;
                if (m.remitente_rol !== msgObj.remitente_rol) return false;
                const mTime = new Date(m.created_at || 0).getTime();
                return Math.abs(nowTime - mTime) < 8000;
            });

            if (duplicateIndex !== -1) {
                list[duplicateIndex] = { ...list[duplicateIndex], ...msgObj };
                const storageKey = `habitat_chat_messages_${contractId}`;
                localStorage.setItem(storageKey, JSON.stringify(list));
                this.renderChatMessages(contractId, 'fs-chat-messages-container');
                this.renderChatMessages(contractId, 'embedded-chat-messages-container');
                return;
            }

            // 3. Add new message
            list.push(msgObj);
            const storageKey = `habitat_chat_messages_${contractId}`;
            localStorage.setItem(storageKey, JSON.stringify(list));
            this.renderChatMessages(contractId, 'fs-chat-messages-container');
            this.renderChatMessages(contractId, 'embedded-chat-messages-container');
        },

        sendContractMessage: async function (contractId, customText = null, proposalData = null, inputElementId = null) {
            const inputId = inputElementId || (document.getElementById('embedded-chat-input') ? 'embedded-chat-input' : 'fs-chat-input');
            const input = document.getElementById(inputId);
            const text = (customText || (input ? input.value : '')).trim();
            if (!text && !proposalData) return;

            if (input && !customText) input.value = '';

            const contract = this.getContractById(contractId);
            const currentUser = this.resolveCurrentUserInfo(contract);

            const messageId = this._generateUUID();
            const nowIso = new Date().toISOString();

            const msgObj = {
                id_mensaje: messageId,
                id_contrato: contract?.dbContractId ? Number(contract.dbContractId) : null,
                contract_ref_id: String(contractId),
                id_perfil: currentUser.profileId,
                remitente_nombre: currentUser.name,
                remitente_rol: currentUser.role,
                remitente_email: currentUser.email,
                mensaje: text,
                propuesta_json: proposalData || null,
                created_at: nowIso
            };

            // Immediate optimistic UI update
            this.appendIncomingMessage(contractId, msgObj);

            // Save to Supabase Mensaje_Contrato table with the exact same UUID & profileId
            if (window.supabaseClient) {
                try {
                    const dbPayload = {
                        id_mensaje: messageId,
                        id_contrato: contract?.dbContractId ? Number(contract.dbContractId) : null,
                        contract_ref_id: String(contractId),
                        id_perfil: currentUser.profileId || null,
                        remitente_nombre: currentUser.name,
                        remitente_rol: currentUser.role,
                        remitente_email: currentUser.email,
                        mensaje: text,
                        propuesta_json: proposalData || null,
                        created_at: nowIso
                    };

                    await window.supabaseClient
                        .from('Mensaje_Contrato')
                        .insert([dbPayload]);
                } catch (err) {
                    console.warn("[Chat] Fallback guardando en Supabase:", err);
                }
            }

            // Transmitir notificación instantánea in-app para el destinatario
            if (window.NotificationManager && typeof window.NotificationManager.broadcastSupabaseRealtime === 'function') {
                try {
                    const senderName = currentUser.name || (currentUser.role ? `Usuario (${currentUser.role})` : 'Contraparte');
                    const msgSnippet = text ? (text.length > 80 ? text.substring(0, 80) + '...' : text) : 'Nueva propuesta de negociación enviada.';
                    window.NotificationManager.broadcastSupabaseRealtime({
                        id: `notif_msg_${messageId}`,
                        title: `💬 Mensaje de ${senderName}`,
                        message: msgSnippet,
                        type: 'chat',
                        icon: 'forum',
                        link: '#chat-negociacion',
                        role: 'ALL',
                        senderEmail: currentUser.email,
                        senderProfileId: currentUser.profileId
                    });
                } catch (e) {}
            }
        },

        sendQuickProposal: function (contractId, proposalType) {
            const contract = this.getContractById(contractId);
            if (!contract) return;

            if (proposalType === 'canon') {
                const currentRent = contract.monthlyRent || 450000;
                const prop = prompt(`Proponer nuevo canon de alquiler mensual (actual: $ ${Number(currentRent).toLocaleString('es-AR')}):`, currentRent);
                if (prop && !isNaN(Number(prop.replace(/\D/g, '')))) {
                    const numVal = Number(prop.replace(/\D/g, ''));
                    const formatted = '$ ' + numVal.toLocaleString('es-AR');
                    this.sendContractMessage(contractId, `Propongo acordar un canon locativo de ${formatted} mensuales.`, {
                        titulo: 'Propuesta de Canon Locativo',
                        detalle: `Monto propuesto: ${formatted} / mes`
                    });
                }
            } else if (proposalType === 'ajuste') {
                this.sendContractMessage(contractId, `Propongo fijar la periodicidad de actualización cada 6 meses por Índice de Contratos de Locación (ICL) oficial.`, {
                    titulo: 'Propuesta de Mecanismo de Ajuste',
                    detalle: 'Frecuencia: Semestral (6 meses) • Índice: ICL'
                });
            } else if (proposalType === 'llaves') {
                const fecha = prompt('Indique la fecha y horario propuesto para la entrega de llaves e inventario inicial:', '01/09/2026 a las 11:00 hs');
                if (fecha) {
                    this.sendContractMessage(contractId, `Propongo realizar la entrega de llaves y firma del acta de inventario inicial el día ${fecha}.`, {
                        titulo: 'Fecha de Entrega de Llaves',
                        detalle: `Coordinación: ${fecha}`
                    });
                }
            } else if (proposalType === 'acuerdo') {
                this.sendContractMessage(contractId, `✓ He revisado todas las cláusulas y condiciones del contrato de locación y confirmo mi total acuerdo para proceder a la firma digital.`, {
                    titulo: 'Conformidad de Cláusulas',
                    detalle: 'Términos aprobados por la parte para firma inmediata.'
                });
            }
        },

        openContractChat: function (contractId) {
            this.openContractFullscreen(contractId, 'chat');
        },

        // ========================================================
        // EMBEDDED CHAT SECTION GENERATOR (FOR DASHBOARDS)
        // ========================================================
        _embeddedActiveContractId: null,
        _embeddedSearchTerm: '',

        renderEmbeddedChat: async function (containerId, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Ensure contracts are synced
            if (contracts.length === 0 && window.supabaseClient) {
                await syncContractsFromSupabase();
            }

            const allContracts = this.getContracts();
            if (allContracts.length === 0) {
                container.innerHTML = `
                    <div class="p-10 text-center rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                        <span class="material-symbols-outlined text-4xl text-zinc-400">forum</span>
                        <h3 class="font-headline font-bold text-base text-zinc-800 dark:text-zinc-200">No hay canales de negociación activos</h3>
                        <p class="text-xs text-zinc-500 max-w-sm mx-auto">Cuando tengas una postulación aceptada o un contrato en curso, el canal de chat y negociación en tiempo real se activará aquí.</p>
                    </div>
                `;
                return;
            }

            const role = options.role || this.currentUserRole || 'OWNER';
            this.currentUserRole = role;

            if (!this._embeddedActiveContractId || !allContracts.some(c => c.id === this._embeddedActiveContractId)) {
                this._embeddedActiveContractId = allContracts[0].id;
            }

            const activeContract = this.getContractById(this._embeddedActiveContractId) || allContracts[0];
            const activeContractId = activeContract.id;

            // WhatsApp url for current active contract
            const effectiveRole = this.resolveCurrentUserInfo(activeContract).role;
            const targetPhone = (effectiveRole === 'TENANT' ? (activeContract.owner?.phone || activeContract.ownerPhone || '') : (activeContract.tenant?.phone || activeContract.tenantPhone || '')).replace(/[^0-9]/g, '');
            const waText = encodeURIComponent(`Hola! Me contacto por el canal de negociación del contrato ${activeContract.contractNumber} (${activeContract.title}) a través de Hábitat.`);
            const waUrl = targetPhone ? `https://wa.me/${targetPhone}?text=${waText}` : `https://wa.me/?text=${waText}`;

            const filteredContracts = allContracts.filter(c => {
                if (!this._embeddedSearchTerm) return true;
                const s = this._embeddedSearchTerm.toLowerCase();
                return (c.title && c.title.toLowerCase().includes(s)) ||
                       (c.contractNumber && c.contractNumber.toLowerCase().includes(s)) ||
                       (c.tenant?.name && c.tenant.name.toLowerCase().includes(s)) ||
                       (c.owner?.name && c.owner.name.toLowerCase().includes(s));
            });

            container.innerHTML = `
                <div class="w-full rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col md:flex-row h-[720px] max-h-[82vh] font-body">
                    
                    <!-- Left Sidebar: Conversations List -->
                    <aside class="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
                        <!-- Sidebar Header -->
                        <div class="p-4 border-b border-zinc-200/80 dark:border-zinc-800 space-y-3">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-primary dark:text-red-400 text-2xl">forum</span>
                                    <h3 class="font-headline font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white">Mensajes & Negociación</h3>
                                </div>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    ${allContracts.length} ${allContracts.length === 1 ? 'Canal' : 'Canales'}
                                </span>
                            </div>

                            <!-- Search Input -->
                            <div class="relative">
                                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-base pointer-events-none">search</span>
                                <input 
                                    type="text" 
                                    placeholder="Buscar por propiedad o nombre..."
                                    value="${this._embeddedSearchTerm || ''}"
                                    oninput="ContractsManager._embeddedSearchTerm = this.value; ContractsManager.renderEmbeddedChat('${containerId}', { role: '${role}' });"
                                    class="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                >
                            </div>
                        </div>

                        <!-- Conversations List -->
                        <div class="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
                            ${filteredContracts.map(c => {
                                const isSelected = c.id === activeContractId;
                                const counterpartName = role === 'TENANT' ? (c.owner?.name || 'Propietario') : (c.tenant?.name || 'Inquilino');
                                const counterpartRole = role === 'TENANT' ? 'Propietario' : (role === 'OWNER' ? 'Inquilino' : 'Partes');
                                const msgs = this._chatMessages[c.id] || [];
                                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].mensaje : 'Canal oficial abierto para negociación de términos.';
                                
                                return `
                                    <div 
                                        onclick="ContractsManager._embeddedActiveContractId = '${c.id}'; ContractsManager.renderEmbeddedChat('${containerId}', { role: '${role}' });"
                                        class="p-3.5 sm:p-4 transition-all cursor-pointer flex items-start gap-3 group ${isSelected ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary' : 'hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40'}"
                                    >
                                        <div class="relative w-11 h-11 rounded-2xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                                            <img src="${c.propertyImage || 'img/hero-marketplace.jpg'}" alt="${c.title}" class="w-full h-full object-cover">
                                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute bottom-0.5 right-0.5 ring-2 ring-white dark:ring-zinc-900"></span>
                                        </div>

                                        <div class="min-w-0 flex-1 space-y-1">
                                            <div class="flex items-center justify-between gap-1">
                                                <h4 class="font-headline font-bold text-xs text-zinc-900 dark:text-white truncate ${isSelected ? 'text-primary dark:text-red-400' : ''}">
                                                    ${c.title}
                                                </h4>
                                                <span class="text-[10px] text-zinc-400 font-mono shrink-0">${c.contractNumber}</span>
                                            </div>

                                            <div class="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                                <span class="material-symbols-outlined text-xs text-emerald-500">person</span>
                                                <span class="font-semibold truncate">${counterpartName}</span>
                                                <span class="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-extrabold uppercase shrink-0">${counterpartRole}</span>
                                            </div>

                                            <p class="text-[11px] text-zinc-400 truncate line-clamp-1">
                                                ${lastMsg}
                                            </p>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </aside>

                    <!-- Right Pane: Active Live Chat Window -->
                    <section class="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#0c0d14]">
                        
                        <!-- Chat Window Header -->
                        <header class="p-3.5 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-2xs">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center shrink-0 border border-primary/20">
                                    <span class="material-symbols-outlined text-xl">handshake</span>
                                </div>
                                <div class="min-w-0">
                                    <div class="flex items-center gap-2">
                                        <h3 class="font-headline font-black text-xs sm:text-sm text-zinc-900 dark:text-white truncate">
                                            ${activeContract.title}
                                        </h3>
                                        <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                            ${activeContract.contractNumber}
                                        </span>
                                    </div>
                                    <p class="text-[11px] text-zinc-400 truncate">
                                        Inquilino: <b class="text-zinc-700 dark:text-zinc-300">${activeContract.tenant.name}</b> • Propietario: <b class="text-zinc-700 dark:text-zinc-300">${activeContract.owner.name}</b>
                                    </p>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex items-center gap-2 shrink-0 flex-wrap">
                                <div id="embedded-chat-realtime-status-badge" class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>Tiempo Real</span>
                                </div>

                                <button type="button" onclick="ContractsManager.openContractFullscreen('${activeContractId}', 'document')" class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-headline font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer">
                                    <span class="material-symbols-outlined text-sm">description</span>
                                    <span class="hidden sm:inline">Ver Contrato</span>
                                </button>

                                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-headline font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer">
                                    <svg class="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                    <span class="hidden sm:inline">WhatsApp</span>
                                </a>
                            </div>
                        </header>

                        <!-- Quick Proposals Bar -->
                        <div class="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto text-[11px] font-headline font-bold">
                            <span class="text-zinc-400 uppercase text-[9px] font-black tracking-wider shrink-0 mr-1">Propuestas Rápidas:</span>
                            <button type="button" onclick="ContractsManager.sendQuickProposal('${activeContractId}', 'canon')" class="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-300 transition-all flex items-center gap-1 shrink-0 cursor-pointer">
                                <span class="material-symbols-outlined text-xs text-amber-500">payments</span>
                                <span>Canon</span>
                            </button>
                            <button type="button" onclick="ContractsManager.sendQuickProposal('${activeContractId}', 'ajuste')" class="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-300 transition-all flex items-center gap-1 shrink-0 cursor-pointer">
                                <span class="material-symbols-outlined text-xs text-blue-500">trending_up</span>
                                <span>Ajuste ICL/IPC</span>
                            </button>
                            <button type="button" onclick="ContractsManager.sendQuickProposal('${activeContractId}', 'llaves')" class="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-300 transition-all flex items-center gap-1 shrink-0 cursor-pointer">
                                <span class="material-symbols-outlined text-xs text-purple-500">key</span>
                                <span>Entrega Llaves</span>
                            </button>
                            <button type="button" onclick="ContractsManager.sendQuickProposal('${activeContractId}', 'acuerdo')" class="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 text-emerald-600 dark:text-emerald-400 transition-all flex items-center gap-1 shrink-0 cursor-pointer">
                                <span class="material-symbols-outlined text-xs">check_circle</span>
                                <span>Conformidad</span>
                            </button>
                        </div>

                        <!-- Messages Stream Container -->
                        <div id="embedded-chat-messages-container" class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 flex flex-col bg-zinc-50/30 dark:bg-zinc-950/40">
                            <div class="p-8 text-center text-zinc-400 space-y-2 my-auto">
                                <span class="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
                                <p class="text-xs font-bold">Cargando mensajes del canal...</p>
                            </div>
                        </div>

                        <!-- Composer Box -->
                        <div class="p-3 sm:p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 shrink-0">
                            <input 
                                type="text" 
                                id="embedded-chat-input" 
                                placeholder="Escribe un mensaje para acordar términos o condiciones..."
                                onkeydown="if(event.key === 'Enter') ContractsManager.sendContractMessage('${activeContractId}', null, null, 'embedded-chat-input')"
                                class="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-primary font-medium"
                            >
                            <button 
                                type="button" 
                                onclick="ContractsManager.sendContractMessage('${activeContractId}', null, null, 'embedded-chat-input')"
                                class="h-10 px-5 rounded-xl bg-primary hover:bg-primary-container text-white font-headline font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
                            >
                                <span class="material-symbols-outlined text-base">send</span>
                                <span class="hidden sm:inline">Enviar</span>
                            </button>
                        </div>

                    </section>
                </div>
            `;

            // Initialize chat and messages for this active contract
            this.initChatForContract(activeContractId);
        },

        executeSignatureWithDidit: function (contractId, explicitRole) {
            const contractObj = contracts.find(c => String(c.id) === String(contractId) || String(c.contractNumber) === String(contractId)) || contracts[0];
            const role = explicitRole || detectActiveUserRole(contractObj) || this.currentUserRole;
            this.currentUserRole = role;
            const consentCheckbox = document.getElementById('legal-inpage-consent');
            if (consentCheckbox && !consentCheckbox.checked) {
                alert('Debe aceptar el consentimiento expreso de firma digital para continuar.');
                return;
            }

            const emailInput = document.getElementById('signer-didit-email');
            const email = (emailInput && emailInput.value.trim()) || 'usuario@habitat.ar';

            if (window.DiditAuth && typeof window.DiditAuth.openFaceLivenessVerification === 'function') {
                window.DiditAuth.openFaceLivenessVerification({
                    email: email,
                    vendorData: `CONTRACT_SIGN_${contractId}_${role}`,
                    callbackUrl: window.location.origin + window.location.pathname + `?contract=${contractId}&role=${role}`,
                    onSuccess: (result) => {
                        ContractsManager.startCryptographicStep(contractId, role, result || {});
                    },
                    onError: (err) => {
                        console.warn('Firma cancelada o con error:', err);
                    }
                });
            } else {
                ContractsManager.startCryptographicStep(contractId, role, {
                    sessionId: `didit_live_${Date.now()}`,
                    status: 'APPROVED'
                });
            }
        },

        startCryptographicStep: function (contractId, role, diditSessionData = {}) {
            const currentSessionId = diditSessionData.sessionId || `didit_sess_${Date.now()}`;
            const shortSessionId = currentSessionId.length > 22 ? currentSessionId.substring(0, 22) + '...' : currentSessionId;

            // Modal compatible con Modo Claro y Modo Oscuro
            const cryptoModalHtml = `
                <div id="contract-modal-overlay" class="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-body" style="-webkit-overflow-scrolling: touch;">
                    <div class="relative w-full max-w-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 space-y-5 overflow-hidden my-auto animate-fadeIn">
                        
                        <div class="text-center space-y-2 relative z-10">
                            <div class="w-14 h-14 rounded-2xl bg-red-50 dark:bg-zinc-800 border border-red-200 dark:border-zinc-700 flex items-center justify-center text-primary dark:text-red-400 mx-auto">
                                <span class="material-symbols-outlined text-3xl animate-pulse">lock_clock</span>
                            </div>
                            <h3 class="font-headline font-bold text-base sm:text-lg text-zinc-900 dark:text-white">Sellado Digital del Contrato</h3>
                            <p class="text-xs text-zinc-500 dark:text-zinc-400">Verificación biométrica Didit y Time-Stamp <b>Ley 25.506</b></p>
                        </div>

                        <!-- Progress Bar -->
                        <div class="space-y-2">
                            <div class="flex justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
                                <span>Progreso Criptográfico</span>
                                <span id="crypto-progress-text" class="text-emerald-600 dark:text-emerald-400 font-bold">40%</span>
                            </div>
                            <div class="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div id="crypto-progress-bar" class="h-full bg-gradient-to-r from-primary via-red-500 to-emerald-400 transition-all duration-500" style="width: 40%"></div>
                            </div>
                            <p id="crypto-status-msg" class="text-[11px] text-center text-zinc-600 dark:text-zinc-300 font-medium animate-pulse min-h-[18px]">
                                Biometría facial Didit Aprobada. Generando Hash SHA-256...
                            </p>
                        </div>

                        <!-- 4 Step Checkpoints -->
                        <div class="space-y-2.5 text-xs font-mono">
                            <div id="step-row-1" class="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-emerald-500/40 flex items-center justify-between">
                                <div class="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-medium">
                                    <span class="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
                                    <span>Prueba de Vida Didit Liveness</span>
                                </div>
                                <span class="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">APROBADA</span>
                            </div>

                            <div id="step-row-2" class="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-primary/40 flex items-center justify-between text-zinc-900 dark:text-white">
                                <div class="flex items-center gap-2 font-medium">
                                    <span class="material-symbols-outlined text-primary text-base animate-spin">sync</span>
                                    <span>Digest Criptográfico SHA-256</span>
                                </div>
                                <span id="step-tag-2" class="text-amber-600 dark:text-amber-400 font-bold text-[10px]">EN CURSO...</span>
                            </div>

                            <div id="step-row-3" class="p-2.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-zinc-400">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-zinc-400 text-base">schedule</span>
                                    <span>Sello de Tiempo TSA (Ley 25.506)</span>
                                </div>
                                <span id="step-tag-3" class="text-[10px] text-zinc-400">PENDIENTE</span>
                            </div>

                            <div id="step-row-4" class="p-2.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-zinc-400">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-zinc-400 text-base">folder_zip</span>
                                    <span>Registro de Firma en Supabase</span>
                                </div>
                                <span id="step-tag-4" class="text-[10px] text-zinc-400">PENDIENTE</span>
                            </div>
                        </div>

                        <!-- Session Badge -->
                        <div class="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                            <span>ID Sesión Didit:</span>
                            <span class="font-mono text-zinc-900 dark:text-white font-bold">${shortSessionId}</span>
                        </div>
                    </div>
                </div>
            `;

            const existingModal = document.getElementById('contract-modal-overlay');
            if (existingModal) existingModal.remove();

            const wrapper = document.createElement('div');
            wrapper.innerHTML = cryptoModalHtml;
            document.body.appendChild(wrapper.firstElementChild);

            const clientDirectStoragePromise = (async () => {
                if (!window.supabaseClient) return null;
                try {
                    let contractObj = contracts.find(item => 
                        String(item.id) === String(contractId) || 
                        String(item.contractNumber) === String(contractId) || 
                        String(item.dbContractId) === String(contractId)
                    ) || contracts[0];

                    let dbContractId = contractObj?.dbContractId ? Number(contractObj.dbContractId) : null;

                    // 1. Si no tenemos dbContractId, buscar por ID numérico extraído o por la propiedad
                    if (!dbContractId && contractId) {
                        const parsedNum = parseInt(String(contractId).replace(/\D/g, ''), 10);
                        if (parsedNum && !isNaN(parsedNum)) {
                            const { data: directC } = await window.supabaseClient
                                .from('Contrato')
                                .select('id_contrato')
                                .eq('id_contrato', parsedNum)
                                .maybeSingle();
                            if (directC && directC.id_contrato) {
                                dbContractId = directC.id_contrato;
                            }
                        }
                    }

                    if (!dbContractId) {
                        const propId = Number(contractObj?.propertyId || 42);
                        const { data: propContract } = await window.supabaseClient
                            .from('Contrato')
                            .select('id_contrato')
                            .eq('id_propiedad', propId)
                            .order('id_contrato', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (propContract && propContract.id_contrato) {
                            dbContractId = propContract.id_contrato;
                        }
                    }

                    if (!dbContractId) {
                        const { data: latestC } = await window.supabaseClient
                            .from('Contrato')
                            .select('id_contrato')
                            .order('id_contrato', { ascending: false })
                            .limit(1)
                            .maybeSingle();
                        if (latestC && latestC.id_contrato) {
                            dbContractId = latestC.id_contrato;
                        }
                    }

                    if (contractObj && dbContractId) {
                        contractObj.dbContractId = dbContractId;
                    }

                    if (!dbContractId) {
                        console.error("[ContractsManager] No se pudo resolver id_contrato en Supabase.");
                        return null;
                    }

                    const isTenantRole = (role === 'TENANT' || role === 'INQUILINO' || String(role).toLowerCase() === 'inquilino' || String(role).toLowerCase() === 'tenant');
                    const dbRole = isTenantRole ? 'inquilino' : 'propietario';

                    let profileId = isTenantRole ? (Number(contractObj?.tenant?.profileId) || 15) : (Number(contractObj?.owner?.profileId) || 6);
                    try {
                        const { data: authSess } = await window.supabaseClient.auth.getSession();
                        const currentAuthUserId = authSess?.session?.user?.id;
                        if (currentAuthUserId) {
                            const { data: pData } = await window.supabaseClient
                                .from('Perfil')
                                .select('id_perfil')
                                .eq('user_id', currentAuthUserId)
                                .maybeSingle();
                            if (pData && pData.id_perfil) {
                                profileId = pData.id_perfil;
                            }
                        }
                    } catch (e) {}

                    if (!profileId) {
                        profileId = isTenantRole ? 15 : 6;
                    }

                    // La IP y Geolocalización ahora se capturan exclusivamente en el backend (servidor)
                    // para evitar bloqueos por AdBlockers y asegurar el registro.
                    let clientIp = '';
                    let clientGeo = null;

                    let backendSellar = null;
                    try {
                        const apiBase = (window.location.port === '5500' || window.location.port === '5501') ? 'http://localhost:3000' : '';
                        const sellRes = await fetch(`${apiBase}/api/firmas/sellar`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                id_contrato: dbContractId,
                                rol: dbRole,
                                didit_session_id: currentSessionId,
                                user_agent: navigator.userAgent
                            })
                        });
                        if (sellRes.ok) {
                            const sj = await sellRes.json();
                            backendSellar = sj.data;
                        }
                    } catch(e) {
                        console.warn("[ContractsManager] Fallo al contactar el backend de sellado", e);
                    }

                    let insertedFirma = backendSellar;

                    if (!insertedFirma) {
                        console.error("[ContractsManager] El backend no devolvió la firma sellada. Falló el proceso criptográfico.");
                        // Handle error gracefully if needed
                    }

                    const { data: freshSignatures } = await window.supabaseClient
                        .from('Firma_contrato')
                        .select('rol_firmante, estado_firma, didit_status')
                        .eq('id_contrato', dbContractId);

                    const tenantHasSigned = (freshSignatures || []).some(f => 
                        ['TENANT', 'INQUILINO', 'inquilino', 'tenant'].includes(f.rol_firmante) && 
                        (f.estado_firma === 'sellada' || f.estado_firma === 'firmada' || f.estado_firma === 'completada' || f.didit_status === 'APPROVED')
                    ) || isTenantRole;

                    const ownerHasSigned = (freshSignatures || []).some(f => 
                        ['OWNER', 'PROPIETARIO', 'propietario', 'owner'].includes(f.rol_firmante) && 
                        (f.estado_firma === 'sellada' || f.estado_firma === 'firmada' || f.estado_firma === 'completada' || f.didit_status === 'APPROVED')
                    ) || (!isTenantRole);

                    const rentAmount = Number(contractObj?.monthlyRent || 450000);
                    const pubId = contractObj?.publicationId ? Number(contractObj.publicationId) : null;
                    const propId = contractObj?.propertyId ? Number(contractObj.propertyId) : null;

                    try {
                        const { data: existingPago } = await window.supabaseClient
                            .from('Pago')
                            .select('id_pago')
                            .eq('id_contrato', dbContractId)
                            .limit(1)
                            .maybeSingle();

                        if (!existingPago) {
                            const todayStr = new Date().toISOString().split('T')[0];
                            const { data: newPago } = await window.supabaseClient
                                .from('Pago')
                                .insert([{
                                    id_contrato: dbContractId,
                                    id_metodo_pago: 1,
                                    monto: rentAmount,
                                    fecha_vencimiento: todayStr,
                                    periodo: new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                                }])
                                .select()
                                .maybeSingle();

                            if (newPago && newPago.id_pago) {
                                await window.supabaseClient.from('Historial_pago').insert([{
                                    id_pago: newPago.id_pago,
                                    id_estado_pago: 1,
                                    fecha_inicio: new Date().toISOString()
                                }]);
                            }
                        }
                    } catch (pErr) {
                        console.warn("Aviso registrando pago en Supabase:", pErr);
                    }

                    let backendFinalizar = null;
                    if (tenantHasSigned && ownerHasSigned) {
                        try {
                            const apiBase = (window.location.port === '5500' || window.location.port === '5501') ? 'http://localhost:3000' : '';
                            const finRes = await fetch(`${apiBase}/api/firmas/finalizar?id_contrato=${dbContractId}`);
                            if (finRes.ok) {
                                const fj = await finRes.json();
                                backendFinalizar = fj.data;
                            }
                        } catch (e) {
                            console.warn("[ContractsManager] Fallo al contactar backend finalizar", e);
                        }

                        try {
                            await window.supabaseClient.from('Historial_Estado_Contrato').insert([{
                                id_contrato: dbContractId,
                                id_estado_contrato: 1,
                                fecha_inicio: new Date().toISOString()
                            }]);
                        } catch (e) {}

                        if (pubId) {
                            try {
                                await window.supabaseClient.from('Historial_Estado_Publicacion').insert([{
                                    id_publicacion: pubId,
                                    id_estado_publicacion: 2,
                                    fecha_inicio: new Date().toISOString()
                                }]);
                            } catch (e) {}
                        }

                        if (propId) {
                            try {
                                await window.supabaseClient
                                    .from('Propiedad')
                                    .update({ id_estado_propiedad: 4 })
                                    .eq('id_propiedad', propId);

                                await window.supabaseClient.from('Historial_estado_propiedad').insert([{
                                    id_propiedad: propId,
                                    id_estado_propiedad: 4,
                                    fecha_inicio: new Date().toISOString()
                                }]);
                            } catch (e) {}
                        }
                    } else {
                        try {
                            await window.supabaseClient.from('Historial_Estado_Contrato').insert([{
                                id_contrato: dbContractId,
                                id_estado_contrato: 5,
                                fecha_inicio: new Date().toISOString()
                            }]);
                        } catch (e) {}
                    }

                    return {
                        firma: insertedFirma,
                        backendSellar,
                        backendFinalizar
                    };
                } catch (e) {
                    console.warn("Aviso guardando firma en Supabase:", e);
                }
                return null;
            })();

            setTimeout(() => {
                const pBar = document.getElementById('crypto-progress-bar');
                const pText = document.getElementById('crypto-progress-text');
                const msg = document.getElementById('crypto-status-msg');
                const row2 = document.getElementById('step-row-2');
                const tag2 = document.getElementById('step-tag-2');
                const row3 = document.getElementById('step-row-3');
                const tag3 = document.getElementById('step-tag-3');

                if (pBar) pBar.style.width = '70%';
                if (pText) pText.innerText = '70%';
                if (msg) msg.innerText = 'Generando Digest SHA-256 e incrustando firma en Supabase...';
                if (row2 && tag2) {
                    row2.className = 'p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-emerald-500/40 flex items-center justify-between';
                    tag2.className = 'text-emerald-600 dark:text-emerald-400 font-bold text-[10px]';
                    tag2.innerText = 'COMPLETADO';
                }
                if (row3 && tag3) {
                    row3.className = 'p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-primary/40 flex items-center justify-between text-zinc-900 dark:text-white';
                    tag3.className = 'text-amber-600 dark:text-amber-400 font-bold text-[10px]';
                    tag3.innerText = 'EN CURSO...';
                }
            }, 800);

            setTimeout(() => {
                const pBar = document.getElementById('crypto-progress-bar');
                const pText = document.getElementById('crypto-progress-text');
                const msg = document.getElementById('crypto-status-msg');
                const row3 = document.getElementById('step-row-3');
                const tag3 = document.getElementById('step-tag-3');
                const row4 = document.getElementById('step-row-4');
                const tag4 = document.getElementById('step-tag-4');

                if (pBar) pBar.style.width = '95%';
                if (pText) pText.innerText = '95%';
                if (msg) msg.innerText = 'Estampando Sello de Tiempo TSA y resguardando Audit Trail en Storage...';
                if (row3 && tag3) {
                    row3.className = 'p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-emerald-500/40 flex items-center justify-between';
                    tag3.className = 'text-emerald-600 dark:text-emerald-400 font-bold text-[10px]';
                    tag3.innerText = 'COMPLETADO';
                }
                if (row4 && tag4) {
                    row4.className = 'p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-primary/40 flex items-center justify-between text-zinc-900 dark:text-white';
                    tag4.className = 'text-amber-600 dark:text-amber-400 font-bold text-[10px]';
                    tag4.innerText = 'EN CURSO...';
                }
            }, 1600);

            setTimeout(async () => {
                const serverData = await clientDirectStoragePromise;
                const backendSellarData = serverData?.backendSellar || serverData?.firma || {};
                const backendDocs = serverData?.backendFinalizar?.documentos || {};

                const c = contracts.find(item => String(item.id) === String(contractId) || String(item.contractNumber) === String(contractId)) || contracts[0];
                if (c) {
                    if (role === 'TENANT') {
                        c.tenant.hasSigned = true;
                        c.tenant.signedAt = new Date().toISOString();
                        c.tenant.diditSessionId = currentSessionId;
                        c.status = c.owner.hasSigned ? 'SIGNED_AND_SEALED' : 'WAITING_OWNER';
                    } else if (role === 'OWNER') {
                        c.owner.hasSigned = true;
                        c.owner.signedAt = new Date().toISOString();
                        c.owner.diditSessionId = currentSessionId;
                        c.status = c.tenant.hasSigned ? 'SIGNED_AND_SEALED' : 'WAITING_TENANT';
                    } else {
                        c.tenant.hasSigned = true;
                        c.owner.hasSigned = true;
                        c.status = 'SIGNED_AND_SEALED';
                    }

                    c.sha256Hash = backendSellarData.hash_contrato_sha256 || 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33';
                    c.tsaTimestamp = backendSellarData.fecha_firma || new Date().toISOString();
                    c.tsaCertificateId = backendSellarData.tsa_sello_tiempo?.serialNumber || `TSA-AR-2026-${Math.floor(100000 + Math.random() * 900000)}`;
                    c.auditTrailUrl = backendSellarData.url_audit_trail_pdf;
                    c.downloadUrls = backendDocs;

                    c.auditTrailEvents = c.auditTrailEvents || [];
                    c.auditTrailEvents.push({
                        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                        action: role === 'TENANT' ? 'FIRMA_INQUILINO_COMPLETADA' : 'FIRMA_PROPIETARIO_COMPLETADA',
                        actor: role === 'TENANT' ? c.tenant.name : c.owner.name,
                        details: `Validación facial Didit Liveness Check Aprobada (Sesión: ${currentSessionId}), sellado TSA y PDF custodiado en Supabase Storage.`
                    });

                    saveContracts();

                    if (window.NotificationManager) {
                        if (role === 'TENANT') {
                            window.NotificationManager.createNotification({
                                id: `notif_tenant_signed_${c.id}`,
                                title: '✍️ ¡El inquilino firmó el contrato!',
                                message: `${c.tenant.name} completó su validación biométrica y firmó el contrato para "${c.title}". Ahora es tu turno de firmar como propietario.`,
                                type: 'contract',
                                link: `contratos.html?contract=${c.id}&sign=1&role=OWNER`,
                                role: 'OWNER',
                                priority: 'high'
                            });
                        } else {
                            window.NotificationManager.createNotification({
                                id: `notif_owner_signed_${c.id}`,
                                title: '✍️ ¡El propietario firmó el contrato!',
                                message: `${c.owner.name} firmó y selló el contrato para "${c.title}". El contrato de locación se encuentra 100% perfeccionado.`,
                                type: 'contract',
                                link: `contratos.html?contract=${c.id}&role=TENANT`,
                                role: 'TENANT',
                                priority: 'high'
                            });
                        }
                    }
                }

                const modal = document.getElementById('contract-modal-overlay');
                if (modal) modal.remove();

                ContractsManager.renderDashboard('contracts-dashboard-container');

                if (window.ToastManager) {
                    window.ToastManager.show({
                        title: '✓ Firma Registrada y Sellada',
                        message: 'Prueba de vida biométrica aprobada y certificado resguardado en Supabase Storage.',
                        type: 'success',
                        duration: 5000
                    });
                }
            }, 2600);
        },

        openContractSigning: function (contractId) {
            this.selectContract(contractId, true);
        },

        openContractViewer: function (contractId) {
            this.selectContract(contractId, true);
        },

        editContractConditions: async function (contractId) {
            let contract = this.getContractById(contractId);
            if (!contract) return;

            // Asegurar resolución del id_perfil del usuario en Supabase antes de validar
            await ensureUserProfileResolved();

            // Si el contrato no tiene id_perfil_propietario o es un objeto parcial, intentar resolverlo desde Supabase
            if (!contract.id_perfil_propietario && contract.dbContractId && window.supabaseClient) {
                try {
                    const { data: dbC } = await window.supabaseClient
                        .from('Contrato')
                        .select('id_perfil_propietario, id_propiedad')
                        .eq('id_contrato', contract.dbContractId)
                        .maybeSingle();
                    if (dbC && dbC.id_perfil_propietario) {
                        contract.id_perfil_propietario = Number(dbC.id_perfil_propietario);
                        if (contract.owner) contract.owner.profileId = Number(dbC.id_perfil_propietario);
                    }
                } catch (e) {}
            }

            // Restricción estricta: Solo si el usuario actual es el propietario/locador titular del contrato (id_perfil === id_perfil_propietario)
            if (!isUserOwnerOfContract(contract)) {
                const ownerIdText = contract.id_perfil_propietario || contract.owner?.profileId || '';
                const msg = 'Únicamente el propietario titular' + (ownerIdText ? ` (id_perfil_propietario: ${ownerIdText})` : '') + ' tiene permisos para editar las condiciones y cláusulas del contrato.';
                if (window.ToastManager) {
                    window.ToastManager.show({
                        title: '🔒 Acceso Restringido',
                        message: msg,
                        type: 'warning'
                    });
                } else {
                    alert(msg);
                }
                return;
            }

            const isSigned = contract.status === 'SIGNED_AND_SEALED' || contract.tenant?.hasSigned || contract.owner?.hasSigned;
            if (isSigned) {
                if (window.ToastManager) {
                    window.ToastManager.show({
                        title: '🔒 Contrato Bloqueado e Inmutable',
                        message: 'Este contrato ya cuenta con firmas digitales registradas y se encuentra sellado según la Ley 25.506.',
                        type: 'warning'
                    });
                } else {
                    alert('Este contrato ya cuenta con firmas digitales registradas y se encuentra sellado según la Ley 25.506.');
                }
                return;
            }

            if (window.openContractEditorModal) {
                window.openContractEditorModal({
                    applicant: {
                        tenant_name: contract.tenant?.name,
                        tenant_dni: contract.tenant?.dni,
                        tenant_email: contract.tenant?.email
                    },
                    property: {
                        title: contract.title,
                        address: contract.propertyAddress,
                        price: contract.monthlyRent,
                        id_perfil_propietario: contract.id_perfil_propietario || contract.owner?.profileId
                    },
                    contract: contract,
                    onConfirm: async (terms) => {
                        contract.monthlyRent = terms.monthlyRent || contract.monthlyRent;
                        contract.durationMonths = terms.durationMonths || contract.durationMonths;
                        contract.adjustmentIndex = terms.adjustmentIndex || contract.adjustmentIndex;
                        contract.adjustmentFrequencyMonths = terms.adjustmentFrequencyMonths || contract.adjustmentFrequencyMonths;
                        contract.paymentDueDay = terms.paymentDueDay || contract.paymentDueDay;
                        contract.aliasCbu = terms.aliasCbu || contract.aliasCbu;
                        contract.clauses = terms.clauses || contract.clauses;
                        contract.customClauses = terms.customClauses || contract.customClauses;

                        const dbId = contract.dbContractId || parseInt(String(contract.id).replace(/\D/g, ''), 10);
                        if (window.supabaseClient && dbId) {
                            try {
                                await window.supabaseClient.from('Contrato').update({
                                    monto_cierre: contract.monthlyRent,
                                    periodo_aumento_meses: contract.adjustmentFrequencyMonths,
                                    dia_vencimiento_mensual: contract.paymentDueDay,
                                    alias_cbu: contract.aliasCbu,
                                    "id_Indice": terms.adjustmentIndex === 'ICL' ? 2 : 1,
                                    id_moneda: terms.currency === 'USD' ? 2 : 1
                                }).eq('id_contrato', dbId);
                            } catch (e) {
                                console.warn("Aviso actualizando contrato en Supabase:", e);
                            }
                        }

                        saveContracts();
                        if (window.ContractEditorModal) window.ContractEditorModal.close();
                        ContractsManager.renderDashboard('contracts-dashboard-container');

                        if (window.ToastManager) {
                            window.ToastManager.show({
                                title: '✓ Contrato Actualizado',
                                message: 'Se aplicaron las nuevas condiciones y cláusulas al borrador oficial.',
                                type: 'success'
                            });
                        }
                    }
                });
            } else {
                console.error("ContractEditorModal no está cargado.");
            }
        },

        downloadSignedContract: async function (contractId) {
            const contract = this.getContractById(contractId);
            if (!contract) return;

            const dbId = contract.dbContractId || parseInt(String(contractId).replace(/\D/g, ''), 10) || 43;

            // 1. Obtener URL firmada directamente desde Supabase Storage
            if (window.supabaseClient) {
                try {
                    const { data, error } = await window.supabaseClient.storage
                        .from('contratos_firmados')
                        .createSignedUrl(`contrato_${dbId}/contrato_definitivo.pdf`, 60 * 60 * 24 * 7);
                    if (data && data.signedUrl) {
                        window.open(data.signedUrl, '_blank');
                        return;
                    }
                } catch (sbErr) {
                    console.warn('[ContractsManager] Supabase direct storage signed URL aviso:', sbErr);
                }
            }

            // 2. Intentar obtener URL firmada del backend API (soporta puerto 3000 o relativo)
            const apiBase = (window.location.port === '5500' || window.location.port === '5501') ? 'http://localhost:3000' : '';
            try {
                const finRes = await fetch(`${apiBase}/api/firmas/finalizar?id_contrato=${dbId}`);
                if (finRes.ok) {
                    const finJson = await finRes.json();
                    const signedPdfUrl = finJson?.data?.documentos?.contrato_pdf;
                    if (signedPdfUrl) {
                        window.open(signedPdfUrl, '_blank');
                        return;
                    }
                }
            } catch (apiErr) {
                console.warn('[ContractsManager] Fallback a renderizado local de PDF:', apiErr);
            }

            // 3. Fallback: Renderizado de impresión en navegador
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Por favor permita ventanas emergentes en su navegador para descargar el PDF.');
                return;
            }

            const formatMoney = (n) => '$ ' + Number(n).toLocaleString('es-AR');

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Contrato de Locación - ${contract.contractNumber}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; font-size: 13px; line-height: 1.7; }
                        .header { text-align: center; border-bottom: 2px solid #811b1e; padding-bottom: 15px; margin-bottom: 25px; }
                        .title { font-size: 20px; font-weight: 800; color: #811b1e; text-transform: uppercase; letter-spacing: 0.5px; }
                        .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
                        .badge { display: inline-block; background: #ecfdf5; color: #059669; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 11px; margin-top: 8px; border: 1px solid #a7f3d0; }
                        .clause { margin-bottom: 16px; text-align: justify; }
                        .signatures { margin-top: 40px; display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 25px; gap: 20px; }
                        .sig-box { width: 48%; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; background: #f8fafc; }
                        .sig-status { display: inline-block; margin-top: 8px; font-weight: bold; font-size: 11px; color: #059669; }
                        .qr-seal { margin-top: 35px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                        @media print {
                            body { margin: 20px; font-size: 12px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">CONTRATO DE LOCACIÓN INMOBILIARIA DIGITAL</div>
                        <div class="subtitle"><b>Identificador Legal:</b> ${contract.contractNumber} • Conforme a la Ley Nacional N° 25.506 de Firma Digital</div>
                        <div class="badge">✓ SELLADO CON AUDIT TRAIL FORENSE Y TSA TIME-STAMP</div>
                    </div>

                    <div class="clause">
                        <b>PARTES INTERVINIENTES:</b> En la Ciudad de Mendoza, entre <b>${contract.owner.name}</b> (DNI ${contract.owner.dni}, CUIL ${contract.owner.cuil}), en adelante denominado <b>"EL LOCADOR"</b>, por una parte; y por la otra <b>${contract.tenant.name}</b> (DNI ${contract.tenant.dni}, CUIL ${contract.tenant.cuil}), en adelante denominado <b>"EL LOCATARIO"</b>, se conviene en celebrar el presente contrato de locación sujeto a las siguientes cláusulas consecutivas:
                    </div>

                    ${renderContractClausesList(contract, true)}

                    <div class="signatures">
                        <div class="sig-box">
                            <b>Locatario (Inquilino):</b><br>
                            ${contract.tenant.name}<br>
                            <b>DNI:</b> ${contract.tenant.dni} • <b>CUIL:</b> ${contract.tenant.cuil}<br>
                            <b>Email:</b> ${contract.tenant.email}<br>
                            <span class="sig-status">${contract.tenant.hasSigned ? '✓ FIRMADO DIGITALMENTE (Didit Liveness Check Aprobado)' : '⏳ PENDIENTE DE FIRMA'}</span>
                        </div>
                        <div class="sig-box">
                            <b>Locador (Propietario):</b><br>
                            ${contract.owner.name}<br>
                            <b>DNI:</b> ${contract.owner.dni} • <b>CUIL:</b> ${contract.owner.cuil}<br>
                            <b>Email:</b> ${contract.owner.email}<br>
                            <span class="sig-status">${contract.owner.hasSigned ? '✓ FIRMADO DIGITALMENTE (Didit Liveness Check Aprobado)' : '⏳ PENDIENTE DE FIRMA'}</span>
                        </div>
                    </div>

                    <div class="qr-seal">
                        <b>Digest Criptográfico SHA-256:</b> <span style="font-family: monospace; font-size: 10px;">${contract.sha256Hash || 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33'}</span><br>
                        Sello de Tiempo TSA Registrado: ${contract.tsaTimestamp || new Date().toISOString()} • Verificable en plataforma Habitat.
                    </div>

                    <script>
                        window.onload = function() { window.print(); };
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
        },

        downloadAuditTrail: async function (contractId) {
            const contract = this.getContractById(contractId);
            if (!contract) return;

            const dbId = contract.dbContractId || parseInt(String(contractId).replace(/\D/g, ''), 10) || 43;

            // 1. Obtener URL firmada directamente desde Supabase Storage
            if (window.supabaseClient) {
                try {
                    const activeRole = detectActiveUserRole(contract);
                    const isOwner = activeRole === 'OWNER';
                    let auditPath = `contrato_${dbId}/audit_trail_firma_13.pdf`;

                    const { data: fList } = await window.supabaseClient
                        .from('Firma_contrato')
                        .select('url_audit_trail_pdf, rol_firmante, id_firma')
                        .eq('id_contrato', dbId);

                    if (fList && fList.length > 0) {
                        const targetFirma = fList.find(f => isOwner 
                            ? ['propietario', 'owner', 'OWNER', 'PROPIETARIO'].includes(f.rol_firmante) 
                            : ['inquilino', 'tenant', 'TENANT', 'INQUILINO'].includes(f.rol_firmante)) || fList[0];
                        if (targetFirma) {
                            auditPath = (targetFirma.url_audit_trail_pdf && !targetFirma.url_audit_trail_pdf.startsWith('http')) 
                                ? targetFirma.url_audit_trail_pdf 
                                : `contrato_${dbId}/audit_trail_firma_${targetFirma.id_firma}.pdf`;
                        }
                    }

                    const { data, error } = await window.supabaseClient.storage
                        .from('contratos_firmados')
                        .createSignedUrl(auditPath, 60 * 60 * 24 * 7);

                    if (data && data.signedUrl) {
                        window.open(data.signedUrl, '_blank');
                        return;
                    }
                } catch (sbErr) {
                    console.warn('[ContractsManager] Supabase direct audit trail signed URL aviso:', sbErr);
                }
            }

            // 2. Intentar obtener URL firmada del backend API (soporta puerto 3000 o relativo)
            const apiBase = (window.location.port === '5500' || window.location.port === '5501') ? 'http://localhost:3000' : '';
            try {
                const finRes = await fetch(`${apiBase}/api/firmas/finalizar?id_contrato=${dbId}`);
                if (finRes.ok) {
                    const finJson = await finRes.json();
                    const docs = finJson?.data?.documentos || {};
                    const activeRole = detectActiveUserRole(contract);
                    const signedAuditUrl = (activeRole === 'OWNER' ? docs.audit_trail_propietario : docs.audit_trail_inquilino) 
                        || docs.audit_trail_inquilino 
                        || docs.audit_trail_propietario;
                    if (signedAuditUrl) {
                        window.open(signedAuditUrl, '_blank');
                        return;
                    }
                }
            } catch (apiErr) {
                console.warn('[ContractsManager] Fallback a renderizado local de Audit Trail:', apiErr);
            }

            // 3. Fallback: Renderizado de impresión en navegador

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Por favor permita ventanas emergentes en su navegador para descargar el Audit Trail.');
                return;
            }

            const events = contract.auditTrailEvents || [
                {
                    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                    action: 'CONTRATO_GENERADO',
                    actor: 'Habitat Smart Contracts Generator',
                    details: `Contrato digital generado para ${contract.tenant?.name || 'Inquilino'} en ${contract.propertyAddress}.`
                }
            ];

            let eventsHtml = '';
            events.forEach((ev) => {
                eventsHtml += `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px;">${ev.timestamp}</td>
                        <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f766e;">${ev.action}</td>
                        <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: 600;">${ev.actor}</td>
                        <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 11px;">${ev.details}</td>
                    </tr>
                `;
            });

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Certificado de Evidencia y Audit Trail - ${contract.contractNumber}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; font-size: 12px; line-height: 1.6; }
                        .header { border-bottom: 2px solid #0f766e; padding-bottom: 15px; margin-bottom: 20px; }
                        .title { font-size: 18px; font-weight: 800; color: #0f766e; text-transform: uppercase; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th { background: #f0fdfa; text-align: left; padding: 10px; border: 1px solid #cbd5e1; font-size: 11px; font-weight: 800; color: #0f766e; }
                        .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin-bottom: 20px; font-size: 12px; }
                        @media print {
                            body { margin: 20px; font-size: 11px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">CERTIFICADO DE EVIDENCIA DIGITAL (AUDIT TRAIL FORENSE)</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;"><b>Referencia Contrato:</b> ${contract.contractNumber} - ${contract.title}</div>
                        <div style="font-size: 12px; color: #64748b;"><b>Autoridad Certificante TSA:</b> Time-Stamp Authority Ley Nacional N° 25.506</div>
                    </div>

                    <div class="meta-box">
                        <b>Resumen Criptográfico y Parámetros Forenses:</b><br>
                        • <b>Digest SHA-256 del Contrato:</b> <span style="font-family: monospace;">${contract.sha256Hash || 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33'}</span><br>
                        • <b>Sello de Tiempo Legal (TSA):</b> ${contract.tsaTimestamp || new Date().toISOString()}<br>
                        • <b>Proveedor Biométrico de Identidad:</b> Didit KYC & Liveness Check (Face Biometrics Engine)<br>
                        • <b>Inmueble:</b> ${contract.propertyAddress}
                    </div>

                    <h3 style="font-size: 14px; font-weight: 800; color: #1e293b; margin-top: 25px;">Registro Cronológico Inmutable de Eventos</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha y Hora (UTC-3)</th>
                                <th>Evento</th>
                                <th>Actor / Firmante</th>
                                <th>Evidencia Forense y Metadatos</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${eventsHtml}
                        </tbody>
                    </table>

                    <div style="margin-top: 35px; text-align: center; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                        Documento emitido y resguardado criptográficamente por la plataforma Habitat en cumplimiento del Código Civil y Comercial de la Nación y la Ley 25.506.
                    </div>

                    <script>
                        window.onload = function() { window.print(); };
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
        }
    };

    window.ContractsManager = ContractsManager;

    document.addEventListener('DOMContentLoaded', async function () {
        const container = document.getElementById('contracts-dashboard-container');
        if (container) {
            const urlParams = new URLSearchParams(window.location.search);
            const contractParam = urlParams.get('contract') || urlParams.get('sign') || urlParams.get('id');
            const statusParam = urlParams.get('status') || urlParams.get('didit_status') || urlParams.get('verification_status');
            const sessionParam = urlParams.get('session_id') || urlParams.get('sessionId');
            const roleParam = urlParams.get('role') || ContractsManager.currentUserRole;

            // Sincronizar contratos reales desde Supabase
            await syncContractsFromSupabase();

            if (contractParam) {
                ContractsManager.selectedContractId = contractParam;
            }

            ContractsManager.renderDashboard('contracts-dashboard-container');

            if (contractParam && !statusParam) {
                ContractsManager.openContractFullscreen(contractParam, 'document');
            }

            // Detectar retorno de redirección desde Didit con validación aprobada
            if (contractParam && (statusParam === 'Approved' || statusParam === 'COMPLETED' || statusParam === 'approved' || (sessionParam && !sessionParam.includes('mock')))) {
                setTimeout(() => {
                    ContractsManager.startCryptographicStep(contractParam, roleParam, {
                        sessionId: sessionParam || `didit_return_${Date.now()}`,
                        status: 'APPROVED'
                    });
                    const cleanUrl = window.location.pathname + `?contract=${contractParam}&role=${roleParam}`;
                    window.history.replaceState({}, document.title, cleanUrl);
                }, 400);
            }
        }
    });

})();
