/**
 * Headless check of client.js without a browser.
 *
 * It stubs the ModuleLoader, React, the DOM, media queries, locale and Cordis
 * just enough to run `apply()`, then asserts the background layers, the accent
 * layer, the Settings row registration and the contrast gate for every mode.
 * It also writes `applied.json`, which the preview harness renders.
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
const classNames = new Set();
const body = {
  style: {
    props: new Map(),
    setProperty(name, value) { this.props.set(name, value); },
    removeProperty(name) { this.props.delete(name); },
  },
  classList: {
    add(name) { classNames.add(name); },
    remove(name) { classNames.delete(name); },
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
const canvas = {
  width: 0,
  height: 0,
  getContext: () => ({ drawImage() {} }),
  toDataURL: () => 'data:image/jpeg;base64,AA==',
};
globalThis.document = {
  head,
  body,
  documentElement,
  createElement: (tag) => (tag === 'canvas' ? canvas : makeStyle()),
};
globalThis.CSS = { supports: () => true };
globalThis.window = {
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};

const remoteConfig = {
  mode: 'wallpaper',
  preset: 'aurora',
  intensity: 100,
  solid: '#0B1220',
  wallpaper: 'waves',
  dim: 40,
  animate: true,
  upload: null,
};
globalThis.fetch = async (url, init) => {
  if (init?.method === 'POST') {
    return { ok: true, json: async () => remoteConfig };
  }
  if (String(url).startsWith('/api/dsh-bg-gradient/image')) {
    return { ok: false, status: 404, json: async () => ({}) };
  }
  return { ok: true, json: async () => remoteConfig };
};

/* ---------- React + ModuleLoader stubs ---------- */
const reactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
  useEffect: () => {},
  useRef: (value) => ({ current: value }),
  useCallback: (fn) => fn,
};

let exported = null;
globalThis.window.__ModuleLoader__ = {
  load({ id, factory }) {
    exported = {
      id,
      module: factory((name) => {
        if (name === 'react') return reactStub;
        throw new Error(`unexpected require(${name})`);
      }),
    };
  },
};

/* ---------- Cordis context stub ---------- */
const captured = {
  tokens: null,
  slot: null,
  styles: [],
  themeListeners: [],
  dicts: new Map(),
  subscriptions: 0,
};
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
  locale: {
    register(ns, locale, dict) {
      captured.dicts.set(`${ns}:${locale}`, dict);
      return () => {};
    },
    bind(ns) {
      return (key, params) => {
        const dict = captured.dicts.get(`${ns}:en`) ?? {};
        const template = dict[key] ?? key;
        if (!params) return template;
        return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
      };
    },
    subscribe() {
      captured.subscriptions += 1;
      return () => {};
    },
  },
};

/* ---------- run ---------- */
const clientPath = path.join(here, '..', 'client.js');
await import(`file://${clientPath}?t=${Date.now()}`);
assert.ok(exported, 'client bundle did not call the ModuleLoader');
assert.equal(exported.id, '@local/dsh-bg-gradient');

const module = exported.module;
assert.deepEqual(module.inject, ['slots', 'theme', 'locale']);
module.apply(ctx);
await new Promise((resolve) => setTimeout(resolve, 0));

/* ---------- page wiring ---------- */
assert.equal(head.children.length, 2, 'expected two injected style tags');
assert.ok(head.children.every((tag) => tag.dataset.plugin === '@local/dsh-bg-gradient'));

const layersLight = documentElement.style.getPropertyValue('--dcb-layers');
assert.ok(layersLight.includes('data:image/svg+xml'), 'wallpaper layer should be an SVG data URI');
assert.equal(body.getAttribute('data-dcb'), 'on');
assert.equal(documentElement.style.getPropertyValue('--dcb-base-alpha'), '#FFFFFF75');
assert.ok(captured.tokens, 'accent token layer was not registered');
assert.equal(captured.tokens.source, 'dsh-bg-gradient');
const accentLayer = captured.tokens.tokens;
assert.equal(accentLayer['--dsw-alias-brand-primary'].light, '#3D6EE0');
assert.equal(accentLayer['--dsw-alias-brand-primary'].dark, '#7AAAFF');
for (const [token, pair] of Object.entries(accentLayer)) {
  assert.equal(typeof pair.light, 'string', `${token}.light must be a string`);
  assert.equal(typeof pair.dark, 'string', `${token}.dark must be a string`);
}
assert.equal(accentLayer['--dsw-alias-bg-base'], undefined, 'surfaces are scoped in CSS, not overridden globally');

scheme = 'dark';
captured.themeListeners.forEach((listener) => listener({ active: { colorScheme: 'dark' } }));
const layersDark = documentElement.style.getPropertyValue('--dcb-layers');
assert.notEqual(layersDark, layersLight, 'wallpaper should switch to its dark variant');
assert.equal(documentElement.style.getPropertyValue('--dcb-base-alpha'), '#15151770');
scheme = 'light';
captured.themeListeners.forEach((listener) => listener({ active: { colorScheme: 'light' } }));

assert.equal(captured.slot.definition.name, 'settings.general.item');
assert.equal(captured.slot.definition.id, 'background');
assert.equal(captured.slot.definition.order, 12);
assert.equal(captured.slot.definition.label(), 'Background');
assert.equal(typeof captured.slot.component, 'function');

const preview = module.__preview;
assert.ok(preview, 'preview hooks missing');

/* ---------- normalisation ---------- */
assert.equal(preview.normalize({ preset: 'deep' }).mode, 'gradient');
assert.equal(preview.normalize({ enabled: false, preset: 'deep' }).mode, 'none');
assert.equal(preview.normalize({ mode: 'upload', upload: null }).mode, 'upload');
assert.equal(preview.normalize({ mode: 'nope' }).mode, 'gradient');
assert.equal(preview.normalize({ solid: 'red' }).solid, '#0B1220');
assert.equal(preview.normalize({ solid: '#abcdef' }).solid, '#ABCDEF');
assert.equal(preview.normalize({ intensity: 999 }).intensity, 100);
assert.equal(preview.normalize({ intensity: -4 }).intensity, 0);
assert.equal(preview.normalize({ dim: -4 }).dim, 0);

/* ---------- layer composition ---------- */
const baseConfig = { ...preview.DEFAULTS };
assert.match(
  preview.backgroundLayers({ ...baseConfig, mode: 'gradient' }, 'light', null),
  /^linear-gradient\(135deg, #[0-9a-f]{6}, #[0-9a-f]{6}, #[0-9a-f]{6}\)$/,
);
const solidLayers = preview.backgroundLayers(
  { ...baseConfig, mode: 'solid', solid: '#123456' },
  'light',
  null,
);
assert.ok(solidLayers.includes('#123456'));
assert.ok(solidLayers.startsWith('linear-gradient(rgba('));
const wallpaperLayers = preview.backgroundLayers({ ...baseConfig, mode: 'wallpaper' }, 'dark', null);
assert.ok(wallpaperLayers.includes('data:image/svg+xml'));
const fakeUpload = { url: '/api/dsh-bg-gradient/image?v=1', ext: 'png', bytes: 1000, animated: false };
const uploadLayers = preview.backgroundLayers(
  { ...baseConfig, mode: 'upload', upload: fakeUpload },
  'light',
  null,
);
assert.ok(uploadLayers.includes('url("/api/dsh-bg-gradient/image?v=1")'));
assert.equal(preview.backgroundLayers({ ...baseConfig, mode: 'none' }, 'light', null), 'none');

for (const schemeName of ['light', 'dark']) {
  for (const dim of [0, 40, 100]) {
    const alpha = preview.scrimAlpha(schemeName, dim);
    assert.ok(alpha >= 0.05 && alpha <= 0.85, `${schemeName}/${dim}: scrim out of range: ${alpha}`);
  }
}

/* ---------- wallpaper catalogue ---------- */
assert.equal(preview.WALLPAPERS.length, 6);
for (const wallpaper of preview.WALLPAPERS) {
  for (const schemeName of ['light', 'dark']) {
    const svg = preview.wallpaperSvg(wallpaper.id, schemeName);
    assert.ok(svg.startsWith('<svg'), `${wallpaper.id}/${schemeName}: not an SVG`);
    assert.ok(svg.includes('viewBox="0 0 1600 1000"'));
    const url = preview.wallpaperUrl(wallpaper.id, schemeName);
    assert.ok(url.startsWith('url("data:image/svg+xml,'));
  }
}

/* ---------- contrast gate ---------- */
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
const LAYERS = 2; // frame + conversation root both paint bg-base

/** Effective backdrop over the worst possible image pixel for one scheme. */
function imageBackdrop(schemeName, dim, image) {
  const perLayer = parseInt(preview.baseAlpha(schemeName).slice(7, 9), 16) / 255;
  const surface = 1 - Math.pow(1 - perLayer, LAYERS);
  const scrim = preview.scrimAlpha(schemeName, dim);
  const washed = composite(BASE[schemeName], image, scrim);
  return composite(BASE[schemeName], washed, surface);
}

for (const schemeName of ['light', 'dark']) {
  const worst = schemeName === 'light' ? '#000000' : '#FFFFFF';
  for (const dim of [0, 40, 100]) {
    const surface = imageBackdrop(schemeName, dim, worst);
    const ratio = contrast(TEXT[schemeName], surface);
    assert.ok(
      ratio >= 4.5,
      `${schemeName}/${dim}%: secondary text over the worst image is ${ratio.toFixed(2)}:1`,
    );
  }
  // Solid mode uses the same scrim, so the image extremes cover it too.
  for (const solid of ['#000000', '#FFFFFF', '#0B1220', '#E7DCC8']) {
    const surface = imageBackdrop(schemeName, 40, solid);
    const ratio = contrast(TEXT[schemeName], surface);
    assert.ok(ratio >= 4.5, `${schemeName}: solid ${solid} gives ${ratio.toFixed(2)}:1`);
  }
}

for (const preset of preview.PRESETS) {
  for (const schemeName of ['light', 'dark']) {
    const perLayer = parseInt(preview.baseAlpha(schemeName).slice(7, 9), 16) / 255;
    const surfaceAlpha = 1 - Math.pow(1 - perLayer, LAYERS);
    const stops = preview.gradientFor(preset, schemeName, 100).match(/#[0-9a-f]{6}/gi) ?? [];
    assert.equal(stops.length, 3, `${preset.id}/${schemeName} should have three stops`);
    for (const stop of stops) {
      const surface = composite(BASE[schemeName], stop, surfaceAlpha);
      const ratio = contrast(TEXT[schemeName], surface);
      assert.ok(
        ratio >= 4.5,
        `${preset.id}/${schemeName}: secondary text over ${stop} is ${ratio.toFixed(2)}:1, below 4.5`,
      );
    }
  }
}

/* ---------- preview bridge ---------- */
const applied = {
  defaults: preview.DEFAULTS,
  layers: { light: layersLight, dark: layersDark },
  styleCss: head.children.map((tag) => tag.textContent).join('\n'),
  presets: preview.PRESETS.map((preset) => ({
    id: preset.id,
    label: captured.dicts.get('@local/dsh-bg-gradient:en')[preset.labelKey],
    hint: captured.dicts.get('@local/dsh-bg-gradient:en')[preset.hintKey],
    lightFull: preview.gradientFor(preset, 'light', 100),
    lightSoft: preview.gradientFor(preset, 'light', 40),
    darkFull: preview.gradientFor(preset, 'dark', 100),
    darkSoft: preview.gradientFor(preset, 'dark', 40),
  })),
  wallpapers: preview.WALLPAPERS.map((item) => ({
    id: item.id,
    label: captured.dicts.get('@local/dsh-bg-gradient:en')[item.labelKey],
    light: preview.wallpaperUrl(item.id, 'light'),
    dark: preview.wallpaperUrl(item.id, 'dark'),
  })),
  solids: preview.SOLIDS,
  accentTokens: preview.ACCENT_TOKENS,
  surface: { light: preview.baseAlpha('light'), dark: preview.baseAlpha('dark') },
  scrim: {
    light: preview.scrimAlpha('light', preview.DEFAULTS.dim),
    dark: preview.scrimAlpha('dark', preview.DEFAULTS.dim),
  },
  tokens: captured.tokens.tokens,
};
writeFileSync(path.join(here, 'applied.json'), `${JSON.stringify(applied, null, 2)}\n`);

console.log('OK: layers, accent tokens, settings row, wallpapers and contrast gate verified');
console.log('wrote test/applied.json');
