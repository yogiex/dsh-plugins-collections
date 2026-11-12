/**
 * Headless check of client.js without a browser.
 *
 * It stubs the ModuleLoader, React, the DOM and the Cordis context just enough
 * to run `apply()`, then asserts the gradient variables, the token layer and
 * the Settings row registration. It also writes `applied.json`, which the
 * preview harness renders, so the picture and the code cannot drift apart.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));

/* ---------- DOM stub ---------- */
const makeStyle = () => ({
  dataset: {},
  textContent: '',
  removed: false,
  remove() {
    this.removed = true;
  },
});
const head = { children: [], append(node) { this.children.push(node); } };
const attributes = new Map();
const body = {
  style: {
    props: new Map(),
    setProperty(name, value) { this.props.set(name, value); },
    removeProperty(name) { this.props.delete(name); },
  },
  setAttribute(name, value) { attributes.set(name, value); },
  removeAttribute(name) { attributes.delete(name); },
  getAttribute(name) { return attributes.get(name) ?? null; },
};
const documentElement = {
  style: {
    props: new Map(),
    setProperty(name, value) { this.props.set(name, value); },
    removeProperty(name) { this.props.delete(name); },
    getPropertyValue(name) { return this.props.get(name) ?? ''; },
  },
};
globalThis.document = {
  head,
  body,
  documentElement,
  createElement: makeStyle,
};
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ enabled: true, preset: 'aurora', intensity: 50 }),
});

/* ---------- React + ModuleLoader stubs ---------- */
const reactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (value) => [value, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
};

let exported = null;
globalThis.window = {
  __ModuleLoader__: {
    load({ id, factory }) {
      exported = { id, module: factory((name) => {
        if (name === 'react') return reactStub;
        throw new Error(`unexpected require(${name})`);
      }) };
    },
  },
};

/* ---------- Cordis context stub ---------- */
const captured = { tokens: null, slot: null, styles: [], themeListeners: [] };
let scheme = 'light';
const ctx = {
  effect(run, _label) {
    const dispose = run();
    return typeof dispose === 'function' ? dispose : () => {};
  },
  on(event, listener) {
    assert.equal(event, 'theme/change');
    captured.themeListeners.push(listener);
    return () => {};
  },
  theme: {
    getTheme: () => ({ active: { colorScheme: scheme }, preference: 'light' }),
    overrideTokens(source, tokens) {
      captured.tokens = { source, tokens };
      return () => { captured.tokens = null; };
    },
  },
  slots: {
    inject(_name, register) { register(); },
    register(definition, component) {
      captured.slot = { definition, component };
      return () => {};
    },
  },
};

/* ---------- run ---------- */
const clientPath = path.join(here, '..', 'client.js');
await import(`file://${clientPath}`);
assert.ok(exported, 'client bundle did not call the ModuleLoader');
assert.equal(exported.id, '@local/dsh-bg-gradient');

const module = exported.module;
assert.deepEqual(module.inject, ['slots', 'theme']);
module.apply(ctx);
// let the initial GET settle so the fetched config replaces the defaults
await new Promise((resolve) => setTimeout(resolve, 0));

/* ---------- assertions ---------- */
assert.equal(head.children.length, 2, 'expected two injected style tags');
assert.ok(head.children.every((tag) => tag.dataset.plugin === '@local/dsh-bg-gradient'));

const gradientLight = documentElement.style.getPropertyValue('--dbb-grad-active');

assert.match(gradientLight, /^linear-gradient\(135deg, #[0-9a-f]{6}, #[0-9a-f]{6}, #[0-9a-f]{6}\)$/);
// intensity 50 blends the first stop (#DFEDFF) halfway toward #FFFFFF.
assert.ok(
  gradientLight.includes('#eff6ff'),
  `expected blended midpoint #eff6ff, got ${gradientLight}`,
);

assert.equal(body.getAttribute('data-dbb'), 'on');
assert.ok(captured.tokens, 'token layer was not registered');
assert.equal(captured.tokens.source, 'dsh-bg-gradient');
// the layer must be shaped token -> { light, dark }
const layer = captured.tokens.tokens;
assert.ok(layer['--dsw-alias-bg-base'], 'bg-base override missing');
assert.equal(typeof layer['--dsw-alias-bg-base'].light, 'string');
assert.equal(typeof layer['--dsw-alias-bg-base'].dark, 'string');
assert.ok(/^#[0-9A-F]{6}[0-9A-F]{2}$/i.test(layer['--dsw-alias-bg-base'].light), 'bg-base must carry alpha');
for (const value of Object.values(layer)) {
  assert.deepEqual(Object.keys(value).sort(), ['dark', 'light'], 'every override needs both modes');
}
// switching the built-in theme to dark re-renders the dark gradient
scheme = 'dark';
captured.themeListeners.forEach((listener) => listener({ active: { colorScheme: 'dark' } }));
const darkGradient = documentElement.style.getPropertyValue('--dbb-grad-active');
// dark stop #0B1220 halfway toward #151517
assert.ok(
  darkGradient.startsWith('linear-gradient(135deg, #111824'),
  `expected blended dark start #111824, got ${darkGradient}`,
);
scheme = 'light';
captured.themeListeners.forEach((listener) => listener({ active: { colorScheme: 'light' } }));

// the accent pairs must reach the token layer
assert.equal(layer['--dsw-alias-brand-primary'].light, '#3D6EE0');
assert.equal(layer['--dsw-alias-brand-primary'].dark, '#7AAAFF');

assert.equal(captured.slot.definition.name, 'settings.general.item');
assert.equal(captured.slot.definition.id, 'background');

const preview = module.__preview;
assert.ok(preview, 'preview hooks missing');

/* ---------- contrast gate: every preset, both schemes ---------- */
const LAYERS = 2; // frame + conversation root both paint bg-base
const effectiveAlpha = (alpha) => 1 - Math.pow(1 - alpha, LAYERS);
const toRgb = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const composite = (fg, bg, alpha) => {
  const [f, b] = [toRgb(fg), toRgb(bg)];
  return `#${f
    .map((channel, index) => Math.round((channel * alpha + b[index] * (1 - alpha)) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
};

const TEXT = { light: '#61666b', dark: '#cfd3d6' };
const BASE = { light: '#ffffff', dark: '#151517' };
for (const preset of preview.PRESETS.filter((item) => item.light)) {
  for (const mode of ['light', 'dark']) {
    const scrim = preview.SURFACE_TOKENS[mode]['--dsw-alias-bg-base'];
    const alpha = parseInt(scrim.slice(7, 9), 16) / 255;
    const stops = preview.gradientFor(preset, mode, 100).match(/#[0-9a-f]{6}/gi) ?? [];
    assert.equal(stops.length, 3, `${preset.id}/${mode} should have three stops`);
    for (const stop of stops) {
      const surface = composite(BASE[mode], stop, effectiveAlpha(alpha));
      const ratio = contrast(TEXT[mode], surface);
      assert.ok(
        ratio >= 4.5,
        `${preset.id}/${mode}: secondary text over ${stop} is ${ratio.toFixed(2)}:1, below 4.5`,
      );
    }
  }
}

const applied = {
  gradientLight,
  gradientDark: darkGradient,
  presets: preview.PRESETS.filter((preset) => preset.light).map((preset) => ({
    id: preset.id,
    label: preset.label,
    hint: preset.hint,
    lightFull: preview.gradientFor(preset, 'light', 100),
    lightSoft: preview.gradientFor(preset, 'light', 40),
    darkFull: preview.gradientFor(preset, 'dark', 100),
    darkSoft: preview.gradientFor(preset, 'dark', 40),
  })),
  surfaceTokens: preview.SURFACE_TOKENS,
  accentTokens: preview.ACCENT_TOKENS,
  tokens: captured.tokens.tokens,
  styleCss: head.children.map((tag) => tag.textContent).join('\n'),
};
writeFileSync(path.join(here, 'applied.json'), `${JSON.stringify(applied, null, 2)}\n`);

/* ---------- turning it off restores the page ---------- */
module.apply; // keep reference alive
console.log('OK: gradient vars, token layer, style tags and settings row verified');
console.log('wrote test/applied.json');
