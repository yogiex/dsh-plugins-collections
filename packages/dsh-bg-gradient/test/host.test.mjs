/**
 * Host-side checks: preference migration, normalisation, upload validation,
 * the fixed-path asset store, and every HTTP route the client calls.
 *
 * Runs against a throwaway `$DSH_HOME`, so it never touches the real profile.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { Readable } from 'node:stream';
import os from 'node:os';
import path from 'node:path';

const home = await mkdtemp(path.join(os.tmpdir(), 'dsh-bg-gradient-test-'));
process.env.DSH_HOME = home;

const mod = await import('../index.js');

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
  'base64',
);
const GIF = Buffer.from('GIF89a' + '0'.repeat(40), 'ascii');
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(32)]);

function dataUrl(mime, bytes) {
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function makeCtx() {
  const routes = new Map();
  const ctx = {
    effect(run) {
      const result = run();
      if (result && typeof result.next === 'function') {
        let step = result.next();
        while (!step.done) step = result.next(step.value);
      }
      return () => {};
    },
    webServer: {
      register(route) {
        routes.set(route.path, route.handler);
        return () => routes.delete(route.path);
      },
    },
  };
  return { ctx, routes };
}

function request(method, body) {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  stream.method = method;
  return stream;
}

function response() {
  const chunks = [];
  return {
    status: 0,
    headers: {},
    body: '',
    bytes: null,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(chunk) {
      if (chunk !== undefined) {
        if (Buffer.isBuffer(chunk)) {
          this.bytes = chunk;
          this.body = chunk.toString('utf8');
        } else {
          this.body = String(chunk);
        }
      }
    },
    chunks,
  };
}

async function call(routes, pathname, method = 'GET', body) {
  const handler = routes.get(pathname);
  assert.ok(handler, `route ${pathname} registered`);
  const res = response();
  await handler(request(method, body), res);
  return res;
}

const { ctx, routes } = makeCtx();
mod.apply(ctx, {});

test('registers the settings and image endpoints', () => {
  assert.deepEqual([...routes.keys()].sort(), [mod.API_PATH, mod.IMAGE_PATH].sort());
});

test('fresh profile returns the composition defaults without an upload', async () => {
  const res = await call(routes, mod.API_PATH);
  assert.equal(res.status, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.mode, 'gradient');
  assert.equal(body.preset, 'aurora');
  assert.equal(body.intensity, 100);
  assert.equal(body.dim, 40);
  assert.equal(body.upload, null);
});

test('v1 preferences migrate to gradient mode', async () => {
  await writeFile(
    mod.settingsFile(),
    JSON.stringify({ enabled: true, preset: 'deep', intensity: 70 }),
    'utf8',
  );
  const body = JSON.parse((await call(routes, mod.API_PATH)).body);
  assert.equal(body.mode, 'gradient');
  assert.equal(body.preset, 'deep');
  assert.equal(body.intensity, 70);
  await rm(mod.settingsFile(), { force: true });
});

test('POST normalises and persists, including clamping', async () => {
  const res = await call(routes, mod.API_PATH, 'POST', {
    mode: 'solid',
    solid: '#12ab34',
    dim: 999,
    intensity: -4,
    wallpaper: 'nope',
  });
  assert.equal(res.status, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.mode, 'solid');
  assert.equal(body.solid, '#12AB34');
  assert.equal(body.dim, 100);
  assert.equal(body.intensity, 0);
  assert.equal(body.wallpaper, 'mesh');

  const stored = JSON.parse(await readFile(mod.settingsFile(), 'utf8'));
  assert.equal(stored.version, 2);
  assert.equal(stored.mode, 'solid');
});

test('upload saves a PNG and serves it back with the right type', async () => {
  const res = await call(routes, mod.IMAGE_PATH, 'POST', { dataUrl: dataUrl('image/png', PNG) });
  assert.equal(res.status, 200);
  const body = JSON.parse(res.body);
  assert.ok(body.upload, 'upload info returned');
  assert.equal(body.upload.ext, 'png');
  assert.equal(body.upload.mime, 'image/png');

  const stored = await readFile(path.join(home, 'dsh-bg-gradient-assets', 'chat-background.png'));
  assert.deepEqual(stored, PNG);

  const image = await call(routes, mod.IMAGE_PATH);
  assert.equal(image.status, 200);
  assert.equal(image.headers['Content-Type'], 'image/png');
  assert.deepEqual(image.bytes, PNG);

  const head = await call(routes, mod.IMAGE_PATH, 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.bytes, null);
});

test('upload accepts GIF and WebP and replaces the previous file', async () => {
  let body = JSON.parse(
    (await call(routes, mod.IMAGE_PATH, 'POST', { dataUrl: dataUrl('image/gif', GIF) })).body,
  );
  assert.equal(body.upload.ext, 'gif');
  assert.equal(body.upload.animated, true);

  body = JSON.parse(
    (await call(routes, mod.IMAGE_PATH, 'POST', { dataUrl: dataUrl('image/webp', WEBP) })).body,
  );
  assert.equal(body.upload.ext, 'webp');
  assert.equal(body.upload.animated, true);

  const entries = await mod.assetInfo();
  assert.equal(entries.ext, 'webp');
});

test('upload rejects SVG, mismatched bytes, and oversized payloads', async () => {
  const svg = `data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}`;
  let res = await call(routes, mod.IMAGE_PATH, 'POST', { dataUrl: svg });
  assert.equal(res.status, 415);
  assert.equal(JSON.parse(res.body).code, 'bad-type');

  res = await call(routes, mod.IMAGE_PATH, 'POST', {
    dataUrl: dataUrl('image/png', Buffer.from('GIF89a' + '0'.repeat(40))),
  });
  assert.equal(res.status, 415);
  assert.equal(JSON.parse(res.body).code, 'bad-image');

  const huge = `data:image/png;base64,${'A'.repeat(Math.ceil((8 * 1024 * 1024 * 4) / 3) + 32)}`;
  res = await call(routes, mod.IMAGE_PATH, 'POST', { dataUrl: huge });
  assert.equal(res.status, 413);
  assert.equal(JSON.parse(res.body).code, 'too-large');

  res = await call(routes, mod.IMAGE_PATH, 'POST', { dataUrl: 'nope' });
  assert.equal(res.status, 400);
  assert.equal(JSON.parse(res.body).code, 'bad-data-url');
});

test('upload mode survives a GET once the asset exists; DELETE clears both', async () => {
  await call(routes, mod.API_PATH, 'POST', { mode: 'upload', dim: 55 });
  let body = JSON.parse((await call(routes, mod.API_PATH)).body);
  assert.equal(body.mode, 'upload');
  assert.ok(body.upload.url.startsWith('/api/dsh-bg-gradient/image?v='));
  assert.equal(body.dim, 55);

  const res = await call(routes, mod.IMAGE_PATH, 'DELETE');
  assert.equal(res.status, 200);
  body = JSON.parse((await call(routes, mod.API_PATH)).body);
  assert.equal(body.mode, 'gradient');
  assert.equal(body.upload, null);
  const missing = await call(routes, mod.IMAGE_PATH);
  assert.equal(missing.status, 404);
});

test('mode upload without an asset falls back to gradient on GET', async () => {
  await writeFile(
    mod.settingsFile(),
    JSON.stringify({ version: 2, mode: 'upload', dim: 30 }),
    'utf8',
  );
  const body = JSON.parse((await call(routes, mod.API_PATH)).body);
  assert.equal(body.mode, 'gradient');
  assert.equal(body.upload, null);
});

test('unknown methods answer 405 instead of crashing', async () => {
  const res = await call(routes, mod.API_PATH, 'PUT');
  assert.equal(res.status, 405);
});

test.after(async () => {
  await rm(home, { recursive: true, force: true });
});
