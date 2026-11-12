/**
 * Renders test/applied.json into a static preview page.
 *
 * Every colour, gradient and token here comes from the real client bundle
 * (via the hooks the logic test captures), so the picture cannot drift from
 * the code. The React row is reproduced as plain HTML for the mock only.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(path.join(here, 'applied.json'), 'utf8'));

const BASE = {
  light: {
    '--dsw-alias-label-primary': '#0f1115',
    '--dsw-alias-label-secondary': '#61666b',
    '--dsw-alias-label-tertiary': '#81858c',
    '--dsw-alias-label-caption': '#adb2b8',
    '--dsw-alias-label-primary-foreground': '#fff',
    '--dsw-alias-bg-base': '#fff',
    '--dsw-alias-bg-layer-1': '#fff',
    '--dsw-alias-bg-layer-2': '#fff',
    '--dsw-alias-bg-layer-3': '#fff',
    '--dsw-alias-bg-module-platform': '#f5f6f7',
    '--dsw-specific-sidebar-fill': '#f9fafb',
    '--dsw-specific-sidebar-nav-item-active': '#ebeef2',
    '--dsw-specific-sidebar-nav-item-hover': '#f1f3f5',
    '--dsw-specific-bubble': '#edf3fe',
    '--dsw-specific-input-major': '#fff',
    '--dsw-alias-markdown-code-block': '#f9fafb',
    '--dsw-alias-markdown-code-block-banner': '#f9fafb',
    '--dsw-alias-border-l1': '#0000000a',
    '--dsw-alias-border-l2': '#0000001a',
    '--dsw-alias-border-l3': '#0000001f',
    '--dsw-alias-border-l4': '#00000029',
    '--dsw-alias-button-ghost-active-fill': '#ebeef2',
    '--dsw-alias-interactive-bg-hover': '#2631480f',
    '--dsw-alias-menu-icon': '#353638',
    '--dsw-alias-brand-primary': '#0f1115',
    '--dsw-alias-state-business-primary': '#4176e6'
  },
  dark: {
    '--dsw-alias-label-primary': '#f9fafb',
    '--dsw-alias-label-secondary': '#cfd3d6',
    '--dsw-alias-label-tertiary': '#adb2b8',
    '--dsw-alias-label-caption': '#81858c',
    '--dsw-alias-label-primary-foreground': '#0f1115',
    '--dsw-alias-bg-base': '#151517',
    '--dsw-alias-bg-layer-1': '#232324',
    '--dsw-alias-bg-layer-2': '#2c2c2e',
    '--dsw-alias-bg-layer-3': '#353638',
    '--dsw-alias-bg-module-platform': '#353638',
    '--dsw-specific-sidebar-fill': '#1b1b1c',
    '--dsw-specific-sidebar-nav-item-active': '#43454a',
    '--dsw-specific-sidebar-nav-item-hover': '#2c2c2e',
    '--dsw-specific-bubble': '#353638',
    '--dsw-specific-input-major': '#2c2c2e',
    '--dsw-alias-markdown-code-block': '#1b1b1c',
    '--dsw-alias-markdown-code-block-banner': '#2c2c2e',
    '--dsw-alias-border-l1': '#ffffff0f',
    '--dsw-alias-border-l2': '#ffffff1f',
    '--dsw-alias-border-l3': '#ffffff29',
    '--dsw-alias-border-l4': '#ffffff33',
    '--dsw-alias-button-ghost-active-fill': '#43454a',
    '--dsw-alias-interactive-bg-hover': '#ffffff14',
    '--dsw-alias-menu-icon': '#f9fafb',
    '--dsw-alias-brand-primary': '#f9fafb',
    '--dsw-alias-state-business-primary': '#7aaaff'
  }
};

const layer = data.tokens;
const modes = {
  light: Object.fromEntries(Object.entries(layer).map(([name, pair]) => [name, pair.light])),
  dark: Object.fromEntries(Object.entries(layer).map(([name, pair]) => [name, pair.dark])),
};

const tokens = JSON.stringify({
  base: BASE,
  light: modes.light,
  dark: modes.dark,
  light: { ...data.surfaceTokens.light, ...data.accentTokens.light },
  dark: { ...data.surfaceTokens.dark, ...data.accentTokens.dark },
});

const swatches = data.presets
  .map(
    (preset) => `        <button class="dbb-chip" type="button" data-preset="${preset.id}" aria-pressed="false">
          <span class="dbb-swatch" aria-hidden="true" style="background-image:${preset.lightFull}"></span>
          <span class="dbb-chipLabel">${preset.label}<small>${preset.hint}</small></span>
        </button>`,
  )
  .join('\n');

const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blue gradient background — preview plugin</title>
<style>
  :root{--font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
    --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace}
  *{box-sizing:border-box}
  html,body{margin:0;height:100%}
  body{font-family:var(--font);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;
    color:var(--dsw-alias-label-primary);background-color:var(--dsw-alias-bg-base)}
  body[data-dbb="on"]{background-image:var(--dbb-grad-active);background-attachment:fixed;background-size:cover;background-repeat:no-repeat}
  .shell{min-height:100vh;display:grid;grid-template-columns:228px minmax(0,1fr);gap:0}
  .side{background:var(--dsw-specific-sidebar-fill);border-right:.5px solid var(--dsw-alias-border-l3);padding:14px 10px;display:flex;flex-direction:column;gap:14px}
  .brand{display:flex;align-items:center;gap:8px;padding:2px 6px 8px}
  .brand b{font-size:13px;font-weight:600}
  .mark{width:22px;height:22px;border-radius:7px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground);display:grid;place-items:center;font-size:11px;font-weight:600}
  .nav{display:flex;flex-direction:column;gap:2px}
  .nav a{display:flex;align-items:center;gap:9px;padding:7px 9px;border-radius:9px;text-decoration:none;color:var(--dsw-alias-label-secondary);font-size:13px}
  .nav a svg{width:15px;height:15px;color:var(--dsw-alias-menu-icon)}
  .nav a:hover{background:var(--dsw-specific-sidebar-nav-item-hover)}
  .nav a[aria-current]{background:var(--dsw-specific-sidebar-nav-item-active);color:var(--dsw-alias-label-primary);font-weight:500}
  .nav a[aria-current] svg{color:var(--dsw-alias-brand-primary)}
  .side .foot{margin-top:auto;border-top:.5px solid var(--dsw-alias-border-l2);padding:8px 9px;color:var(--dsw-alias-label-caption);font-size:11.5px;display:flex;justify-content:space-between}
  .main{min-width:0;display:flex;flex-direction:column;background-color:var(--dsw-alias-bg-base)}
  .page{display:flex;flex-direction:column;flex:1;background-color:var(--dsw-alias-bg-base)}
  .titlebar{display:flex;align-items:center;justify-content:space-between;padding:11px 20px;border-bottom:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);font-size:12.5px}
  .titlebar .dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary);display:inline-block;margin-right:7px}
  .content{padding:22px 24px 30px;display:flex;flex-direction:column;gap:18px;max-width:860px}
  .card{background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:14px;padding:16px 18px}
  .card h2{margin:0 0 2px;font-size:14px;font-weight:500}
  .hint{color:var(--dsw-alias-label-tertiary);font-size:12.5px;margin:0 0 12px}
  .cubes{display:flex;gap:8px;flex-wrap:wrap}
  .cube{flex:1 1 130px;border:.5px solid var(--dsw-alias-border-l4);border-radius:14px;background:transparent;color:var(--dsw-alias-label-primary);padding:14px 10px;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;font:inherit;font-size:13px}
  .cube[aria-pressed="true"]{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-alias-state-business-primary)}
  .cube svg{width:17px;height:17px}
  .dbb-row{display:flex;flex-direction:column;gap:10px;padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}
  .dbb-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .dbb-title{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
  .dbb-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;margin:0}
  .dbb-chips{display:flex;flex-wrap:wrap;gap:8px}
  .dbb-chip{box-sizing:border-box;min-width:104px;flex:1 1 104px;max-width:180px;border:.5px solid var(--dsw-alias-border-l4);border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;cursor:pointer;display:flex;flex-direction:column;gap:6px;padding:7px;text-align:left}
  .dbb-chip:hover:not([aria-pressed="true"]){background:var(--dsw-alias-interactive-bg-hover)}
  .dbb-chip[aria-pressed="true"]{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary) inset}
  .dbb-chip:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-bg-base),0 0 0 4px var(--dsw-alias-state-business-primary)}
  .dbb-swatch{height:44px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l1);background-color:var(--dsw-alias-bg-layer-2);background-size:cover}
  .dbb-chipLabel{display:flex;align-items:center;justify-content:space-between;gap:6px;line-height:16px}
  .dbb-chipLabel small{color:var(--dsw-alias-label-caption);font-size:10.5px}
  .dbb-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .dbb-slider{flex:1 1 180px;min-width:140px;accent-color:var(--dsw-alias-state-business-primary);height:20px}
  .dbb-value{font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;min-width:38px;text-align:right}
  .dbb-reset{border:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-button-ghost-active-fill);color:var(--dsw-alias-label-primary);border-radius:8px;font:inherit;font-size:12px;padding:5px 10px;cursor:pointer}
  .msg{max-width:88%;padding:11px 14px;border-radius:14px 14px 4px 14px;background:var(--dsw-specific-bubble);font-size:13.5px}
  .row{display:flex;justify-content:flex-end}
  .code{border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;overflow:hidden;margin-top:10px}
  .code .bar{background:var(--dsw-alias-markdown-code-block-banner);padding:6px 10px;font-size:11px;color:var(--dsw-alias-label-tertiary);border-bottom:.5px solid var(--dsw-alias-border-l2)}
  .code pre{margin:0;background:var(--dsw-alias-markdown-code-block);color:var(--dsw-alias-label-primary);padding:10px 12px;font-family:var(--mono);font-size:11.5px}
  .toolbar{position:fixed;right:18px;top:14px;display:flex;gap:8px;align-items:center;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l3);border-radius:999px;padding:5px 6px;z-index:50;box-shadow:0 6px 20px rgba(15,17,21,.14)}
  .toolbar button{font:inherit;font-size:12px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:999px;padding:6px 12px;cursor:pointer}
  .toolbar button[aria-pressed="true"]{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground)}
  .note{max-width:860px;margin:0 24px 28px;color:var(--dsw-alias-label-tertiary);font-size:12px;padding-left:0}
</style>
</head>
<body>
<div class="toolbar" role="group" aria-label="Preview mode">
  <button type="button" data-mode="light" aria-pressed="true">Light</button>
  <button type="button" data-mode="dark" aria-pressed="false">Dark</button>
</div>

<div class="shell">
  <aside class="side">
    <div class="brand"><span class="mark">D</span><b>DeepSeek Harness</b></div>
    <nav class="nav">
      <a href="#" aria-current="page"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 4v5"/></svg>New session</a>
      <a href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 6h16M4 12h16M4 18h10"/></svg>Sessions</a>
      <a href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.6 0Z"/></svg>Settings</a>
    </nav>
    <div class="foot"><span>v0.2.1-rc.5</span><span id="modeLabel">light</span></div>
  </aside>

  <main class="main">
    <div class="titlebar"><span><span class="dot"></span>Settings / General</span><span id="presetLabel">Aurora</span></div>
    <div class="page">
    <div class="content">
      <section class="card">
        <h2>Appearance</h2>
        <p class="hint">Preferensi bawaan ui-theme tetap light / dark / system; plugin menumpuk warna di atasnya.</p>
        <div class="cubes">
          <button class="cube" type="button" data-pref="light" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>Light</button>
          <button class="cube" type="button" data-pref="dark" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>Dark</button>
          <button class="cube" type="button" data-pref="system" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>Following system</button>
        </div>

        <div class="dbb-row">
          <div class="dbb-head">
            <div class="dbb-title">Background</div>
            <p class="dbb-hint" id="rowHint">Aurora · 50% strength</p>
          </div>
          <div class="dbb-chips" role="group" aria-label="Background gradient preset">
            <button class="dbb-chip" type="button" data-preset="none" aria-pressed="false">
              <span class="dbb-swatch" aria-hidden="true" style="background-image:repeating-linear-gradient(135deg, var(--dsw-alias-border-l2) 0 1px, transparent 1px 8px)"></span>
              <span class="dbb-chipLabel">None<small>Stock palette</small></span>
            </button>
${swatches}
          </div>
          <div class="dbb-controls">
            <label class="dbb-hint" for="dbb-intensity">Strength</label>
            <input id="dbb-intensity" class="dbb-slider" type="range" min="0" max="100" step="5" value="50">
            <span class="dbb-value" id="dbb-value">50%</span>
            <button type="button" class="dbb-reset" id="dbb-reset">Reset</button>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="row"><div class="msg">Coba background-nya, tapi teks tetap kebaca.</div></div>
        <p style="margin:12px 0 0">Bubble, blok kode, dan input tetap opak; hanya kanvas dan sidebar yang memakai scrim.
          Aksen primer sekarang <code>#3D6EE0</code> (light) / <code>#7AAAFF</code> (dark).</p>
        <div class="code">
          <div class="bar">dsh-bg-gradient/cordis.patch.yml</div>
          <pre>- insert:
    - id: dsh-bg-gradient
      name: '@local/dsh-bg-gradient'
      config:
        enabled: true
        preset: aurora
        intensity: 100</pre>
        </div>
      </section>
    </div>
    </div>
    <p class="note">Preview statis yang dihasilkan dari bundle plugin (test/applied.json). Nilai gradient dan token
      di sini identik dengan yang ditulis plugin saat runtime.</p>
  </main>
</div>

<script>
const DATA = {
  tokens: ${tokens},
  presets: ${JSON.stringify(data.presets)},
  gradientLight: ${JSON.stringify(data.gradientLight)},
  gradientDark: ${JSON.stringify(data.gradientDark)},
  defaultPreset: 'aurora',
  defaultIntensity: 100,
  base: { light: '#FFFFFF', dark: '#151517' }
};

const body = document.body;
let mode = 'light';
let preset = DATA.defaultPreset;
let intensity = DATA.defaultIntensity;

function parse(hex){ const h = hex.replace('#',''); return [0,2,4].map(i => parseInt(h.slice(i,i+2),16)); }
function toHex(ch){ return '#' + ch.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0')).join(''); }
function blend(base, stop, t){ const b = parse(base), s = parse(stop); return toHex(s.map((v,i) => b[i] + (v - b[i]) * t)); }
function gradientFor(presetId, m, t){
  const p = DATA.presets.find(item => item.id === presetId);
  if (!p) return 'none';
  const angle = m === 'light' ? (p.lightFull.match(/[0-9]+deg/) || ['135deg'])[0] : (p.darkFull.match(/[0-9]+deg/) || ['135deg'])[0];
  const stops = (m === 'light' ? p.lightFull : p.darkFull).match(/#[0-9a-f]{6}/gi) || [];
  const base = DATA.base[m];
  return 'linear-gradient(' + angle + ', ' + stops.map(stop => blend(base, stop, t)).join(', ') + ')';
}

function render(){
  const baseTokens = DATA.tokens.base[mode];
  const tokenSet = mode === 'light' ? DATA.tokens.light : DATA.tokens.dark;
  for (const [name, value] of Object.entries({ ...baseTokens, ...tokenSet })) body.style.setProperty(name, value);
  body.setAttribute('data-dbb', preset === 'none' ? 'off' : 'on');
  document.documentElement.style.setProperty('--dbb-grad-active', gradientFor(preset, mode, intensity / 100));
  document.querySelectorAll('.dbb-chip').forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.preset === preset)));
  document.querySelectorAll('.toolbar button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  document.querySelectorAll('.cube').forEach(cube => cube.setAttribute('aria-pressed', String(cube.dataset.pref === mode)));
  document.querySelector('#modeLabel').textContent = mode;
  const found = DATA.presets.find(item => item.id === preset);
  document.querySelector('#presetLabel').textContent = found ? found.label : 'None';
  document.querySelector('#rowHint').textContent = found ? found.label + ' · ' + intensity + '% strength' : 'Stock surface, no gradient';
  document.querySelector('#dbb-value').textContent = intensity + '%';
  document.querySelector('#dbb-intensity').value = String(intensity);
}

document.querySelectorAll('.dbb-chip').forEach(chip => chip.addEventListener('click', () => { preset = chip.dataset.preset; render(); }));
document.querySelectorAll('.toolbar button').forEach(button => button.addEventListener('click', () => { mode = button.dataset.mode; render(); }));
document.querySelectorAll('.cube').forEach(cube => cube.addEventListener('click', () => {
  if (cube.dataset.pref === 'system') return;
  mode = cube.dataset.pref; render();
}));
document.querySelector('#dbb-intensity').addEventListener('input', event => { intensity = Number(event.target.value); render(); });
document.querySelector('#dbb-reset').addEventListener('click', () => { preset = DATA.defaultPreset; intensity = DATA.defaultIntensity; mode = 'light'; render(); });

const hashMode = location.hash === '#dark' ? 'dark' : 'light';
mode = hashMode;
render();
</script>
</body>
</html>`;

writeFileSync(path.join(here, '..', 'preview.html'), html);
console.log('wrote preview.html');
