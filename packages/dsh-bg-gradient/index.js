/**
 * Host half of the blue gradient background plugin.
 *
 * It owns two things the browser cannot do on its own:
 *   1. the durable preference file (`$DSH_HOME/dsh-bg-gradient.json`), and
 *   2. a tiny JSON endpoint the client row reads and writes.
 *
 * Defaults come from this plugin's Cordis config, so the composition can set
 * the palette before a user ever opens Settings.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const name = 'dsh-bg-gradient';
const inject = ['webServer'];

const API_PATH = '/api/dsh-bg-gradient';

/** Presets the client knows how to render. Keep in sync with client.js. */
const PRESETS = ['none', 'aurora', 'sky', 'ice', 'deep'];

const DEFAULTS = Object.freeze({
  enabled: true,
  preset: 'aurora',
  intensity: 100,
});

function settingsFile() {
  return path.join(os.homedir(), '.dsh', 'dsh-bg-gradient.json');
}

function clampIntensity(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULTS.intensity;
  return Math.min(100, Math.max(0, Math.round(number)));
}

/** Accept only a complete, well-typed preference object. */
function normalize(input, fallback) {
  const source = typeof input === 'object' && input !== null ? input : {};
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : fallback.enabled,
    preset: PRESETS.includes(source.preset) ? source.preset : fallback.preset,
    intensity: source.intensity === undefined ? fallback.intensity : clampIntensity(source.intensity),
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

/** Read one JSON request body, capped so a stray large post cannot exhaust memory. */
function readJsonBody(req, limit = 16_384) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error('request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

/**
 * @param ctx host plugin context.
 * @param config composition config: enabled, preset, intensity.
 */
export function apply(ctx, config) {
  const base = normalize(config, DEFAULTS);

  ctx.effect(function* () {
    yield ctx.webServer.register({
      kind: 'exact',
      path: API_PATH,
      handler: async (req, res) => {
        if (req.method === 'GET') {
          send(res, 200, normalize({ ...base, ...(await readOverrides()) }, base));
          return;
        }
        if (req.method === 'POST') {
          let body;
          try {
            body = await readJsonBody(req);
          } catch (error) {
            send(res, 400, { error: String(error?.message ?? error) });
            return;
          }
          const current = normalize({ ...base, ...(await readOverrides()) }, base);
          const next = normalize(body, current);
          try {
            await writeOverrides(next);
          } catch (error) {
            send(res, 500, { error: String(error?.message ?? error) });
            return;
          }
          send(res, 200, next);
          return;
        }
        send(res, 405, { error: 'method not allowed' });
      },
    });
  }, 'dsh-bg-gradient: settings endpoint');
}

export { DEFAULTS, inject, name, PRESETS };
