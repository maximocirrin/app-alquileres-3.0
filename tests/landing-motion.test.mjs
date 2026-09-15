import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../js/landing-motion.js', import.meta.url), 'utf8');

function setup({ reduced = false, supportsObserver = true, width = 1280, height = 800 } = {}) {
    const elements = [];
    const observed = new Set();
    const events = {};
    const preference = { matches: reduced, addEventListener(_, callback) { this.change = callback; } };
    let intersect;
    const observerOptions = [];
    const windowEvents = {};
    const animationFrames = [];
    const document = {
        body: { classList: { contains: () => true } },
        readyState: 'complete',
        querySelectorAll: () => elements,
        addEventListener: (name, callback) => { events[name] = callback; }
    };
    const window = {
        innerHeight: height,
        innerWidth: width,
        matchMedia: () => preference,
        addEventListener: (name, fn) => { windowEvents[name] = fn; },
        requestAnimationFrame: callback => { animationFrames.push(callback); }
    };
    class Observer {
        constructor(callback, options) { intersect = callback; observerOptions.push(options); }
        observe(element) { observed.add(element); }
        unobserve(element) { observed.delete(element); }
        disconnect() { observed.clear(); }
    }
    if (supportsObserver) window.IntersectionObserver = Observer;
    runInNewContext(source, { window, document, IntersectionObserver: Observer });

    function element({ top = 1000, excluded = false, nested = false, benefit = true, editorial = false, className = '' } = {}) {
        const classes = new Set();
        const animations = [];
        const node = {
            className,
            classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
            matches: () => editorial,
            parentElement: { closest: () => nested, matches: () => benefit },
            closest: selector => selector === 'main' ? {} : excluded,
            querySelector: () => nested ? {} : null,
            getBoundingClientRect: () => ({ top }),
            animate(frames, options) {
                const animation = { frames, options, finish() { this.finished = true; this.onfinish?.(); }, cancel() { this.cancelled = true; this.oncancel?.(); } };
                animations.push(animation);
                return animation;
            }
        };
        elements.push(node);
        return { node, classes, animations };
    }
    const flushAnimationFrames = () => {
        while (animationFrames.length) animationFrames.splice(0).forEach(callback => callback());
    };
    return { window, document, preference, element, observed, events, observerOptions, windowEvents, flushAnimationFrames, enter: node => intersect([{ target: node, isIntersecting: true }]) };
}

test('offscreen content reveals once and retains the dynamic catalog observer hook', () => {
    const env = setup();
    const card = env.element();
    env.window.marketplaceObserver.observe(card.node);
    assert.ok(card.classes.has('is-visible'));
    assert.ok(card.classes.has('landing-reveal-pending'), 'prepare while still offscreen, never after entering');
    assert.ok(env.observed.has(card.node));
    env.enter(card.node);
    assert.equal(card.animations.length, 1);
    assert.equal(card.animations[0].frames[0].opacity, 0);
    assert.equal(card.animations[0].options.delay, undefined, 'no visible-then-hidden stagger');
    assert.ok(!env.observed.has(card.node));
    env.window.marketplaceObserver.observe(card.node);
    env.enter(card.node);
    assert.equal(card.animations.length, 1);
    card.animations[0].finish();
    assert.ok(!card.classes.has('landing-reveal-pending'));
    assert.ok(!card.animations[0].cancelled, 'keep the final frame stable until CSS has painted');
    env.flushAnimationFrames();
    assert.ok(card.animations[0].cancelled, 'release the animation so hover can work normally');
});

test('explicit targets animate in the viewport while excluded landing widgets stay static', () => {
    const env = setup();
    const hero = env.element({ top: 100, className: 'animate-on-scroll delay-150' });
    env.window.marketplaceObserver.observe(hero.node);
    assert.equal(hero.animations.length, 1);
    assert.equal(hero.animations[0].options.delay, 150);
    assert.ok(!env.observed.has(hero.node));

    const excluded = env.element({ excluded: true });
    env.window.marketplaceObserver.observe(excluded.node);
    assert.equal(excluded.animations.length, 0);
    assert.ok(!env.observed.has(excluded.node));

    const section = env.element({ benefit: false });
    env.window.marketplaceObserver.observe(section.node);
    assert.ok(env.observed.has(section.node));
    env.enter(section.node);
    assert.equal(section.animations.length, 1);

    const nestedContainer = env.element({ nested: true });
    env.window.marketplaceObserver.observe(nestedContainer.node);
    assert.equal(nestedContainer.animations.length, 0, 'avoid compounding a child reveal with its parent');
});

test('reduced motion and missing IntersectionObserver leave content immediately readable', () => {
    for (const options of [{ reduced: true }, { supportsObserver: false }]) {
        const env = setup(options);
        const card = env.element();
        env.window.marketplaceObserver.observe(card.node);
        assert.ok(card.classes.has('is-visible'));
        assert.equal(env.observed.size, 0);
        assert.equal(card.animations.length, 0);
    }
});

test('changing reduced motion finishes active reveals and disconnects future ones', () => {
    const env = setup();
    const card = env.element();
    env.window.marketplaceObserver.observe(card.node);
    env.enter(card.node);
    env.preference.matches = true;
    env.preference.change();
    assert.ok(card.animations[0].finished);
    assert.equal(env.observed.size, 0);
});

test('keyboard focus completes an active reveal so controls are immediately visible', () => {
    const env = setup();
    const card = env.element();
    env.window.marketplaceObserver.observe(card.node);
    env.enter(card.node);
    env.events.focusin({ target: { closest: () => card.node } });
    assert.ok(card.animations[0].finished);
});

test('missing Web Animations API falls back to static content', () => {
    const env = setup();
    const card = env.element();
    delete card.node.animate;
    env.window.marketplaceObserver.observe(card.node);
    assert.doesNotThrow(() => env.enter(card.node));
    assert.ok(card.classes.has('is-visible'));
});

test('editorial headings reveal without animating their parent section', () => {
    const env = setup();
    const heading = env.element({ benefit: false, editorial: true });
    env.window.marketplaceObserver.observe(heading.node);
    assert.ok(env.observed.has(heading.node));
    env.enter(heading.node);
    assert.equal(heading.animations.length, 1);
});

test('re-registering a pending card does not strand it hidden', () => {
    const env = setup();
    const card = env.element();
    env.window.marketplaceObserver.observe(card.node);
    card.node.getBoundingClientRect = () => ({ top: 100 });
    env.window.marketplaceObserver.observe(card.node);
    env.enter(card.node);
    assert.equal(card.animations.length, 1);
    card.animations[0].finish();
    assert.ok(!card.classes.has('landing-reveal-pending'));
});

test('disabling motion reveals both active and still-pending content', () => {
    const env = setup();
    const card = env.element();
    env.window.marketplaceObserver.observe(card.node);
    env.preference.matches = true;
    env.preference.change();
    assert.ok(!card.classes.has('landing-reveal-pending'));
    assert.equal(env.observed.size, 0);
});

test('an animation failure restores visible content', () => {
    const env = setup();
    const card = env.element();
    card.node.animate = () => { throw new Error('animation unavailable'); };
    env.window.marketplaceObserver.observe(card.node);
    env.enter(card.node);
    assert.ok(!card.classes.has('landing-reveal-pending'));
});

test('mobile waits until the block reaches 75 percent of viewport height', () => {
    const env = setup({ width: 390, height: 844 });
    assert.equal(env.observerOptions[0].rootMargin, '0px 0px -211px 0px');
    const card = env.element();
    env.window.marketplaceObserver.observe(card.node);
    assert.equal(card.animations.length, 0);
    env.enter(card.node);
    assert.equal(card.animations[0].options.duration, 850);
});

test('viewport resize updates the trigger and keeps pending cards observed', () => {
    const env = setup({ width: 390, height: 844 });
    const card = env.element();
    env.window.marketplaceObserver.observe(card.node);
    env.window.innerHeight = 600;
    env.windowEvents.resize();
    assert.equal(env.observerOptions.at(-1).rootMargin, '0px 0px -150px 0px');
    assert.ok(env.observed.has(card.node));
    env.window.innerWidth = 1024;
    env.windowEvents.resize();
    assert.equal(env.observerOptions.at(-1).rootMargin, '0px 0px -24px 0px');
    env.enter(card.node);
    assert.equal(card.animations.length, 1);
});
