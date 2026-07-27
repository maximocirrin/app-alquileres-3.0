/**
 * Data Management Module
 * Handles Supabase operations (Global Version)
 */

// No imports - relies on global supabaseClient

const DataManager = {
    // User Management
    login: async (email, password) => {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            console.error("Login error:", error);
            return null;
        }
        return data.user;
    },

    signUp: async (email, password, fullName) => {
        const { data, error } = await window.supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });
        
        if (error) {
            console.error("Signup error:", error);
            throw error;
        }
        return data.user;
    },

    logout: async () => {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) console.error("Logout error:", error);
    },

    getCurrentUser: async () => {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        return user;
    },

    getUserProfile: async () => {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return null;
        const { data, error } = await window.supabaseClient
            .from('profiles')
            .select('id, full_name, email, role')
            .eq('id', user.id)
            .single();
        if (error) {
            console.error("Error fetching profile:", error);
            return null;
        }
        return data;
    },

    getUserMarketplaceProperties: async () => {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return [];
        const { data, error } = await window.supabaseClient
            .from('properties')
            .select(`
                id, title, description, address, price, status, images, created_at,
                propiedad_imagenes (url, orden)
            `)
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });
        if (error) {
            console.error("Error fetching user marketplace properties:", error);
            return [];
        }
        return data || [];
    },

    // Property Management
    getProperties: async () => {
        const { data, error } = await window.supabaseClient
            .from('properties')
            .select(`
                *,
                contracts (
                    tenant_id,
                    start_date,
                    end_date,
                    monthly_rent,
                    payment_due_day,
                    status,
                    contract_data
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching properties:", error);
            return [];
        }

        return data.map(p => {
            const currentContract = p.contracts && p.contracts.length > 0 ? p.contracts[0] : null;
            return {
                id: p.id,
                title: p.title, 
                description: p.description,
                address: p.address,
                price: p.price,
                rentDueDay: currentContract?.payment_due_day || null,
                increaseRate: null,
                increaseFrequency: null,
                contractStartDate: currentContract?.start_date || null,
                contractEndDate: currentContract?.end_date || null,
                tenantName: 'Inquilino', 
                tenantEmail: '',
                tenantPhone: '',
                cbuAlias: null,
                notifyRentExpiry: false,
                notifyPunitiveInterests: false,
                contract: currentContract?.contract_data || null, 
                photoUrl: p.images && p.images.length > 0 ? p.images[0] : null,
                status: p.status,
                paymentStatus: currentContract?.status === 'activo' ? 'al_dia' : 'pendiente' 
            };
        });
    },

    addProperty: async (property) => {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const dbProperty = {
            owner_id: user.id,
            title: property.address || 'Nueva Propiedad',
            description: '',
            address: property.address,
            price: property.price || 0,
            images: property.photoUrl ? [property.photoUrl] : [],
            status: 'alquilada' 
        };

        const { data, error } = await window.supabaseClient
            .from('properties')
            .insert([dbProperty])
            .select();

        if (error) {
            console.error("Error adding property:", error);
            throw error;
        }
        return data[0];
    },

    deleteProperty: async (id) => {
        const { error } = await window.supabaseClient
            .from('properties')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting property:", error);
            throw error;
        }
    },

    updatePaymentStatus: async (propertyId, status) => {
        // En el nuevo esquema el estado de pago dependería de los contratos o los pagos en sí.
        // Simulamos el éxito para mantener compatibilidad con UI.
        console.warn('updatePaymentStatus no hace nada en DB por ahora (requiere tabla de pagos).');
    },

    // Finances
    calculateTotalIncome: async () => {
        const { data, error } = await window.supabaseClient
            .from('properties')
            .select('price');
        
        if (error) return 0;
        return data.reduce((total, p) => total + (parseFloat(p.price) || 0), 0);
    },

    // Tenants Management
    getTenants: async () => {
        const { data, error } = await window.supabaseClient
            .from('contracts')
            .select(`
                id, 
                monthly_rent, 
                payment_due_day, 
                contract_data, 
                end_date, 
                status,
                property_id,
                properties (address),
                profiles!tenant_id (full_name, email)
            `)
            .eq('status', 'activo');

        if (error) {
            console.error("Error fetching tenants:", error);
            return [];
        }

        return data.map(c => ({
            id: c.tenant_id || c.id,
            name: c.profiles?.full_name || 'Inquilino',
            email: c.profiles?.email || '',
            phone: '',
            propertyAddress: c.properties?.address || 'Sin dirección',
            rent: c.monthly_rent,
            status: c.status === 'activo' ? 'al_dia' : 'pendiente',
            rentDueDay: c.payment_due_day,
            contract: c.contract_data,
            contractEnd: c.end_date
        }));
    },

    // Payments Management (Mock)
    getPayments: () => {
        return []; 
    },
    
    getMockPayments: async () => {
         const tenants = await DataManager.getTenants();
         if (tenants.length === 0) return [];

         const payments = [];
         const methods = ['Efectivo', 'Transferencia', 'Depósito'];
 
         tenants.forEach(t => {
             payments.push({
                 id: t.id + '-pay',
                 date: new Date().toISOString().split('T')[0],
                 tenantId: t.id,
                 tenantName: t.name,
                 propertyId: t.id, 
                 propertyAddress: t.propertyAddress,
                 method: methods[Math.floor(Math.random() * methods.length)],
                 amount: parseFloat(t.rent) || 0,
                 status: t.status === 'al_dia' ? 'Pagado' : (t.status === 'atrasado' ? 'Atrasado' : 'Pendiente')
             });
         });
         return payments;
    },

    getPaymentStats: async () => {
        const payments = await DataManager.getMockPayments();
        const totalPaid = payments
            .filter(p => p.status === 'Pagado')
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);
        
        const pendingCount = payments.filter(p => p.status === 'Pendiente' || p.status === 'Atrasado').length;
        
        return {
            totalPaid,
            pendingCount,
            totalTransactions: payments.length
        };
    },

    getLateTenantsCount: async () => {
        const payments = await DataManager.getMockPayments();
        const lateSet = new Set(payments.filter(p => p.status === 'Atrasado').map(p => p.tenantId));
        return lateSet.size;
    },

    // Marketplace Operations
    addMarketplaceProperty: async (propertyData) => {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const descriptionText = propertyData.descripcionAviso || '';
        const operationText = propertyData.operacion ? `[${propertyData.operacion.toUpperCase()}] ` : '';
        const fullTitle = propertyData.tituloAviso || `${operationText}${propertyData.tipoPropiedad} en ${propertyData.ciudad}`;
        
        const addressParts = [propertyData.calleAltura, propertyData.barrio, propertyData.ciudad, propertyData.provincia].filter(Boolean);
        const fullAddress = addressParts.join(', ') || 'No especificado';
        
        const extraInfo = {
            operacion: propertyData.operacion || 'venta',
            tipo: propertyData.tipoPropiedad || 'departamento',
            piso: propertyData.piso || null,
            depto: propertyData.depto || null,
            ambientes: propertyData.ambientes,
            dormitorios: propertyData.dormitorios,
            banos: propertyData.banos,
            sup_cubierta: propertyData.supCubierta,
            moneda: propertyData.moneda || 'ARS'
        };

        const finalDescription = `${descriptionText}\n\nDetalles: ${JSON.stringify(extraInfo)}`;

        const dbProperty = {
            owner_id: user.id,
            title: fullTitle,
            description: finalDescription,
            address: fullAddress,
            price: parseFloat(propertyData.precio) || 0,
            status: 'disponible',
            images: propertyData.multimedia?.fotos || []
        };

        const { data, error } = await window.supabaseClient
            .from('properties')
            .insert([dbProperty])
            .select();

        if (error) {
            console.error("Error adding marketplace property:", error);
            throw error;
        }

        const newProperty = data[0];

        // Process and upload images
        if (propertyData.photos && propertyData.photos.length > 0) {
            try {
                const optimizeImageOnClient = (file) => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            const img = new Image();
                            img.onload = function() {
                                const canvas = document.createElement('canvas');
                                let width = img.width;
                                let height = img.height;
                                const max_width = 1920;
                                if (width > max_width) {
                                    height = Math.round((height * max_width) / width);
                                    width = max_width;
                                }
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0, width, height);
                                canvas.toBlob((blob) => {
                                    resolve(blob);
                                }, 'image/webp', 0.8);
                            };
                            img.src = e.target.result;
                        };
                        reader.readAsDataURL(file);
                    });
                };

                const uploadPromises = propertyData.photos.map(async (file, index) => {
                    const optimizedBlob = await optimizeImageOnClient(file);
                    const fileName = `${Date.now()}-${index}.webp`;
                    const storagePath = `propiedades/${newProperty.id}/${fileName}`;
                    
                    const { data: storageData, error: storageError } = await window.supabaseClient
                        .storage
                        .from('propiedades_multimedia')
                        .upload(storagePath, optimizedBlob, {
                            contentType: 'image/webp',
                            upsert: false
                        });

                    if (storageError) throw storageError;

                    const { data: publicUrlData } = window.supabaseClient
                        .storage
                        .from('propiedades_multimedia')
                        .getPublicUrl(storagePath);

                    return {
                        propiedad_id: newProperty.id,
                        url: publicUrlData.publicUrl,
                        storage_path: storagePath,
                        orden: index + 1
                    };
                });

                const uploadedImagesMetadata = await Promise.all(uploadPromises);
                
                const { error: dbError } = await window.supabaseClient
                    .from('propiedad_imagenes')
                    .insert(uploadedImagesMetadata);
                    
                if (dbError) throw dbError;
                
                // Clear the temporary array now that we have uploaded them
                window.selectedPropertyPhotos = [];
                
            } catch (imgError) {
                console.error("Error procesando/subiendo imagenes:", imgError);
                // Procedemos igual ya que la propiedad se creó
            }
        }

        return newProperty;
    },

    getPublicMarketplaceProperties: async (limit = 12) => {
        const { data, error } = await window.supabaseClient
            .from('properties')
            .select(`
                id, title, description, address, price, status, images, created_at,
                propiedad_imagenes (url, orden)
            `)
            .eq('status', 'disponible')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching marketplace properties:", error);
            return [];
        }
        return data || [];
    },

    // ==========================================
    // MOCK DATA ENGINE & STORAGE PERSISTENCE
    // ==========================================
    _STORAGE_KEYS: {
        APPLICATIONS: 'habitat_applications_v1',
        VISITS: 'habitat_visits_v1',
        CONTRACTS: 'habitat_contracts_v1',
        PAYMENTS: 'habitat_payments_v1',
        TICKETS: 'habitat_tickets_v1'
    },

    _initMockStorage: function() {
        if (!localStorage.getItem(this._STORAGE_KEYS.APPLICATIONS)) {
            const initialApplications = [
                {
                    id: 'app-1',
                    property_id: 'prop-101',
                    property_title: 'Departamento 2 Ambientes en Belgrano',
                    property_address: 'Av. Cabildo 1845, 3º B, CABA',
                    tenant_id: 'tenant-100',
                    tenant_name: 'Carlos Gómez',
                    tenant_email: 'carlos.gomez@gmail.com',
                    tenant_phone: '+54 9 11 4567-8901',
                    income_proof: 'Recibo de sueldo - $950.000 / mes',
                    message: 'Hola! Me interesa mucho la propiedad. Tengo garantía finaer y puedo ingresar este mismo mes.',
                    status: 'pendiente',
                    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
                },
                {
                    id: 'app-2',
                    property_id: 'prop-101',
                    property_title: 'Departamento 2 Ambientes en Belgrano',
                    property_address: 'Av. Cabildo 1845, 3º B, CABA',
                    tenant_id: 'tenant-101',
                    tenant_name: 'Mariana López',
                    tenant_email: 'mariana.lopez@yahoo.com',
                    tenant_phone: '+54 9 11 8899-2211',
                    income_proof: 'Monotributo Cat F + Garantía propietaria',
                    message: 'Buenas tardes, quisiéramos coordinar para firmar contrato si está disponible.',
                    status: 'pendiente',
                    created_at: new Date(Date.now() - 86400000 * 1).toISOString()
                }
            ];
            localStorage.setItem(this._STORAGE_KEYS.APPLICATIONS, JSON.stringify(initialApplications));
        }

        if (!localStorage.getItem(this._STORAGE_KEYS.VISITS)) {
            const initialVisits = [
                {
                    id: 'vis-1',
                    property_id: 'prop-101',
                    property_title: 'Departamento 2 Ambientes en Belgrano',
                    property_address: 'Av. Cabildo 1845, 3º B, CABA',
                    visitor_name: 'Carlos Gómez',
                    visitor_email: 'carlos.gomez@gmail.com',
                    visitor_phone: '+54 9 11 4567-8901',
                    visit_date: '2026-07-29',
                    visit_time: '16:30 hs',
                    status: 'programada',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'vis-2',
                    property_id: 'prop-102',
                    property_title: 'PH 3 Ambientes con Terraza en Palermo',
                    property_address: 'Honduras 4820, Palermo, CABA',
                    visitor_name: 'Lucía Benítez',
                    visitor_email: 'lucia.b@gmail.com',
                    visitor_phone: '+54 9 11 3344-5566',
                    visit_date: '2026-07-20',
                    visit_time: '11:00 hs',
                    status: 'realizada',
                    created_at: new Date(Date.now() - 86400000 * 7).toISOString()
                }
            ];
            localStorage.setItem(this._STORAGE_KEYS.VISITS, JSON.stringify(initialVisits));
        }

        if (!localStorage.getItem(this._STORAGE_KEYS.CONTRACTS)) {
            const initialContracts = [
                {
                    id: 'contract-1',
                    property_id: 'prop-200',
                    property_title: 'Departamento 3 Ambientes con Balcón',
                    property_address: 'Av. Santa Fe 2450, 4º B, Recoleta, CABA',
                    property_image: 'img/property-1.jpg',
                    owner_name: 'Ana Martínez',
                    owner_email: 'propietario@habitat.com',
                    tenant_id: 'tenant-100',
                    tenant_name: 'Carlos Gómez',
                    tenant_email: 'inquilino@habitat.com',
                    tenant_phone: '+54 9 11 4567-8901',
                    monthly_rent: 380000,
                    payment_due_day: 10,
                    punitive_daily_rate: 0.5, // 0.5% diario por mora
                    adjustment_index: 'IPC', // IPC o ICL
                    adjustment_frequency_months: 3, // Trimestral
                    last_adjustment_date: '2026-04-01',
                    next_adjustment_date: '2026-07-01',
                    status: 'activo',
                    cbu_alias: 'HABITAT.RECOLETA.MP'
                }
            ];
            localStorage.setItem(this._STORAGE_KEYS.CONTRACTS, JSON.stringify(initialContracts));
        }

        if (!localStorage.getItem(this._STORAGE_KEYS.PAYMENTS)) {
            const initialPayments = [
                {
                    id: 'pay-2026-07',
                    contract_id: 'contract-1',
                    period: 'Julio 2026',
                    amount_base: 380000,
                    due_date: '2026-07-10',
                    status: 'pendiente', // 'pendiente', 'pagado'
                    payment_method: null, // 'Transferencia', 'Efectivo', 'Mercado Pago'
                    receipt_url: null,
                    is_punitive_waived: false,
                    paid_at: null,
                    invoice_sent_at: null
                },
                {
                    id: 'pay-2026-06',
                    contract_id: 'contract-1',
                    period: 'Junio 2026',
                    amount_base: 380000,
                    due_date: '2026-06-10',
                    status: 'pagado',
                    payment_method: 'Transferencia',
                    receipt_url: 'uploads/comprobante_junio.pdf',
                    is_punitive_waived: false,
                    paid_at: '2026-06-08T14:20:00Z',
                    invoice_sent_at: '2026-06-08T15:00:00Z'
                }
            ];
            localStorage.setItem(this._STORAGE_KEYS.PAYMENTS, JSON.stringify(initialPayments));
        }

        if (!localStorage.getItem(this._STORAGE_KEYS.TICKETS)) {
            const initialTickets = [
                {
                    id: 'tkt-1',
                    contract_id: 'contract-1',
                    property_address: 'Av. Santa Fe 2450, 4º B, Recoleta',
                    tenant_name: 'Carlos Gómez',
                    title: 'Pérdida de agua bajo el lavamanos del baño',
                    category: 'Plomería',
                    priority: 'Alta',
                    description: 'Comenzó a gotear la cañería del lavamanos ayer a la noche. Coloqué un balde pero se llena rápido.',
                    photo_url: null,
                    status: 'en_proceso', // 'abierto', 'en_proceso', 'resuelto'
                    landlord_response: 'El plomero se comunicará hoy por la tarde para coordinar el arreglo.',
                    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
                }
            ];
            localStorage.setItem(this._STORAGE_KEYS.TICKETS, JSON.stringify(initialTickets));
        }
    },

    // ------------------------------------------
    // Postulaciones (Applications)
    // ------------------------------------------
    getApplications: async function() {
        this._initMockStorage();
        const data = localStorage.getItem(this._STORAGE_KEYS.APPLICATIONS);
        return data ? JSON.parse(data) : [];
    },

    submitApplication: async function(appData) {
        this._initMockStorage();
        const apps = await this.getApplications();
        const newApp = {
            id: 'app-' + Date.now(),
            property_id: appData.propertyId || 'prop-101',
            property_title: appData.propertyTitle || 'Propiedad en Alquiler',
            property_address: appData.propertyAddress || 'Dirección no especificada',
            tenant_id: appData.tenantId || 'tenant-current',
            tenant_name: appData.tenantName || 'Inquilino Postulante',
            tenant_email: appData.tenantEmail || 'inquilino@email.com',
            tenant_phone: appData.tenantPhone || '+54 9 11 0000-0000',
            income_proof: appData.incomeProof || 'Comprobante adjuntado',
            message: appData.message || '',
            status: 'pendiente',
            created_at: new Date().toISOString()
        };
        apps.unshift(newApp);
        localStorage.setItem(this._STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
        return newApp;
    },

    acceptApplication: async function(appId) {
        this._initMockStorage();
        const apps = await this.getApplications();
        const app = apps.find(a => a.id === appId);
        if (!app) throw new Error("Postulación no encontrada");

        // Mark this app as accepted and others for the same property as rejected
        apps.forEach(a => {
            if (a.id === appId) {
                a.status = 'aceptada';
            } else if (a.property_id === app.property_id && a.status === 'pendiente') {
                a.status = 'rechazada';
            }
        });
        localStorage.setItem(this._STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));

        // Create new active contract
        const contracts = JSON.parse(localStorage.getItem(this._STORAGE_KEYS.CONTRACTS) || '[]');
        const newContract = {
            id: 'contract-' + Date.now(),
            property_id: app.property_id,
            property_title: app.property_title,
            property_address: app.property_address,
            property_image: 'img/property-1.jpg',
            owner_name: 'Propietario',
            owner_email: 'propietario@habitat.com',
            tenant_id: app.tenant_id,
            tenant_name: app.tenant_name,
            tenant_email: app.tenant_email,
            tenant_phone: app.tenant_phone,
            monthly_rent: 380000,
            payment_due_day: 10,
            punitive_daily_rate: 0.5,
            adjustment_index: 'IPC',
            adjustment_frequency_months: 3,
            last_adjustment_date: new Date().toISOString().split('T')[0],
            next_adjustment_date: new Date(Date.now() + 86400000 * 90).toISOString().split('T')[0],
            status: 'activo',
            cbu_alias: 'HABITAT.ALQUILER.MP'
        };
        contracts.unshift(newContract);
        localStorage.setItem(this._STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));

        // Create current month payment record for this new contract
        const payments = JSON.parse(localStorage.getItem(this._STORAGE_KEYS.PAYMENTS) || '[]');
        payments.unshift({
            id: 'pay-' + Date.now(),
            contract_id: newContract.id,
            period: 'Julio 2026',
            amount_base: 380000,
            due_date: '2026-07-10',
            status: 'pendiente',
            payment_method: null,
            receipt_url: null,
            is_punitive_waived: false,
            paid_at: null,
            invoice_sent_at: null
        });
        localStorage.setItem(this._STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

        return app;
    },

    rejectApplication: async function(appId) {
        this._initMockStorage();
        const apps = await this.getApplications();
        const app = apps.find(a => a.id === appId);
        if (app) {
            app.status = 'rechazada';
            localStorage.setItem(this._STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
        }
        return app;
    },

    // ------------------------------------------
    // Visitas Programadas (Scheduled Visits)
    // ------------------------------------------
    getVisits: async function() {
        this._initMockStorage();
        const data = localStorage.getItem(this._STORAGE_KEYS.VISITS);
        return data ? JSON.parse(data) : [];
    },

    scheduleVisit: async function(visitData) {
        this._initMockStorage();
        const visits = await this.getVisits();
        const newVisit = {
            id: 'vis-' + Date.now(),
            property_id: visitData.propertyId || 'prop-101',
            property_title: visitData.propertyTitle || 'Propiedad',
            property_address: visitData.propertyAddress || 'Dirección de visita',
            visitor_name: visitData.visitorName || 'Visitante Interesado',
            visitor_email: visitData.visitorEmail || 'visitante@email.com',
            visitor_phone: visitData.visitorPhone || '+54 9 11 1122-3344',
            visit_date: visitData.visitDate || new Date().toISOString().split('T')[0],
            visit_time: visitData.visitTime || '16:00 hs',
            status: 'programada',
            created_at: new Date().toISOString()
        };
        visits.unshift(newVisit);
        localStorage.setItem(this._STORAGE_KEYS.VISITS, JSON.stringify(visits));
        return newVisit;
    },

    cancelVisit: async function(visitId) {
        this._initMockStorage();
        const visits = await this.getVisits();
        const visit = visits.find(v => v.id === visitId);
        if (visit) {
            visit.status = 'cancelada';
            localStorage.setItem(this._STORAGE_KEYS.VISITS, JSON.stringify(visits));
        }
        return visit;
    },

    // ------------------------------------------
    // Contrato Activo, Pagos y Punitorios
    // ------------------------------------------
    getActiveContract: async function() {
        this._initMockStorage();
        const contracts = JSON.parse(localStorage.getItem(this._STORAGE_KEYS.CONTRACTS) || '[]');
        return contracts.find(c => c.status === 'activo') || contracts[0] || null;
    },

    getCurrentPayment: async function(contractId) {
        this._initMockStorage();
        const payments = JSON.parse(localStorage.getItem(this._STORAGE_KEYS.PAYMENTS) || '[]');
        const contractPayments = payments.filter(p => p.contract_id === contractId);
        return contractPayments.find(p => p.status === 'pendiente') || contractPayments[0] || null;
    },

    calculatePunitiveInterests: function(contract, payment) {
        if (!contract || !payment) return { daysLate: 0, dailyRate: 0, punitiveAmount: 0, totalAmount: 0 };
        
        if (payment.status === 'pagado' || payment.is_punitive_waived) {
            return {
                daysLate: 0,
                dailyRate: contract.punitive_daily_rate || 0.5,
                punitiveAmount: 0,
                totalAmount: payment.amount_base
            };
        }

        const today = new Date();
        const dueDate = new Date(payment.due_date);
        
        // Calculate days past due
        const diffTime = today - dueDate;
        const daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        if (daysLate <= 0) {
            return {
                daysLate: 0,
                dailyRate: contract.punitive_daily_rate || 0.5,
                punitiveAmount: 0,
                totalAmount: payment.amount_base
            };
        }

        const dailyRate = contract.punitive_daily_rate || 0.5; // % per day
        const punitiveAmount = Math.round(payment.amount_base * (dailyRate / 100) * daysLate);
        const totalAmount = payment.amount_base + punitiveAmount;

        return {
            daysLate,
            dailyRate,
            punitiveAmount,
            totalAmount
        };
    },

    waivePunitiveInterests: async function(paymentId) {
        this._initMockStorage();
        const payments = JSON.parse(localStorage.getItem(this._STORAGE_KEYS.PAYMENTS) || '[]');
        const payment = payments.find(p => p.id === paymentId);
        if (payment) {
            payment.is_punitive_waived = true;
            localStorage.setItem(this._STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
        }
        return payment;
    },

    markPaymentAsPaid: async function(paymentId, method = 'Transferencia') {
        this._initMockStorage();
        const payments = JSON.parse(localStorage.getItem(this._STORAGE_KEYS.PAYMENTS) || '[]');
        const payment = payments.find(p => p.id === paymentId);
        if (payment) {
            payment.status = 'pagado';
            payment.payment_method = method;
            payment.paid_at = new Date().toISOString();
            localStorage.setItem(this._STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
        }
        return payment;
    },

    sendInvoiceEmail: async function(paymentId) {
        this._initMockStorage();
        const payments = JSON.parse(localStorage.getItem(this._STORAGE_KEYS.PAYMENTS) || '[]');
        const payment = payments.find(p => p.id === paymentId);
        if (payment) {
            payment.invoice_sent_at = new Date().toISOString();
            localStorage.setItem(this._STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
        }
        return {
            success: true,
            invoiceNumber: 'FAC-' + Math.floor(100000 + Math.random() * 900000),
            sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    },

    applyIndexAdjustment: async function(contractId, indexType, frequencyMonths) {
        this._initMockStorage();
        const contracts = JSON.parse(localStorage.getItem(this._STORAGE_KEYS.CONTRACTS) || '[]');
        const contract = contracts.find(c => c.id === contractId);
        if (!contract) throw new Error("Contrato no encontrado");

        // Rates table simulation
        const rates = {
            IPC: 12.8, // +12.8% acumulado período
            ICL: 10.5  // +10.5% acumulado período
        };

        const pct = rates[indexType] || 12.0;
        const oldRent = contract.monthly_rent;
        const newRent = Math.round(oldRent * (1 + pct / 100));

        contract.monthly_rent = newRent;
        contract.adjustment_index = indexType;
        contract.adjustment_frequency_months = frequencyMonths;
        contract.last_adjustment_date = new Date().toISOString().split('T')[0];
        
        localStorage.setItem(this._STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));

        // Update pending payment amount if exists
        const payments = JSON.parse(localStorage.getItem(this._STORAGE_KEYS.PAYMENTS) || '[]');
        const pendingPay = payments.find(p => p.contract_id === contractId && p.status === 'pendiente');
        if (pendingPay) {
            pendingPay.amount_base = newRent;
            localStorage.setItem(this._STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
        }

        return {
            oldRent,
            newRent,
            pct,
            indexType
        };
    },

    // ------------------------------------------
    // Tickets de Mantenimiento
    // ------------------------------------------
    getMaintenanceTickets: async function() {
        this._initMockStorage();
        const data = localStorage.getItem(this._STORAGE_KEYS.TICKETS);
        return data ? JSON.parse(data) : [];
    },

    createMaintenanceTicket: async function(ticketData) {
        this._initMockStorage();
        const tickets = await this.getMaintenanceTickets();
        const contract = await this.getActiveContract();
        
        const newTicket = {
            id: 'tkt-' + Date.now(),
            contract_id: contract ? contract.id : 'contract-1',
            property_address: contract ? contract.property_address : 'Propiedad alquilada',
            tenant_name: ticketData.tenantName || 'Carlos Gómez',
            title: ticketData.title || 'Solicitud de reparación',
            category: ticketData.category || 'General',
            priority: ticketData.priority || 'Media',
            description: ticketData.description || '',
            photo_url: ticketData.photoUrl || null,
            status: 'abierto',
            landlord_response: null,
            created_at: new Date().toISOString()
        };

        tickets.unshift(newTicket);
        localStorage.setItem(this._STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
        return newTicket;
    },

    updateTicketStatus: async function(ticketId, newStatus, responseText) {
        this._initMockStorage();
        const tickets = await this.getMaintenanceTickets();
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
            if (newStatus) ticket.status = newStatus;
            if (responseText !== undefined) ticket.landlord_response = responseText;
            localStorage.setItem(this._STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
        }
        return ticket;
    }
};

window.DataManager = DataManager;

