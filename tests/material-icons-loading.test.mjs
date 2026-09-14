import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const source = fs.readFileSync(new URL('js/material-icons-loader.js', root), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

function setup({ supported = true } = {}) {
    const events = {};
    const calls = [];
    const classes = new Set();
    const timers = [];
    const target = prefix => ({
        addEventListener(name, callback) { events[`${prefix}:${name}`] = callback; }
    });
    const fonts = {
        ...target('fonts'),
        load(font, text) {
            return new Promise((resolve, reject) => calls.push({ font, text, resolve, reject }));
        }
    };
    vm.runInNewContext(source, {
        document: {
            ...target('document'),
            fonts: supported ? fonts : undefined,
            documentElement: { classList: { add: name => classes.add(name) } }
        },
        window: target('window'),
        setTimeout(callback) { timers.push(callback); }
    });
    return { calls, classes, events, timers };
}

test('slow icon fonts remain hidden until loaded, regardless of other font events', async () => {
    const { calls, classes, events } = setup();
    assert.match(calls[0].font, /Material Symbols Outlined/);
    events['document:DOMContentLoaded']();
    events['fonts:loadingdone']();
    await flush();
    assert.equal(classes.size, 0);
    assert.equal(calls.length, 1, 'concurrent triggers share the pending load');
    calls[0].resolve([{ status: 'loaded' }]);
    await flush();
    assert.ok(classes.has('material-icons-ready'));
    events['fonts:loadingdone']();
    assert.equal(calls.length, 1);
});

test('an empty font set does not reveal text; a late async stylesheet starts loading icons', async () => {
    const { calls, classes, events, timers } = setup();
    calls[0].resolve([]);
    await flush();
    assert.equal(classes.size, 0);
    events['document:load']({ target: { tagName: 'LINK', href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined' } });
    assert.equal(calls.length, 1, 'wait for the stylesheet media onload handler');
    timers.shift()();
    calls[1].resolve([{ status: 'loaded' }]);
    await flush();
    assert.ok(classes.has('material-icons-ready'));
});

test('a failed font request keeps names hidden and permits another load trigger', async () => {
    const { calls, classes, events } = setup();
    calls[0].reject(new Error('offline'));
    await flush();
    assert.equal(classes.size, 0);
    events['window:online']();
    assert.equal(calls.length, 2);
    calls[1].reject(new Error('still unavailable'));
    await flush();
    assert.equal(classes.size, 0);
});

test('cached fonts reveal icons immediately after load resolves', async () => {
    const { calls, classes } = setup();
    calls[0].resolve([{ status: 'loaded' }]);
    await flush();
    assert.ok(classes.has('material-icons-ready'));
});

test('missing Font Loading API leaves the CSS guard intact without throwing', () => {
    const { calls, classes } = setup({ supported: false });
    assert.equal(calls.length, 0);
    assert.equal(classes.size, 0);
});

test('every page guards static and dynamically inserted icons before the body can paint', () => {
    const pages = fs.readdirSync(root).filter(file => file.endsWith('.html'));
    for (const file of pages) {
        const html = fs.readFileSync(new URL(file, root), 'utf8');
        if (!html.includes('Material+Symbols')) continue;
        const head = html.slice(0, html.indexOf('</head>'));
        const guard = head.match(/<style id="material-icons-loading-guard">([\s\S]*?)<\/style>/)?.[1];
        assert.ok(guard, `${file}: inline guard is available without a network request`);
        assert.match(guard, /html:not\(\.material-icons-ready\).*\.material-icons.*\[class\*="material-symbols"\]/);
        assert.match(guard, /visibility: hidden !important/);
        assert.match(guard, /width: 1em !important/);
        assert.match(guard, /height: 1em !important/);
        assert.match(head, /<script async src="js\/material-icons-loader\.js\?v=1"><\/script>/);
        // The loader must match the effective font used by all icon aliases.
        assert.match(head, /\.material-symbols-outlined,\s*\.material-symbols-rounded,\s*\.material-icons,\s*\[class\*="material-symbols"\]\s*\{\s*font-family: 'Material Symbols Outlined' !important/);
    }
});
