const mysql = require('mysql2');

const dbConfig = {
    host: 'localhost',
    user: 'root',      // CHANGE THIS if your MySQL user is different
    password: 'YOUR_PASSWORD_HERE', // CHANGE THIS to your MySQL password
    multipleStatements: true, // Needed for running schema.sql script
    database: 'prop_manager_db' // Default database
};

// Create a connection specifically for creating the DB if it doesn't exist
const initialConnection = mysql.createConnection({
    ...dbConfig,
    database: undefined // Connect without DB selected first
});

const pool = mysql.createPool(dbConfig);

module.exports = { pool, initialConnection, dbConfig };
