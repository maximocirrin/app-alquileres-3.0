import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('../js/landing-catalog.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const featuredScript = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).find(script => script.includes('async function renderLandingFeaturedProperties()'));

function row(id = 1, state = 1) {
    return {
        id_publicacion: id, id_propiedad: 15, precio: 500000, id_moneda: 2,
        descripcion: 'Un departamento | Detalles: {"expensas":25000,"expensasIncluidas":false}',
        Propiedad: { calle: 'San Martín', numero: 123, dormitorios: 2 },
        Multimedia: [{ url_archivo: 'https://example.com/photo.webp' }],
        Historial_Estado_Publicacion: [{ id_estado_publicacion: state, fecha_inicio: '2026-09-14', fecha_fin: null }]
    };
}

function setup() {
    const calls = [];
    const timers = new Map();
    const grid = {
        children: [], innerHTML: '', classList: { add() {}, remove() {} },
        addEventListener() {}, appendChild(card) { this.children.push(card); }
    };
    const context = vm.createContext({
        window: { location: { href: 'https://vivat.com.ar/' }, addEventListener() {} },
        document: {
            getElementById(id) { return id === 'landing-featured-properties-grid' ? grid : null; },
            createElement() { return { dataset: {}, querySelector() { return { addEventListener() {} }; } }; }
        },
        URL, URLSearchParams, AbortController,
        console: { warn() {} },
        setTimeout(callback) { const id = timers.size + 1; timers.set(id, callback); return id; },
        clearTimeout(id) { timers.delete(id); },
        fetch(url, options) {
            return new Promise((resolve, reject) => {
                options.signal.addEventListener('abort', () => reject(new Error('timeout')));
                calls.push({ url: new URL(url), options, resolve, reject });
            });
        }
    });
    vm.runInContext(source, context);
    return { context, calls, grid, timers, catalog: context.window.LandingCatalog };
}

test('the head starts the request and paints real cards while Supabase, DataManager and DOMContentLoaded are absent', async () => {
    const { context, calls, grid } = setup();
    assert.equal(calls.length, 1, 'starts before the grid renderer exists');
    assert.equal(context.window.supabase, undefined);
    assert.equal(context.window.DataManager, undefined);
    vm.runInContext(featuredScript, context);
    assert.equal(calls.length, 1, 'renderer consumes the in-flight request');
    calls[0].resolve({ ok: true, json: async () => [row()] });
    await context.window.renderLandingFeaturedProperties();
    assert.equal(grid.children.length, 1);
    assert.match(grid.children[0].innerHTML, /San Martín 123/);
    assert.match(grid.children[0].innerHTML, /500\.000/);
    assert.match(grid.children[0].innerHTML, /photo\.webp/);
    assert.equal(grid.children[0].dataset.pubId, 1);
});

test('featured and city cards share a complete small catalog and preserve full detail records', async () => {
    const { catalog, calls, context } = setup();
    const featured = catalog.getFeatured();
    const cities = catalog.getCities();
    calls[0].resolve({ ok: true, json: async () => [row(1), row(2, 4)] });
    const cards = await featured;
    assert.equal(cards.length, 1);
    assert.equal((await cities).length, 1);
    assert.equal(calls.length, 1);
    assert.equal(cards[0].currency, 'USD');
    context.window.DataManager = { _mapPublicationRecord: pub => ({ full: pub }) };
    assert.equal(catalog.detailRecord(cards[0]).full, cards[0]._publicationRecord);
    assert.equal(calls[0].options.credentials, 'omit');
    assert.equal(calls[0].options.headers.Authorization, undefined);
    assert.doesNotMatch(calls[0].url.searchParams.get('select'), /Contrato\(/);
});

test('an actual HTTP failure shows retry and a subsequent request renders the properties', async () => {
    const { context, calls, grid } = setup();
    vm.runInContext(featuredScript, context);
    calls[0].resolve({ ok: false, status: 503 });
    await context.window.renderLandingFeaturedProperties();
    assert.match(grid.innerHTML, /Reintentar/);
    assert.doesNotMatch(grid.innerHTML, /No hay propiedades/);
    const retry = context.window.renderLandingFeaturedProperties();
    assert.equal(calls.length, 2);
    calls[1].resolve({ ok: true, json: async () => [row()] });
    await retry;
    assert.equal(grid.children.length, 1);
});

test('timeout cancels the request even without AbortSignal.timeout and does not cache the failure', async () => {
    const { catalog, calls, timers } = setup();
    const pending = catalog.getFeatured();
    [...timers.values()][0]();
    await assert.rejects(pending, /timeout/);
    assert.equal(calls[0].options.signal.aborted, true);
    const retry = catalog.getFeatured();
    calls[1].resolve({ ok: true, json: async () => [] });
    assert.equal((await retry).length, 0);
});

test('untrusted card text and image schemes stay escaped before security libraries load', () => {
    const { catalog } = setup();
    assert.equal(catalog.escapeHtml('<img onerror="alert(1)">'), '&lt;img onerror=&quot;alert(1)&quot;&gt;');
    assert.equal(catalog.safeImageUrl('javascript:alert(1)'), 'img/hero-marketplace.jpg');
    assert.equal(catalog.safeImageUrl(undefined), 'img/hero-marketplace.jpg');
});

test('the critical section is visible without an animation observer, and its loader precedes all external scripts', () => {
    const section = html.match(/<section\b[^>]*id="landing-featured-properties-section"[^>]*>/)[0];
    assert.doesNotMatch(section, /animate-on-scroll|opacity-0|hidden/);
    assert.match(html.match(/<script\b[^>]*src="[^"]+"[^>]*>/)[0], /landing-catalog\.js/);
    assert.ok(html.indexOf('window.renderLandingFeaturedProperties();') < html.indexOf('<script src="https://cdn.jsdelivr.net/npm/@supabase'));
    for (const link of html.matchAll(/<link\b[^>]*href="https:\/\/fonts.googleapis.com[^>]*>/g)) {
        if (link[0].includes('rel="stylesheet"')) assert.match(link[0], /media="print"/);
    }
});
