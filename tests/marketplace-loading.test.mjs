import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const dataSource = fs.readFileSync(new URL('../js/data.js', import.meta.url), 'utf8');
const clientSource = fs.readFileSync(new URL('../js/supabaseClient.js', import.meta.url), 'utf8');
const landingSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function publication(id, state = 1) {
    return {
        id_publicacion: id, id_propiedad: id + 100, precio: 450000,
        descripcion: 'Departamento luminoso | Detalles: {"moneda":"ARS"}',
        created_at: '2026-09-13T12:00:00Z', cantidad_visualizaciones_total: 100 - id,
        Propiedad: { calle: 'San Martín', numero: '123', dormitorios: 2, Barrio: { nombre: 'Centro' } },
        Multimedia: [{ url_archivo: 'https://example.com/photo.jpg' }],
        Historial_Estado_Publicacion: [{ id_estado_publicacion: state, fecha_inicio: '2026-09-13', fecha_fin: null }]
    };
}

function setup(respond = async () => ({ data: [publication(1)], error: null })) {
    const queries = [];
    const publicClient = {
        from(table) {
            const request = { table, orders: [] };
            queries.push(request);
            const query = {
                select(columns) { request.columns = columns; return query; },
                order(column, options) { request.orders.push({ column, options }); return query; },
                limit(limit) { request.limit = limit; return query; },
                abortSignal(signal) { request.signal = signal; return respond(request); }
            };
            return query;
        }
    };
    let now = Date.now();
    class Clock extends Date { static now() { return now; } }
    const context = vm.createContext({
        window: {
            // A stalled/private auth client must never participate in public loading.
            supabaseClient: new Proxy({}, { get() { throw new Error('Touched private auth client'); } }),
            getPublicSupabaseClient: () => publicClient
        },
        console: { error() {}, warn() {} }, URL, AbortSignal, Date: Clock
    });
    vm.runInContext(dataSource, context);
    return { manager: context.DataManager, queries, context, advance: ms => { now += ms; } };
}

test('public cards load without auth or contracts and retain property details', async () => {
    const { manager, queries } = setup();
    const [property] = await manager.getFeaturedMarketplaceProperties(20);
    assert.equal(property.address, 'San Martín 123');
    assert.equal(property.price, 450000);
    assert.equal(property.dormitorios, 2);
    assert.equal(property.images[0], 'https://example.com/photo.jpg');
    assert.equal(property.id_publicacion, 1);
    assert.equal(queries.length, 1);
    assert.doesNotMatch(queries[0].columns, /Contrato\s*\(/);
    assert.match(queries[0].columns, /Multimedia\s*\(url_archivo, orden_visualizacion\)/);
    assert.equal(queries[0].orders[0].column, 'cantidad_visualizaciones_total');
    assert.equal(queries[0].orders[0].options.ascending, false);
    assert.equal(queries[0].limit, 300);
    assert.ok(queries[0].signal instanceof AbortSignal);
});

test('simultaneous renders share a request; cache expires and can be invalidated after edits', async () => {
    let release;
    const { manager, queries, advance } = setup(() => new Promise(resolve => { release = resolve; }));
    const first = manager.getFeaturedMarketplaceProperties(20);
    const second = manager.getFeaturedMarketplaceProperties(8);
    assert.equal(queries.length, 1);
    release({ data: [publication(1)], error: null });
    assert.equal((await first).length, 1);
    assert.equal((await second).length, 1);
    await manager.getFeaturedMarketplaceProperties(20);
    assert.equal(queries.length, 1);
    advance(30_001);
    const refreshed = manager.getFeaturedMarketplaceProperties(20);
    assert.equal(queries.length, 2);
    release({ data: [publication(2)], error: null });
    assert.equal((await refreshed)[0].id, 2);
    manager.invalidatePublicMarketplaceCache();
    const edited = manager.getFeaturedMarketplaceProperties(20);
    assert.equal(queries.length, 3);
    release({ data: [publication(3)], error: null });
    assert.equal((await edited)[0].id, 3);
});

test('errors are retriable and are not cached as an empty catalog', async () => {
    let attempts = 0;
    const { manager } = setup(async () => ++attempts === 1
        ? { data: null, error: new Error('Network timeout') }
        : { data: [publication(1)], error: null });
    await assert.rejects(manager.getFeaturedMarketplaceProperties(), /Network timeout/);
    assert.equal((await manager.getFeaturedMarketplaceProperties()).length, 1);
    assert.equal(attempts, 2);
});

test('available listings rank before rented ones, hidden statuses stay excluded and cached order is preserved', async () => {
    const { manager, queries } = setup(async () => ({
        data: [publication(1, 2), publication(2), publication(3, 4), publication(4, 5), publication(5, 6)], error: null
    }));
    const featured = await manager.getFeaturedMarketplaceProperties(20);
    assert.deepEqual(Array.from(featured, p => p.id), [2, 1]);
    const byViews = await manager.getPublicMarketplaceProperties(20, false, false, { orderBy: 'views' });
    assert.deepEqual(Array.from(byViews, p => p.id), [1, 2]);
    assert.equal(queries.length, 1);
    await manager.getPublicMarketplaceProperties(100);
    assert.equal(queries.length, 2);
    assert.equal(queries[1].orders[0].column, 'created_at');
});

test('public client is isolated from persisted credentials and reused', () => {
    const clients = [];
    const context = vm.createContext({
        window: { location: { hostname: 'localhost' } }, URL,
        console: { log() {} },
        supabase: { createClient(url, key, options) {
            const client = { from() {}, url, key, options };
            clients.push(client);
            return client;
        } }
    });
    vm.runInContext(clientSource, context);
    const publicClient = context.window.getPublicSupabaseClient();
    assert.notEqual(publicClient, context.window.supabaseClient);
    assert.equal(context.window.getPublicSupabaseClient(), publicClient);
    assert.equal(clients.length, 2);
    assert.equal(publicClient.options.auth.persistSession, false);
    assert.equal(publicClient.options.auth.autoRefreshToken, false);
    assert.equal(publicClient.options.auth.detectSessionInUrl, false);
    assert.equal(publicClient.options.auth.storageKey, 'vivat-public-marketplace');
});

test('landing starts requests before editor scripts and does not reload them on window.load', () => {
    assert.ok(landingSource.indexOf('window.renderLandingFeaturedProperties();') < landingSource.indexOf('<script src="js/publish-property.js'));
    assert.doesNotMatch(landingSource, /addEventListener\('(load|DOMContentLoaded)', (renderLandingFeaturedProperties|initCityPropertiesSection)\)/);
    for (const match of landingSource.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
        if (!/type="application\/ld\+json"/.test(match[1]) && match[2].trim()) {
            assert.doesNotThrow(() => new vm.Script(match[2]));
        }
    }
});
