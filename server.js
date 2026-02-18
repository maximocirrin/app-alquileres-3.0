const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
// const { createClient } = require('@supabase/supabase-js'); // Pending Supabase integration

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve Static Files
app.use(express.static(path.join(__dirname)));

// API Endpoints - TO BE IMPLEMENTED WITH SUPABASE

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
