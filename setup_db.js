const fs = require('fs');
const path = require('path');
const { initialConnection } = require('./db_config');

const schemaPath = path.join(__dirname, 'database', 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

console.log('Connecting to MySQL...');

initialConnection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        console.error('PLEASE CHECK: db_config.js to ensure user/password are correct.');
        process.exit(1);
    }

    console.log('Connected. Running schema...');

    initialConnection.query(schemaSql, (err, results) => {
        if (err) {
            console.error('Error executing schema:', err.message);
        } else {
            console.log('Database and tables created successfully!');
        }
        initialConnection.end();
    });
});
