import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
// Contracts In-Memory Cache / Mock Store (Syncs with Supabase if available)
const mockContracts = [
    {
        id: 'CTR-2026-0891',
        contractNumber: 'CTR-2026-0891',
        title: 'Departamento 3 Ambientes con Balcón Aterrazado',
        propertyAddress: 'Av. Santa Fe 2450, Piso 7 "B", Recoleta, CABA',
        propertyCity: 'Recoleta, Buenos Aires',
        monthlyRent: 420000,
        currency: 'ARS',
        status: 'WAITING_TENANT',
        startDate: '2026-09-01',
        endDate: '2028-08-31',
        durationMonths: 24,
        paymentDueDay: 10,
        adjustmentIndex: 'IPC',
        adjustmentFrequencyMonths: 3,
        depositAmount: 420000,
        aliasCbu: 'HABITAT.RECOLETA.MP',
        tenant: {
            role: 'TENANT',
            name: 'Carlos Gómez',
            email: 'carlos.gomez@gmail.com',
            cuil: '20-38491029-4',
            hasSigned: false,
        },
        owner: {
            role: 'OWNER',
            name: 'María Florencia Rossi',
            email: 'mflorencia.rossi@outlook.com',
            cuil: '27-33918274-8',
            hasSigned: false,
        },
        broker: {
            name: 'Martín Palermo',
            license: 'CUCICBA Mat. 6842',
            agencyName: 'Palermo & Asociados Propiedades',
            email: 'contacto@palermoprop.com',
            phone: '+54 11 4821-9988',
        },
        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        createdAt: '2026-08-12T14:30:00Z',
        updatedAt: '2026-08-15T10:00:00Z',
    },
    {
        id: 'CTR-2026-0742',
        contractNumber: 'CTR-2026-0742',
        title: 'Semipiso 4 Ambientes en Torre con Amenities',
        propertyAddress: 'Av. del Libertador 4820, Piso 14, Belgrano, CABA',
        propertyCity: 'Belgrano, Buenos Aires',
        monthlyRent: 850000,
        currency: 'ARS',
        status: 'WAITING_OWNER',
        startDate: '2026-08-01',
        endDate: '2028-07-31',
        durationMonths: 24,
        paymentDueDay: 5,
        adjustmentIndex: 'ICL',
        adjustmentFrequencyMonths: 6,
        depositAmount: 850000,
        aliasCbu: 'HABITAT.BELGRANO.MP',
        tenant: {
            role: 'TENANT',
            name: 'Lucía Fernández',
            email: 'lucia.fernandez@tech.io',
            cuil: '27-39201948-3',
            hasSigned: true,
            signedAt: '2026-08-14T18:22:10Z',
            ipAddress: '181.44.120.55',
        },
        owner: {
            role: 'OWNER',
            name: 'Esteban Morales',
            email: 'esteban.morales@inversiones.com.ar',
            cuil: '20-29183746-1',
            hasSigned: false,
        },
        broker: {
            name: 'Valeria Sotomayor',
            license: 'CUCICBA Mat. 5120',
            agencyName: 'Habitat Real Estate Network',
            email: 'valeria@habitat.ar',
        },
        sha256Hash: '9f83c6b29f7988319f390076a91176b9dfa5fae8e60408544c4897c8d94e2402',
        createdAt: '2026-08-10T09:15:00Z',
        updatedAt: '2026-08-14T18:22:10Z',
    },
    {
        id: 'CTR-2026-0518',
        contractNumber: 'CTR-2026-0518',
        title: 'Loft Moderno en Palermo Hollywood',
        propertyAddress: 'Humboldt 1940, Piso 3 "A", Palermo, CABA',
        propertyCity: 'Palermo, Buenos Aires',
        monthlyRent: 390000,
        currency: 'ARS',
        status: 'SIGNED_AND_SEALED',
        startDate: '2026-07-01',
        endDate: '2028-06-30',
        durationMonths: 24,
        paymentDueDay: 10,
        adjustmentIndex: 'IPC',
        adjustmentFrequencyMonths: 4,
        depositAmount: 390000,
        aliasCbu: 'HABITAT.PALERMO.MP',
        tenant: {
            role: 'TENANT',
            name: 'Matías Rossi',
            email: 'matias.rossi@dev.com',
            cuil: '20-37829104-5',
            hasSigned: true,
            signedAt: '2026-06-28T11:15:00Z',
            ipAddress: '190.220.44.12',
        },
        owner: {
            role: 'OWNER',
            name: 'Gonzalo Benítez',
            email: 'gonzalo.benitez@empresa.com',
            cuil: '20-26491028-7',
            hasSigned: true,
            signedAt: '2026-06-29T16:40:00Z',
            ipAddress: '186.138.89.210',
        },
        broker: {
            name: 'Martín Palermo',
            license: 'CUCICBA Mat. 6842',
            agencyName: 'Palermo & Asociados Propiedades',
            email: 'contacto@palermoprop.com',
        },
        sha256Hash: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
        tsaTimestamp: '2026-06-29T16:40:12Z',
        tsaCertificateId: 'TSA-AR-2026-981042',
        qrVerificationUrl: 'https://habitat.ar/verificar/CTR-2026-0518',
        signedPdfUrl: '/api/contracts/CTR-2026-0518/download-signed',
        auditTrailPdfUrl: '/api/contracts/CTR-2026-0518/download-audit-trail',
        createdAt: '2026-06-25T10:00:00Z',
        updatedAt: '2026-06-29T16:40:12Z',
    }
];

// API Endpoint - List Contracts
app.get('/api/contracts', (req, res) => {
    const role = req.query.role || 'ALL';
    res.json(mockContracts);
});

// API Endpoint - Get Single Contract
app.get('/api/contracts/:id', (req, res) => {
    const found = mockContracts.find(c => String(c.id) === String(req.params.id));
    if (!found) {
        return res.status(404).json({ error: 'Contrato no encontrado' });
    }
    res.json(found);
});

// API Endpoint - Start Signature
app.post('/api/contracts/:id/start-signature', async (req, res) => {
    const contractId = req.params.id;
    const { role = 'TENANT', consentGiven, deviceMetadata = {}, signerName, signerCuil } = req.body;

    if (!consentGiven) {
        return res.status(400).json({ error: 'Consentimiento legal obligatorio no otorgado.' });
    }

    const diditApiKey = (process.env.DIDIT_API_KEY || '').trim();
    const diditWorkflowId = (process.env.DIDIT_WORKFLOW_ID_SIGNATURE || process.env.DIDIT_SIGNATURE_WORKFLOW_ID || process.env.DIDIT_WORKFLOW_ID || '').trim();
    const isWfConfigured = diditWorkflowId && !diditWorkflowId.startsWith('TU_WORKFLOW') && diditWorkflowId !== 'TU_WORKFLOW_ID_DE_DIDIT' && diditWorkflowId.length >= 6;

    let diditSessionUrl = `#mock-didit-liveness-session-${contractId}`;
    let sessionId = `sess_${contractId}_${role}_${Date.now()}`;
    let isMock = true;

    if (diditApiKey && isWfConfigured) {
        try {
            let diditRes = await fetch('https://verification.didit.me/v3/session/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': diditApiKey,
                    'Authorization': `Bearer ${diditApiKey}`
                },
                body: JSON.stringify({
                    workflow_id: diditWorkflowId,
                    vendor_data: `${contractId}_${role}_${signerCuil || 'CUIL'}`
                })
            });

            if (diditRes.status === 404) {
                diditRes = await fetch('https://api.didit.me/v1/session/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': diditApiKey,
                        'Authorization': `Bearer ${diditApiKey}`
                    },
                    body: JSON.stringify({
                        workflow_id: diditWorkflowId,
                        vendor_data: `${contractId}_${role}_${signerCuil || 'CUIL'}`
                    })
                });
            }

            if (diditRes.ok) {
                const diditData = await diditRes.json();
                diditSessionUrl = diditData.url || diditData.session_url || diditData.verification_url;
                sessionId = diditData.session_id || diditData.id || sessionId;
                isMock = false;
            }
        } catch (err) {
            console.warn('[Express start-signature] Error conectando con Didit API:', err.message);
        }
    }

    res.json({
        success: true,
        contractId,
        sessionId,
        verificationUrl: diditSessionUrl,
        isMock,
        workflowType: 'liveness_biometrics',
        contractStatus: role === 'TENANT' ? 'WAITING_TENANT' : 'WAITING_OWNER',
        capturedMetadata: {
            timestamp: new Date().toISOString(),
            userAgent: deviceMetadata.userAgent || req.headers['user-agent'],
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'
        }
    });
});

// API Endpoint - Signature Status (TSA Timestamp & Cryptographic Hash)
app.get('/api/contracts/:id/signature-status', (req, res) => {
    const contractId = req.params.id;
    const role = req.query.role || 'TENANT';
    const found = mockContracts.find(c => String(c.id) === String(contractId));

    if (found) {
        if (role === 'TENANT') {
            found.tenant.hasSigned = true;
            found.tenant.signedAt = new Date().toISOString();
            found.status = 'WAITING_OWNER';
        } else {
            found.owner.hasSigned = true;
            found.owner.signedAt = new Date().toISOString();
            found.status = 'SIGNED_AND_SEALED';
        }
        found.sha256Hash = 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33';
        found.tsaTimestamp = new Date().toISOString();
        found.signedPdfUrl = `/api/contracts/${contractId}/download-signed`;
        found.auditTrailPdfUrl = `/api/contracts/${contractId}/download-audit-trail`;
    }

    res.json({
        success: true,
        contractId,
        status: role === 'TENANT' ? 'WAITING_OWNER' : 'SIGNED_AND_SEALED',
        step: 'COMPLETED',
        progress: 100,
        message: 'Firma electrónica completada, sellado TSA aplicado y Audit Trail generado.',
        isComplete: true,
        sha256Hash: 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33',
        tsaTimestamp: new Date().toISOString(),
        tsaCertificateId: `TSA-AR-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        signedPdfUrl: `/api/contracts/${contractId}/download-signed`,
        auditTrailPdfUrl: `/api/contracts/${contractId}/download-audit-trail`,
        qrVerificationUrl: `https://habitat.ar/verificar/${contractId}`
    });
});

// Serve uploads directory
import fs from 'fs';
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Helper: Save Base64 to File
function saveBase64(base64String, prefix) {
    if (!base64String || !base64String.startsWith('data:')) return base64String;

    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const type = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    
    let ext = 'bin';
    if (type.includes('jpeg') || type.includes('jpg')) ext = 'jpg';
    if (type.includes('png')) ext = 'png';
    if (type.includes('pdf')) ext = 'pdf';
    
    const filename = `${prefix}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    
    fs.writeFileSync(filePath, buffer);
    return `uploads/${filename}`;
}

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

// API Endpoint - Didit KYC Session Decision & Document OCR Query
app.all('/api/session-decision', async (req, res) => {
    try {
        const sessionDecisionHandler = (await import('./api/session-decision.js')).default;
        await sessionDecisionHandler(req, res);
    } catch (err) {
        console.error('Error en /api/session-decision:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

// API Endpoint - Unified /api/firmas/* (iniciar, sellar, finalizar, webhook)
app.all(['/api/firmas', '/api/firmas/:action'], async (req, res) => {
    try {
        const firmasHandler = (await import('./api/firmas.js')).default;
        req.query = req.query || {};
        if (req.params.action) req.query.action = req.params.action;
        await firmasHandler(req, res);
    } catch (err) {
        console.error('Error en /api/firmas:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

