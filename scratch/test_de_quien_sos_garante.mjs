import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/SUPABASE_URL\s*=\s*["']?([^"'\r\n]+)/)[1].trim();
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?([^"'\r\n]+)/)[1].trim();

async function checkGarantes() {
  const gRes = await fetch(`${url}/rest/v1/Garante?select=*,Pasaporte_habitat!fk_garante_pasaporte(id_pasaporte,id_perfil,Perfil(nombre_completo,mail,dni,telefono)),Documento_garante(*)&limit=10`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  });
  console.log('Garante status:', gRes.status);
  const data = await gRes.json();
  console.log('Sample Garante rows:', JSON.stringify(data, null, 2));
}

checkGarantes().catch(console.error);
