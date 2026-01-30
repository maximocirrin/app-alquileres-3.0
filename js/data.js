/**
 * Data Management Module
 * Handles localStorage operations and mock data.
 */

const STORAGE_KEYS = {
    USER: 'rental_app_user',
    PROPERTIES: 'rental_app_properties'
};

const DataManager = {
    // User Management
    login: (username, password) => {
        // Mock login - accept any non-empty credentials
        if (username && password) {
            const user = { username, name: username }; // Simple mock user
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
    getProperties: () => {
        const propsStr = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
        return propsStr ? JSON.parse(propsStr) : [];
    },

    addProperty: (property) => {
        const properties = DataManager.getProperties();
        const newProperty = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            ...property
        };
        properties.push(newProperty);
        localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(properties));
        return newProperty;
    },

    deleteProperty: (id) => {
        let properties = DataManager.getProperties();
        properties = properties.filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(properties));
    },

    // Finances
    calculateTotalIncome: () => {
        const properties = DataManager.getProperties();
        return properties.reduce((total, p) => total + (parseFloat(p.price) || 0), 0);
    },

    // Tenants Management
    getTenants: () => {
        const properties = DataManager.getProperties();
        // Extract tenants from properties where they exist
        const tenants = properties.filter(p => p.tenantName).map(p => ({
            id: p.id, // Using property ID for simplicity in this link
            name: p.tenantName,
            email: p.tenantEmail || 'No informado',
            phone: p.tenantPhone || 'No informado',
            propertyId: p.id,
            propertyAddress: p.address,
            contractEnd: p.contractEndDate,
            rent: p.price
        }));
        return tenants;
    },

    // Payments Management
    getPayments: () => {
        // Mock consolidated payments data
        const tenants = DataManager.getTenants();
        const payments = [];
        const statuses = ['Pagado', 'Pendiente', 'Atrasado'];
        const methods = ['Efectivo', 'Transferencia', 'Depósito'];

        // Generate some random history
        tenants.forEach(t => {
            // Last month payment
            payments.push({
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString().split('T')[0], // Today
                tenantId: t.id,
                tenantName: t.name,
                propertyId: t.propertyId,
                propertyAddress: t.propertyAddress,
                method: methods[Math.floor(Math.random() * methods.length)],
                amount: t.rent,
                status: statuses[Math.floor(Math.random() * statuses.length)]
            });
            // Previous month
            const prevDate = new Date();
            prevDate.setMonth(prevDate.getMonth() - 1);
            payments.push({
                id: Math.random().toString(36).substr(2, 9),
                date: prevDate.toISOString().split('T')[0],
                tenantId: t.id,
                tenantName: t.name,
                propertyId: t.propertyId,
                propertyAddress: t.propertyAddress,
                method: 'Transferencia',
                amount: t.rent,
                status: 'Pagado'
            });
        });
        
        return payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    getPaymentStats: () => {
        const payments = DataManager.getPayments();
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

    getLateTenantsCount: () => {
        const payments = DataManager.getPayments();
        // Count unique tenants with 'Atrasado' status
        const lateSet = new Set(payments.filter(p => p.status === 'Atrasado').map(p => p.tenantId));
        return lateSet.size;
    }
};
