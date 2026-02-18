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

    // Property Management
    getProperties: async () => {
        const { data, error } = await window.supabaseClient
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching properties:", error);
            return [];
        }

        // Map DB columns to Frontend structure
        return data.map(p => ({
            id: p.id,
            title: p.title, 
            description: p.description,
            address: p.address,
            price: p.price,
            rentDueDay: p.rent_due_day,
            increaseRate: p.increase_rate,
            increaseFrequency: p.increase_frequency,
            contractStartDate: p.contract_start,
            contractEndDate: p.contract_end,
            tenantName: p.tenant_name,
            tenantEmail: p.tenant_email,
            tenantPhone: p.tenant_phone,
            cbuAlias: p.cbu_alias,
            notifyRentExpiry: p.notify_rent_expiry,
            notifyPunitiveInterests: p.notify_punitive_interests,
            contract: p.contract_data, 
            photoUrl: p.images && p.images.length > 0 ? p.images[0] : null,
            status: p.status,
            paymentStatus: p.payment_status 
        }));
    },

    addProperty: async (property) => {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Map Frontend structure to DB columns
        const dbProperty = {
            owner_id: user.id,
            address: property.address,
            price: property.price,
            rent_due_day: property.rentDueDay,
            increase_rate: property.increaseRate,
            increase_frequency: property.increaseFrequency,
            contract_start: property.contractStartDate,
            contract_end: property.contractEndDate,
            tenant_name: property.tenantName,
            tenant_email: property.tenantEmail,
            tenant_phone: property.tenantPhone,
            cbu_alias: property.cbuAlias,
            notify_rent_expiry: property.notifyRentExpiry,
            notify_punitive_interests: property.notifyPunitiveInterests,
            contract_data: property.contract,
            images: property.photoUrl ? [property.photoUrl] : [],
            status: 'alquilada', 
            payment_status: 'pendiente'
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
        const { error } = await window.supabaseClient
            .from('properties')
            .update({ payment_status: status })
            .eq('id', propertyId);

        if (error) {
             console.error("Error updating payment status:", error);
             throw error;
        }
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
            .from('properties')
            .select('id, address, tenant_name, tenant_email, tenant_phone, price, payment_status, rent_due_day')
            .not('tenant_name', 'is', null);

        if (error) {
            console.error("Error fetching tenants:", error);
            return [];
        }

        return data.map(t => ({
            id: t.id,
            name: t.tenant_name,
            email: t.tenant_email,
            phone: t.tenant_phone,
            propertyAddress: t.address,
            rent: t.price,
            status: t.payment_status,
            rentDueDay: t.rent_due_day
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
    }
};

window.DataManager = DataManager;

// Make DataManager global
window.DataManager = DataManager;
