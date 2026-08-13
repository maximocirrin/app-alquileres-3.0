import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY son requeridos.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchBcraVariable(idVariable, desdeFecha) {
    try {
        const url = `https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/${idVariable}${desdeFecha ? `?desde=${desdeFecha}` : ''}`;
        console.log(`Consultando API BCRA: ${url}`);
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        if (json && Array.isArray(json.results) && json.results.length > 0) {
            if (Array.isArray(json.results[0].detalle)) {
                return json.results[0].detalle;
            }
            return json.results;
        }
        return [];
    } catch (err) {
        console.error(`Error al consultar variable ${idVariable} del BCRA:`, err.message);
        return [];
    }
}

async function run() {
    console.log('--- Iniciando extracción de índices BCRA (últimos 2 años) ---');

    // Calcular fecha desde hace 2 años: ej. 2024-08-01
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), 1);
    const desdeStr = twoYearsAgo.toISOString().split('T')[0];
    console.log(`Rango de extracción: Desde ${desdeStr} hasta la fecha actual.`);

    // 1. Obtener IPC (Variable 27)
    console.log('\nExtrayendo IPC (Inflación Mensual)...');
    let ipcData = await fetchBcraVariable(27, desdeStr);
    console.log(`IPC obtenidos: ${ipcData.length} registros`);

    // 2. Obtener ICL (Variable 40)
    console.log('\nExtrayendo ICL (Índice Contratos de Locación)...');
    let iclData = await fetchBcraVariable(40, desdeStr);
    console.log(`ICL obtenidos: ${iclData.length} registros`);

    const rowsToInsert = [];

    // Mapear IPC (id_indice = 1)
    for (const item of ipcData) {
        const fecha = item.fecha;
        const valor = Number(item.valor);
        if (fecha && !isNaN(valor) && fecha >= desdeStr) {
            rowsToInsert.push({
                id_indice: 1,
                fecha_publicacion: fecha,
                valor_oficial: valor
            });
        }
    }

    // Mapear ICL (id_indice = 2)
    for (const item of iclData) {
        const fecha = item.fecha;
        const valor = Number(item.valor);
        if (fecha && !isNaN(valor) && fecha >= desdeStr) {
            rowsToInsert.push({
                id_indice: 2,
                fecha_publicacion: fecha,
                valor_oficial: valor
            });
        }
    }

    console.log(`\nTotal de registros a guardar en Valor_Indice_Mensual: ${rowsToInsert.length}`);

    if (rowsToInsert.length === 0) {
        console.log('No se encontraron registros nuevos para insertar.');
        return;
    }

    // Insertar en lotes de 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < rowsToInsert.length; i += batchSize) {
        const batch = rowsToInsert.slice(i, i + batchSize);
        const { error } = await supabase
            .from('Valor_Indice_Mensual')
            .insert(batch);

        if (error) {
            console.error(`Error al insertar lote ${i / batchSize + 1}:`, error.message);
        } else {
            insertedCount += batch.length;
            console.log(`Insertados ${insertedCount}/${rowsToInsert.length} registros...`);
        }
    }

    console.log('\n--- Extracción y guardado finalizado exitosamente ---');
}

run();
