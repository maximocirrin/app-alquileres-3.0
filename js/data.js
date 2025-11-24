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
    }
};
