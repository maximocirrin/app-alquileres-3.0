import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Generador de Clave Privada y Requerimiento para ARCA ===\n');

const cuit = process.argv[2] || '20123456789';
const cleanCuit = cuit.replace(/\D/g, '');

if (cleanCuit.length !== 11) {
    console.error('Error: Debes ingresar un CUIT válido de 11 dígitos.');
    console.log('Uso: node scripts/generar-claves-arca.js 20123456789');
    process.exit(1);
}

// 1. Generar par de claves RSA 2048 usando el módulo nativo crypto de Node.js
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs1', // PKCS#1 formato RSA PEM exigido por AFIP/ARCA (-----BEGIN RSA PRIVATE KEY-----)
        format: 'pem'
    }
});

const keyPath = path.join(__dirname, '..', 'arca_homo.key');
fs.writeFileSync(keyPath, privateKey, { mode: 0o600 });

console.log(`✅ Clave Privada generada con éxito: ${keyPath}`);
console.log('La clave no se imprime. Guardala en un gestor de secretos y eliminá la copia local cuando termines.\n');
console.log(`Siguiente paso:\nSi tienes Git instalado en Windows, puedes generar el archivo .csr ejecutando en la terminal:`);
console.log(`& "C:\\Program Files\\Git\\usr\\bin\\openssl.exe" req -new -key arca_homo.key -subj "/C=AR/O=Vivat/CN=vivat/serialNumber=CUIT ${cleanCuit}" -out arca_homo.csr\n`);
