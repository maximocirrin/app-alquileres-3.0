import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

function searchSetup(focused = false) {
    const events = {};
    const requests = [];
    const instances = [];
    const input = { addEventListener: (event, callback) => { events[event] = callback; } };
    vm.runInNewContext(read('js/landing-search.min.js'), {
        document: { getElementById: () => input, activeElement: focused ? input : null },
        window: {
            addEventListener: (event, callback) => { events[event] = callback; },
            loadGoogleMaps: (callback, libraries) => { requests.push({ callback, libraries }); },
            google: { maps: { places: { Autocomplete: function (element, options) {
                instances.push({ element, options });
            } } } }
        }
    });
    return { events, requests, instances, input };
}

test('Maps stays unloaded until search focus and initializes only one autocomplete', () => {
    const { events, requests, instances, input } = searchSetup();
    assert.equal(requests.length, 0);
    events.focus();
    events.focus();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].libraries, 'places');
    requests[0].callback();
    events.focus();
    assert.equal(requests.length, 1);
    assert.equal(instances.length, 1);
    assert.equal(instances[0].element, input);
    assert.equal(instances[0].options.componentRestrictions.country, 'ar');
});

test('search already focused before deferred scripts load receives suggestions', () => {
    assert.equal(searchSetup(true).requests.length, 1);
});

test('a Maps network error allows retry when the search is focused again', () => {
    const { events, requests } = searchSetup();
    events.focus();
    events['vivat:google_maps_error']();
    events.focus();
    assert.equal(requests.length, 2);
});

test('wizard feature filtering initializes after lazy insertion without duplicate listeners', () => {
    const app = read('js/app.js');
    const setup = app.slice(app.indexOf('window.initPublishWizardEvents = () =>'), app.indexOf('// Landing propietarios: static carousel'));
    let inserted = false;
    const handlers = {};
    const bindings = [];
    const wrapper = { style: {} };
    const checkbox = {
        checked: false,
        addEventListener: (event, fn) => { bindings.push(event); handlers[event] = fn; },
        nextElementSibling: { querySelector: () => ({ textContent: 'Permite mascotas' }) },
        closest: () => wrapper
    };
    const form = { dataset: {}, querySelectorAll: selector => selector.includes('checkbox') ? [checkbox] : [] };
    const chips = { innerHTML: 'old' };
    const input = { addEventListener: (event, fn) => { bindings.push(event); handlers[event] = fn; } };
    const window = {};
    vm.runInNewContext(setup, { window, document: {
        addEventListener() {},
        getElementById: id => !inserted ? null : id === 'form-extras' ? form : chips,
        querySelector: () => inserted ? input : null
    } });
    window.initPublishWizardEvents();
    assert.equal(bindings.length, 0);
    inserted = true;
    window.initPublishWizardEvents();
    window.initPublishWizardEvents();
    assert.deepEqual(bindings, ['change', 'input']);
    handlers.input({ target: { value: 'pileta' } });
    assert.equal(wrapper.style.display, 'none');
    handlers.input({ target: { value: 'mascotas' } });
    assert.equal(wrapper.style.display, '');
    handlers.change();
    assert.equal(chips.innerHTML, '');
});
