const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const urlMatch = envFile.match(/SUPABASE_URL\s*=\s*(.+)/);
const keyMatch = envFile.match(/SUPABASE_ANON_KEY\s*=\s*(.+)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

const sb = createClient(url, key);

async function test() {
  const res = await sb.from('Garante').select('*, Pasaporte_habitat(*)');
  console.log('Result with Pasaporte_habitat(*):', res.error ? res.error.message : 'OK (' + res.data.length + ' rows)');

  const res2 = await sb.from('Garante').select('*, Pasaporte_habitat:fk_garante_pasaporte(*)');
  console.log('Result with fk_garante_pasaporte:', res2.error ? res2.error.message : 'OK (' + res2.data.length + ' rows)');
}

test().catch(console.error);
