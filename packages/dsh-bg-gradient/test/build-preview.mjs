/**
 * Renders test/applied.json into a static preview page.
 *
 * Every gradient, wallpaper and token comes from the real client bundle (via
 * the hooks the logic test captures), so the page cannot drift from the code.
 * This is a review artifact, not a substitute for checking the live GUI.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const applied = JSON.parse(readFileSync(path.join(here, 'applied.json'), 'utf8'));

const escape = (value) =>
  String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);

function presetCard(preset, scheme) {
  const full = scheme === 'light' ? preset.lightFull : preset.darkFull;
  const soft = scheme === 'light' ? preset.lightSoft : preset.darkSoft;
  return `
    <article class="card">
      <div class="art" style="background-image:${full}"></div>
      <h3>${escape(preset.label)} <small>${escape(preset.hint)}</small></h3>
      <div class="split">
        <span class="chip" style="background-image:${full}">100%</span>
        <span class="chip" style="background-image:${soft}">40%</span>
      </div>
    </article>`;
}

function wallpaperCard(item, scheme) {
  return `
    <article class="card">
      <div class="art" style="background-image:${item[scheme]}"></div>
      <h3>${escape(item.label)}</h3>
    </article>`;
}

function surfacePreview(scheme) {
  const background = applied.layers[scheme];
  return `
    <div class="chat" data-scheme="${scheme}">
      <div class="chatBg" style="background-image:${background}"></div>
      <div class="bubble">How does the chat background look in ${scheme} mode?</div>
      <div class="bubble me">It sits behind the conversation, not the sidebar.</div>
    </div>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>dsh-bg-gradient · mode gallery</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 ui-sans-serif, system-ui, sans-serif; background: #f6f7fb; color: #16181d; }
  header { padding: 28px clamp(16px, 5vw, 56px) 8px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p.note { margin: 0; max-width: 78ch; color: #5b616b; font-size: 13px; }
  main { padding: 20px clamp(16px, 5vw, 56px) 56px; display: grid; gap: 28px; }
  section { display: grid; gap: 12px; }
  h2 { font-size: 15px; margin: 0; text-transform: uppercase; letter-spacing: .08em; color: #5b616b; }
  .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
  .card { background: #fff; border: 1px solid #e4e7ee; border-radius: 14px; padding: 10px; display: grid; gap: 8px; }
  .art { height: 96px; border-radius: 9px; background-size: cover; background-position: center; border: 1px solid #eceef4; }
  h3 { font-size: 13px; margin: 0; display: grid; }
  h3 small { color: #6a707a; font-weight: 400; font-size: 11px; }
  .split { display: flex; gap: 6px; }
  .chip { flex: 1; height: 22px; border-radius: 6px; color: #101216; font-size: 10px; display: grid; place-items: center; background-size: cover; border: 1px solid #e9ebf2; text-shadow: 0 0 4px #fff; }
  .chat { position: relative; height: 240px; border-radius: 16px; overflow: hidden; border: 1px solid #dfe3ec; }
  .chatBg { position: absolute; inset: 0; background-size: cover; background-position: center; }
  .chat::after { content: ""; position: absolute; inset: 0; background: rgba(255,255,255,var(--veil, .72)); }
  .chat[data-scheme="dark"] { background: #151517; }
  .chat[data-scheme="dark"]::after { background: rgba(21,21,23,var(--veil, .72)); }
  .bubble { position: relative; z-index: 1; margin: 20px; max-width: 46ch; padding: 10px 14px; border-radius: 12px; background: rgba(255,255,255,.86); border: 1px solid rgba(16,18,22,.08); font-size: 13px; }
  .chat[data-scheme="dark"] .bubble { background: rgba(40,42,48,.86); color: #eef0f4; border-color: rgba(255,255,255,.08); }
  .bubble.me { margin-left: auto; margin-top: 8px; }
  footer { padding: 0 clamp(16px, 5vw, 56px) 32px; color: #6a707a; font-size: 12px; }
  code { font-size: 12px; }
</style>
</head>
<body>
<header>
  <h1>dsh-bg-gradient · mode gallery</h1>
  <p class="note">Generated from <code>test/applied.json</code>. Gradients, wallpapers, scrim alpha and accent tokens are the values the client bundle actually computes. The chat mock approximates the two translucent <code>bg-base</code> layers; the live GUI is the real check.</p>
</header>
<main>
  <section>
    <h2>Chat surface (light)</h2>
    ${surfacePreview('light')}
  </section>
  <section>
    <h2>Chat surface (dark)</h2>
    ${surfacePreview('dark')}
  </section>
  <section>
    <h2>Gradient presets</h2>
    <div class="grid">${applied.presets.map((preset) => presetCard(preset, 'light')).join('')}</div>
  </section>
  <section>
    <h2>Procedural wallpapers</h2>
    <div class="grid">${applied.wallpapers.map((item) => wallpaperCard(item, 'light')).join('')}</div>
  </section>
  <section>
    <h2>Solid presets</h2>
    <div class="grid">${applied.solids
      .map(
        (solid) => `<article class="card"><div class="art" style="background:${solid.hex}"></div><h3>${escape(solid.id)} <small>${solid.hex}</small></h3></article>`,
      )
      .join('')}</div>
  </section>
  <section>
    <h2>Readability scrim</h2>
    <div class="grid">
      <article class="card"><div class="art" style="background:${applied.surface.light}"></div><h3>light bg-base <small>alpha ${applied.surface.light.slice(7)}</small></h3></article>
      <article class="card"><div class="art" style="background:${applied.surface.dark}"></div><h3>dark bg-base <small>alpha ${applied.surface.dark.slice(7)}</small></h3></article>
      <article class="card"><div class="art" style="background:rgba(255,255,255,${applied.scrim.light})"></div><h3>scrim light <small>${applied.scrim.light.toFixed(2)}</small></h3></article>
      <article class="card"><div class="art" style="background:rgba(21,21,23,${applied.scrim.dark})"></div><h3>scrim dark <small>${applied.scrim.dark.toFixed(2)}</small></h3></article>
    </div>
  </section>
</main>
<footer>Recompute with <code>node test/logic.test.mjs</code>, then rebuild this page with <code>node test/build-preview.mjs</code>.</footer>
</body>
</html>
`;

writeFileSync(path.join(here, '..', 'preview.html'), html);
console.log('wrote preview.html');
