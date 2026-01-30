/**
 * Data Management Module
 * Handles localStorage operations and mock data.
 */

const STORAGE_KEYS = {
    USER: 'rental_app_user',
    PROPERTIES: 'rental_app_properties'
};

const API_BASE_URL = 'http://localhost:3000'; // Ensure we hit the backend even if running on Live Server

const DataManager = {
    // User Management
    login: (username, password) => {
        // Mock login remains client-side for now as requested schema stored hash but logic was not fully moved yet
        // For full security this should effectively call an API
        if (username && password) {
            const user = { username, name: username };
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
            return user;
        }
        return null;
    },

    logout: () => {
        localStorage.removeItem(STORAGE_KEYS.USER);
    },

    getCurrentUser: () => {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
    },

    // Property Management
    getProperties: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/properties`);
            if (!response.ok) throw new Error('Failed to fetch properties');
            return await response.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    addProperty: async (property) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/properties`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(property)
            });
            if (!response.ok) throw new Error('Failed to save property');
            return await response.json();
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    deleteProperty: async (id) => {
        // Implement API call if backend supports it
        // await fetch(`${API_BASE_URL}/api/properties/${id}`, { method: 'DELETE' });
        console.warn("Delete not fully implemented in backend yet");
    },

    // Finances
    calculateTotalIncome: async () => {
        const properties = await DataManager.getProperties();
        return properties.reduce((total, p) => total + (parseFloat(p.price) || 0), 0);
    },

    // Tenants Management
    getTenants: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/tenants`);
            if (!response.ok) throw new Error('Failed to fetch tenants');
            return await response.json();
        } catch (error) {
            console.error(error);
            // Fallback
            return [];
        }
    },

    // Payments Management
    getPayments: () => {
        // Keeping MOCK data for payments as requested schema didn't prioritize payments table yet
        // and user asked for "Tabla inquilinos y Tabla contratos" specifically.
        // We will mock this based on tenants if possible or keep random generator
        return []; 
    },
    
    // Mock for now until Payments table is added
    getMockPayments: async () => {
         // Re-implementing the mock logic but async to match interface
         const tenants = await DataManager.getTenants();
         const payments = [];
         const statuses = ['Pagado', 'Pendiente', 'Atrasado'];
         const methods = ['Efectivo', 'Transferencia', 'Depósito'];
 
         tenants.forEach(t => {
             // Last month payment
             payments.push({
                 id: Math.random().toString(36).substr(2, 9),
                 date: new Date().toISOString().split('T')[0],
                 tenantId: t.id,
                 tenantName: t.name,
                 propertyId: t.propertyId || 'N/A', // Adjust based on DB response
                 propertyAddress: t.propertyAddress,
                 method: methods[Math.floor(Math.random() * methods.length)],
                 amount: parseFloat(t.rent) || 0,
                 status: statuses[Math.floor(Math.random() * statuses.length)]
             });
         });
         return payments.sort((a, b) => new Date(b.date) - new Date(a.date));
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
