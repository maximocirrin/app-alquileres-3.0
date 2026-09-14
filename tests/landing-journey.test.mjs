import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import postcss from 'postcss';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const css = postcss.parse(read('css/style.css'));
const rules = selector => {
    const matches = [];
    css.walkRules(selector, rule => matches.push(rule));
    return matches;
};
const value = (selector, property) => rules(selector).flatMap(rule =>
    rule.nodes.filter(node => node.prop === property).map(node => node.value));

for (const page of ['index.html', 'propietarios.html', 'corredores.html']) {
    test(`${page}: shares three ordered journey cards with decorative inline icons`, () => {
        const html = read(page);
        const section = html.match(/<section class="landing-journey"[^>]*>[\s\S]*?<\/section>/)?.[0];
        assert.ok(section);
        assert.match(section, /aria-label="[^"]+"/);
        assert.match(section, /<ol class="landing-journey-steps">/);
        assert.equal((section.match(/<li>/g) || []).length, 3);
        assert.equal((section.match(/class="landing-journey-icon" aria-hidden="true"/g) || []).length, 3);
        assert.equal((section.match(/<h3>/g) || []).length, 3);
        assert.doesNotMatch(html, /class="premium-proof-grid/);
    });
}

test('connector progressively fills to the second or third card', () => {
    assert.deepEqual(value('.landing-journey-steps:has(li:nth-child(2):hover)::after', 'background-size'), ['50% 100%']);
    assert.deepEqual(value('.landing-journey-steps:has(li:nth-child(3):hover)::after', 'background-size'), ['100% 100%']);
    assert.match(value('.landing-journey-steps::after', 'transition')[0], /background-size 650ms/);
    assert.match(value('.landing-journey-steps::after', 'background')[0], /#811b1e, #cf3943/);
    let hiddenOnMobile = false;
    css.walkAtRules('media', media => {
        if (media.params !== '(max-width: 699px)') return;
        media.walkRules(rule => {
            if (rule.selector.includes('.landing-journey-steps::after')) {
                hiddenOnMobile ||= rule.nodes.some(node => node.prop === 'display' && node.value === 'none');
            }
        });
    });
    assert.ok(hiddenOnMobile);
});

test('hero fades the image and vignette to transparency without a white blend layer', () => {
    const selector = '.landing-premium .premium-hero > div:first-child';
    assert.match(value(selector, 'mask-image')[0], /transparent 100%/);
    assert.deepEqual(value(selector, '-webkit-mask-image'), value(selector, 'mask-image'));
    assert.deepEqual(value('.landing-premium .premium-hero > div:nth-child(2)', 'display'), ['none']);
    assert.deepEqual(value('.landing-premium .premium-hero', 'border-bottom'), ['0']);
});
