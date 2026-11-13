/**
 * Host half of the chat background plugin.
 *
 * It owns three things the browser cannot do on its own:
 *   1. the durable preference file (`$DSH_HOME/dsh-bg-gradient.json`),
 *   2. the uploaded image on disk (`$DSH_HOME/dsh-bg-gradient-assets/`), and
 *   3. the small JSON endpoints the client reads, writes, and uploads through.
 *
 * Defaults come from this plugin's Cordis config, so the composition can set
 * the palette before a user ever opens Settings. A user change wins over the
 * config and is written to the preference file.
 */
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const name = 'dsh-bg-gradient';
const inject = ['webServer'];

const API_PATH = '/api/dsh-bg-gradient';
const IMAGE_PATH = '/api/dsh-bg-gradient/image';

/** Modes the client knows how to render. Keep in sync with client.js. */
const MODES = ['none', 'gradient', 'solid', 'wallpaper', 'upload'];
const PRESETS = ['aurora', 'sky', 'ice', 'deep'];
const WALLPAPERS = ['mesh', 'waves', 'topo', 'dots', 'rays', 'grid'];

/** Upload formats, by the extension derived from the actual file bytes. */
const MIME_BY_EXT = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** 8 MiB decoded; the base64 body is capped a little above that. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_UPLOAD_BODY = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4096;
const MAX_CONFIG_BODY = 16_384;

const DEFAULTS = Object.freeze({
  version: 2,
  enabled: true,
  mode: 'gradient',
  preset: 'aurora',
  intensity: 100,
  solid: '#0B1220',
  wallpaper: 'mesh',
  dim: 40,
  animate: true,
});

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function stateDir() {
  return process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
}

function settingsFile() {
  return path.join(stateDir(), 'dsh-bg-gradient.json');
}

function assetsDir() {
  return path.join(stateDir(), 'dsh-bg-gradient-assets');
}

function assetBase() {
  return path.join(assetsDir(), 'chat-background');
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function normalizeMode(source) {
  if (MODES.includes(source.mode)) return source.mode;
  // v1 preferences only had `enabled` and `preset`; migrate them in place.
  if (source.preset !== undefined || source.enabled !== undefined) {
    if (source.enabled === false) return 'none';
    if (source.preset === 'none') return 'none';
    if (PRESETS.includes(source.preset) || source.preset === undefined) return 'gradient';
  }
  return null;
}

/**
 * Accept only a complete, well-typed preference object.
 * Upload metadata is server-owned and is intentionally not read from here.
 */
function normalizeConfig(input, fallback = DEFAULTS) {
  const source = typeof input === 'object' && input !== null ? input : {};
  const mode = normalizeMode(source) ?? fallback.mode;
  return {
    version: 2,
    enabled: mode !== 'none',
    mode,
    preset: PRESETS.includes(source.preset) ? source.preset : fallback.preset,
    intensity:
      source.intensity === undefined
        ? fallback.intensity
        : clampInt(source.intensity, 0, 100, fallback.intensity),
    solid: HEX_COLOR.test(source.solid) ? source.solid.toUpperCase() : fallback.solid,
    wallpaper: WALLPAPERS.includes(source.wallpaper) ? source.wallpaper : fallback.wallpaper,
    dim: source.dim === undefined ? fallback.dim : clampInt(source.dim, 0, 100, fallback.dim),
    animate: typeof source.animate === 'boolean' ? source.animate : fallback.animate,
  };
}

async function readOverrides() {
  try {
    const raw = await readFile(settingsFile(), 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function writeOverrides(value) {
  const file = settingsFile();
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, file);
}

function uploadInfo(asset) {
  if (!asset) return null;
  return {
    url: asset.url,
    ext: asset.ext,
    mime: asset.mime,
    bytes: asset.bytes,
    animated: asset.animated,
  };
}

/** The file name is fixed by the host; the client never supplies a path. */
async function assetInfo() {
  let entries;
  try {
    entries = await readdir(assetsDir());
  } catch {
    return null;
  }
  for (const entry of entries) {
    const match = /^chat-background\.(jpg|png|webp|gif)$/.exec(entry);
    if (!match) continue;
    const file = path.join(assetsDir(), entry);
    try {
      const info = await stat(file);
      if (!info.isFile() || info.size === 0) continue;
      const ext = match[1];
      const version = Math.round(info.mtimeMs);
      return {
        ext,
        mime: MIME_BY_EXT[ext],
        bytes: info.size,
        version,
        animated: ext === 'gif' || ext === 'webp',
        url: `${IMAGE_PATH}?v=${version}`,
      };
    } catch {
      return null;
    }
  }
  return null;
}

async function effectiveConfig(base) {
  const overrides = await readOverrides();
  let config = normalizeConfig({ ...base, ...overrides }, base);
  const asset = await assetInfo();
  if (config.mode === 'upload' && !asset) config = { ...config, mode: 'gradient', enabled: true };
  return { config, asset };
}

function publicConfig(config, asset) {
  return { ...config, upload: uploadInfo(asset) };
}

/**
 * Prove that the decoded bytes match one of the accepted raster formats.
 * SVG is rejected on purpose: it can carry script and this endpoint serves the
 * file back into the page.
 */
function detectImage(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  const header = buffer.toString('ascii', 0, 6);
  if (header === 'GIF87a' || header === 'GIF89a') return 'gif';
  return null;
}

class RequestError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Validate a `data:image/...;base64,...` URL and return the decoded bytes. */
function validateImageDataUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('data:')) {
    throw new RequestError('expected a data URL', 400, 'bad-data-url');
  }
  const match = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(value);
  if (!match) throw new RequestError('expected a base64 data URL', 400, 'bad-data-url');
  const mime = match[1].toLowerCase();
  if (!Object.values(MIME_BY_EXT).includes(mime)) {
    throw new RequestError('unsupported image type', 415, 'bad-type');
  }
  const base64 = match[2].replace(/\s+/g, '');
  if (base64.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4) {
    throw new RequestError('image is too large', 413, 'too-large');
  }
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0) throw new RequestError('empty image', 400, 'bad-image');
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new RequestError('image is too large', 413, 'too-large');
  }
  const ext = detectImage(buffer);
  if (!ext || MIME_BY_EXT[ext] !== mime) {
    throw new RequestError('image bytes do not match the declared type', 415, 'bad-image');
  }
  return { ext, bytes: buffer.length, buffer };
}

/** Read one JSON request body, capped so a stray large post cannot exhaust memory. */
function readJsonBody(req, limit) {
  return new Promise((resolve, reject) => {
    let body = '';
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > limit) {
        fail(new RequestError('request body too large', 413, 'too-large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new RequestError('invalid JSON body', 400, 'bad-json'));
      }
    });
    req.on('error', (error) => fail(error));
  });
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

async function serveImage(res, headOnly) {
  const asset = await assetInfo();
  if (!asset) {
    send(res, 404, { error: 'no background image', code: 'not-found' });
    return;
  }
  let bytes;
  try {
    bytes = await readFile(path.join(assetsDir(), `chat-background.${asset.ext}`));
  } catch {
    send(res, 404, { error: 'no background image', code: 'not-found' });
    return;
  }
  res.writeHead(200, {
    'Content-Type': asset.mime,
    'Content-Length': bytes.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(headOnly ? undefined : bytes);
}

async function saveImage(bytes, ext) {
  await mkdir(assetsDir(), { recursive: true });
  const target = `${assetBase()}.${ext}`;
  const temporary = `${target}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, target);
  // Replacing a GIF with a PNG must not leave the old GIF behind.
  const entries = await readdir(assetsDir()).catch(() => []);
  await Promise.all(
    entries
      .filter((entry) => entry.startsWith('chat-background.') && entry !== `chat-background.${ext}`)
      .map((entry) => rm(path.join(assetsDir(), entry), { force: true })),
  );
}

async function removeImage() {
  const entries = await readdir(assetsDir()).catch(() => []);
  await Promise.all(
    entries
      .filter((entry) => entry.startsWith('chat-background.'))
      .map((entry) => rm(path.join(assetsDir(), entry), { force: true })),
  );
}

/**
 * @param ctx host plugin context.
 * @param config composition config: mode, preset, intensity, solid, wallpaper, dim, animate.
 */
export function apply(ctx, config) {
  const base = normalizeConfig(config, DEFAULTS);

  ctx.effect(function* () {
    yield ctx.webServer.register({
      kind: 'exact',
      path: API_PATH,
      handler: async (req, res) => {
        if (req.method === 'GET') {
          const { config: current, asset } = await effectiveConfig(base);
          send(res, 200, publicConfig(current, asset));
          return;
        }
        if (req.method === 'POST') {
          let body;
          try {
            body = await readJsonBody(req, MAX_CONFIG_BODY);
          } catch (error) {
            send(res, error.status ?? 400, { error: String(error.message), code: error.code ?? 'bad-request' });
            return;
          }
          const before = await effectiveConfig(base);
          const next = normalizeConfig(body, before.config);
          try {
            await writeOverrides(next);
          } catch (error) {
            send(res, 500, { error: String(error?.message ?? error), code: 'io' });
            return;
          }
          const after = await effectiveConfig(base);
          send(res, 200, publicConfig(after.config, after.asset));
          return;
        }
        send(res, 405, { error: 'method not allowed', code: 'method' });
      },
    });

    yield ctx.webServer.register({
      kind: 'exact',
      path: IMAGE_PATH,
      handler: async (req, res) => {
        if (req.method === 'GET' || req.method === 'HEAD') {
          await serveImage(res, req.method === 'HEAD');
          return;
        }
        if (req.method === 'POST') {
          let body;
          try {
            body = await readJsonBody(req, MAX_UPLOAD_BODY);
          } catch (error) {
            send(res, error.status ?? 400, { error: String(error.message), code: error.code ?? 'bad-request' });
            return;
          }
          let image;
          try {
            image = validateImageDataUrl(body?.dataUrl);
          } catch (error) {
            send(res, error.status ?? 400, { error: String(error.message), code: error.code ?? 'bad-image' });
            return;
          }
          try {
            await saveImage(image.buffer, image.ext);
          } catch (error) {
            send(res, 500, { error: String(error?.message ?? error), code: 'io' });
            return;
          }
          send(res, 200, { upload: uploadInfo(await assetInfo()) });
          return;
        }
        if (req.method === 'DELETE') {
          try {
            await removeImage();
            const overrides = await readOverrides();
            if (normalizeConfig({ ...base, ...overrides }, base).mode === 'upload') {
              await writeOverrides(normalizeConfig({ ...overrides, mode: 'gradient' }, base));
            }
          } catch (error) {
            send(res, 500, { error: String(error?.message ?? error), code: 'io' });
            return;
          }
          send(res, 200, { ok: true });
          return;
        }
        send(res, 405, { error: 'method not allowed', code: 'method' });
      },
    });
  }, 'dsh-bg-gradient: settings endpoint');
}

export {
  API_PATH,
  DEFAULTS,
  IMAGE_PATH,
  MAX_IMAGE_BYTES,
  MODES,
  PRESETS,
  RequestError,
  WALLPAPERS,
  assetInfo,
  detectImage,
  effectiveConfig,
  inject,
  name,
  normalizeConfig,
  publicConfig,
  settingsFile,
  validateImageDataUrl,
};
