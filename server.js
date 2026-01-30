const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { pool } = require('./db_config');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve Static Files
app.use(express.static(path.join(__dirname)));

// API Endpoints

// 1. Get All Properties (with joined data)
app.get('/api/properties', (req, res) => {
    const query = `
        SELECT 
            p.*, 
            o.name as ownerName, o.email as ownerEmail, o.phone as ownerPhone, o.cbu_alias as cbuAlias,
            t.name as tenantName, t.email as tenantEmail, t.phone as tenantPhone,
            c.start_date, c.end_date, c.rent_due_day, c.increase_rate, c.increase_frequency_months, 
            c.notify_rent_expiry, c.notify_punitive_interests, c.contract_file_url
        FROM properties p
        LEFT JOIN owners o ON p.owner_id = o.id
        LEFT JOIN contracts c ON p.id = c.property_id
        LEFT JOIN tenants t ON c.tenant_id = t.id
    `;
    
    pool.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Map results to match frontend object structure
        const properties = results.map(row => ({
            id: row.id,
            address: row.address,
            price: row.current_rent || 0, // In contract, or we might need a base price in property if no contract
            photoUrl: row.photo_url,
            ownerName: row.ownerName,
            ownerEmail: row.ownerEmail,
            ownerPhone: row.ownerPhone,
            tenantName: row.tenantName,
            tenantEmail: row.tenantEmail,
            tenantPhone: row.tenantPhone,
            contractStartDate: row.start_date ? row.start_date.toISOString().split('T')[0] : null,
            contractEndDate: row.end_date ? row.end_date.toISOString().split('T')[0] : null,
            rentDueDay: row.rent_due_day,
            increaseRate: row.increase_rate,
            increaseFrequency: row.increase_frequency_months,
            cbuAlias: row.cbuAlias,
            notifyRentExpiry: row.notify_rent_expiry,
            notifyPunitiveInterests: row.notify_punitive_interests,
            contract: row.contract_file_url ? { name: 'Contrato', data: row.contract_file_url } : null
        }));
        
        res.json(properties);
    });
});

const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// Helper: Save Base64 to File
function saveBase64(base64String, prefix) {
    if (!base64String || !base64String.startsWith('data:')) return base64String; // Return as is if not base64

    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const type = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    
    // Guess extension
    let ext = 'bin';
    if (type.includes('jpeg') || type.includes('jpg')) ext = 'jpg';
    if (type.includes('png')) ext = 'png';
    if (type.includes('pdf')) ext = 'pdf';
    
    const filename = `${prefix}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    
    fs.writeFileSync(filePath, buffer);
    return `uploads/${filename}`;
}

// 2. Add New Property (Transaction)
app.post('/api/properties', async (req, res) => {
    const data = req.body;
    const connection = await pool.promise().getConnection();

    try {
        await connection.beginTransaction();

        // Handle File Uploads
        const photoPath = saveBase64(data.photoUrl, 'prop-photo');
        let contractPath = null;
        if (data.contract && data.contract.data) {
            contractPath = saveBase64(data.contract.data, 'contract');
        }

        // 1. Insert Owner
        const [ownerResult] = await connection.query(
            'INSERT INTO owners (name, email, phone, cbu_alias) VALUES (?, ?, ?, ?)',
            [data.ownerName, data.ownerEmail, data.ownerPhone, data.cbuAlias]
        );
        const ownerId = ownerResult.insertId;

        // 2. Insert Property
        const [propResult] = await connection.query(
            'INSERT INTO properties (address, owner_id, photo_url) VALUES (?, ?, ?)',
            [data.address, ownerId, photoPath]
        );
        const propertyId = propResult.insertId;

        // 3. Insert Tenant
        const [tenantResult] = await connection.query(
            'INSERT INTO tenants (name, email, phone) VALUES (?, ?, ?)',
            [data.tenantName, data.tenantEmail, data.tenantPhone]
        );
        const tenantId = tenantResult.insertId;

        // 4. Insert Contract
        await connection.query(
            `INSERT INTO contracts 
            (property_id, tenant_id, start_date, end_date, current_rent, rent_due_day, increase_rate, increase_frequency_months, notify_rent_expiry, notify_punitive_interests, contract_file_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                propertyId, 
                tenantId, 
                data.contractStartDate, 
                data.contractEndDate, 
                data.price, 
                data.rentDueDay, 
                data.increaseRate, 
                data.increaseFrequency, 
                data.notifyRentExpiry ? 1 : 0, 
                data.notifyPunitiveInterests ? 1 : 0,
                contractPath
            ]
        );

        await connection.commit();
        res.json({ success: true, message: 'Propiedad guardada exitosamente' });

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Error al guardar la propiedad' });
    } finally {
        connection.release();
    }
});

// 3. Tenants List
app.get('/api/tenants', (req, res) => {
    const query = `
        SELECT t.*, p.address as propertyAddress, c.end_date, c.current_rent
        FROM tenants t
        JOIN contracts c ON t.id = c.tenant_id
        JOIN properties p ON c.property_id = p.id
    `;
    pool.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const tenants = results.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            propertyAddress: row.propertyAddress,
            contractEnd: row.end_date ? row.end_date.toISOString().split('T')[0] : null,
            rent: row.current_rent
        }));
        res.json(tenants);
    });
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
