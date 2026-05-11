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
    }
};

window.DataManager = DataManager;
