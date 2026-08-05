const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve Static Files
app.use(express.static(path.join(__dirname)));

// API Endpoints - Supabase Status & Health
app.get('/api/status', async (req, res) => {
    try {
        const { data, error } = await supabase.from('Propiedad').select('id_propiedad').limit(1);
        if (error) throw error;
        res.json({ status: 'connected', database: 'supabase', active: true });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// API Endpoint - Google Maps Key
app.get('/api/google-maps-key', (req, res) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || '';
    res.json({ apiKey });
});

// API Endpoint - Supabase Config
app.get('/api/supabase-config', (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
    res.json({ url: supabaseUrl, key: supabaseAnonKey });
});

// API Endpoint - ARCA WX Padrón Integration
app.post('/api/arca-padron', async (req, res) => {
    try {
        const arcaHandler = (await import('./api/arca-padron.js')).default;
        await arcaHandler(req, res);
    } catch (err) {
        console.error('Error en /api/arca-padron:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

// API Endpoint - Didit KYC Create Session Integration
app.post('/api/create-session', async (req, res) => {
    try {
        const createSessionHandler = (await import('./api/create-session.js')).default;
        await createSessionHandler(req, res);
    } catch (err) {
        console.error('Error en /api/create-session:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

// API Endpoint - Didit KYC Webhook Integration
app.post('/api/webhook', async (req, res) => {
    try {
        const webhookHandler = (await import('./api/webhook.js')).default;
        await webhookHandler(req, res);
    } catch (err) {
        console.error('Error en /api/webhook:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

// API Endpoint - BCRA Central de Deudores Integration
app.post('/api/bcra-deudores', async (req, res) => {
    try {
        const bcraHandler = (await import('./api/bcra-deudores.js')).default;
        await bcraHandler(req, res);
    } catch (err) {
        console.error('Error en /api/bcra-deudores:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});





const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// Helper: Save Base64 to File (Can be adapted for Supabase Storage later)
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


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
