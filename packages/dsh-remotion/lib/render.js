/**
 * Render engine for the Remotion bundle.
 *
 * Wraps the three SSR steps (bundle → selectComposition → renderMedia /
 * renderStill) behind one small surface so both callers share it:
 *  - the `remotion_render` / `remotion_compositions` agent tools,
 *  - the UI API under `/dsh-remotion/api`.
 *
 * Remotion is a heavy optional dependency: it is imported lazily so a broken
 * or missing installation degrades into one readable error instead of keeping
 * the whole plugin from loading.
 */
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Package root, used to resolve the bundled sample project and media. */
export const PACKAGE_DIR = path.resolve(HERE, '..');
/** Remotion entry point of the bundled sample project. */
export const ENTRY_POINT = path.join(PACKAGE_DIR, 'remotion', 'index.tsx');
/** Static media shipped with the package (sample video and rendered outputs). */
export const MEDIA_DIR = path.join(PACKAGE_DIR, 'media');
/** Where renders started from the UI are written. */
export const RENDERS_DIR = path.join(MEDIA_DIR, 'renders');
/** The committed sample render shown before the first live render. */
export const SAMPLE_FILE = path.join(MEDIA_DIR, 'hello-world.mp4');
/** The committed prompt sample shown as the panel's default preview. */
export const PROMPT_SAMPLE_FILE = path.join(MEDIA_DIR, 'prompt-sample.mp4');

const CODE_BY_FORMAT = { mp4: 'h264', webm: 'vp8', gif: 'gif' };

/**
 * Remotion bundles and ffmpeg pre-encodes in the OS temp directory. On Windows
 * that directory is sometimes locked down for child processes, and ffmpeg then
 * fails with "Permission denied" halfway through a render.
 *
 * The directory must not be the package-local `.cache/tmp`: Chromium aborts at
 * launch (SIGTRAP) when TMPDIR points there on Linux, so renders die before the
 * first frame. A subdirectory of the OS temp dir is used instead, and
 * DSH_REMOTION_TMP overrides it when a host needs a different location.
 */
const RENDER_TMP = process.env.DSH_REMOTION_TMP
  ? path.resolve(process.env.DSH_REMOTION_TMP)
  : path.join(os.tmpdir(), 'dsh-remotion');

/** Run `operation` with TEMP/TMP pointed at the package-local cache. */
async function withRenderTemp(operation) {
  const previous = {
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    TMPDIR: process.env.TMPDIR,
  };
  try {
    await mkdir(RENDER_TMP, { recursive: true });
  } catch {
    return operation();
  }
  process.env.TEMP = RENDER_TMP;
  process.env.TMP = RENDER_TMP;
  process.env.TMPDIR = RENDER_TMP;
  try {
    return await operation();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

/** Chromium binaries Remotion may use instead of downloading Chrome Headless Shell. */
const BROWSER_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const USER_CANDIDATES = [
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe') : undefined,
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft/Edge/Application/msedge.exe') : undefined,
];

/**
 * Locate a browser Remotion can drive. Returns `undefined` when none is found,
 * which lets Remotion download its own Chrome Headless Shell instead.
 */
export function detectBrowser(explicit) {
  const seen = new Set();
  for (const candidate of [explicit, process.env.REMOTION_BROWSER_EXECUTABLE, ...USER_CANDIDATES, ...BROWSER_CANDIDATES]) {
    if (typeof candidate !== 'string' || candidate.length === 0) continue;
    const normalized = path.normalize(candidate);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    if (existsSync(normalized)) return normalized;
  }
  return undefined;
}

let bundlerModule;
let rendererModule;

async function loadBundler() {
  if (bundlerModule === undefined) {
    try {
      bundlerModule = await import('@remotion/bundler');
    } catch (error) {
      throw new Error(
        `@remotion/bundler tidak dapat dimuat (${error?.message ?? error}). Jalankan "npm install" di ${PACKAGE_DIR}.`,
      );
    }
  }
  return bundlerModule;
}

async function loadRenderer() {
  if (rendererModule === undefined) {
    try {
      rendererModule = await import('@remotion/renderer');
    } catch (error) {
      throw new Error(
        `@remotion/renderer tidak dapat dimuat (${error?.message ?? error}). Jalankan "npm install" di ${PACKAGE_DIR}.`,
      );
    }
  }
  return rendererModule;
}

/** Options shared by every renderer call. */
function rendererOptions(explicitBrowser) {
  const browserExecutable = detectBrowser(explicitBrowser);
  const options = { logLevel: 'warn' };
  if (browserExecutable !== undefined) {
    options.browserExecutable = browserExecutable;
    options.chromeMode = 'chrome-for-testing';
  }
  return options;
}

let serveUrlPromise;

/**
 * Bundle the sample project once per host process. A failed bundling attempt is
 * not cached, so the next call retries after the user repairs the install.
 */
export async function ensureServeUrl() {
  if (serveUrlPromise === undefined) {
    serveUrlPromise = (async () => {
      const { bundle } = await loadBundler();
      await mkdir(RENDERS_DIR, { recursive: true });
      return withRenderTemp(() => bundle({ entryPoint: ENTRY_POINT }));
    })().catch((error) => {
      serveUrlPromise = undefined;
      throw error;
    });
  }
  return serveUrlPromise;
}

/** Plain-JSON composition descriptors; React props are stripped. */
function describe(composition) {
  return {
    id: composition.id,
    width: composition.width,
    height: composition.height,
    fps: composition.fps,
    durationInFrames: composition.durationInFrames,
    durationInSeconds: Math.round((composition.durationInFrames / composition.fps) * 100) / 100,
  };
}

/** Every composition the bundled project registers. */
export async function listCompositions({ inputProps = {}, browserExecutable } = {}) {
  const { getCompositions } = await loadRenderer();
  const serveUrl = await ensureServeUrl();
  const compositions = await getCompositions(serveUrl, {
    inputProps,
    ...rendererOptions(browserExecutable),
  });
  return compositions.map(describe);
}

/**
 * Render one composition to a video file.
 * @returns {Promise<{ outputLocation: string, composition: object }>}
 */
export async function renderComposition(options) {
  return withRenderTemp(() => renderCompositionInner(options));
}

async function renderCompositionInner(options) {
  const {
    id,
    inputProps = {},
    format = 'mp4',
    outputLocation,
    browserExecutable,
    onProgress,
  } = options;
  const codec = CODE_BY_FORMAT[format];
  if (codec === undefined) throw new Error(`Format "${format}" tidak didukung. Pilih mp4, webm, atau gif.`);

  const { renderMedia, selectComposition } = await loadRenderer();
  const serveUrl = await ensureServeUrl();
  const shared = rendererOptions(browserExecutable);
  const composition = await selectComposition({ serveUrl, id, inputProps, ...shared });

  await mkdir(path.dirname(outputLocation), { recursive: true });
  await renderMedia({
    composition,
    serveUrl,
    codec,
    outputLocation,
    inputProps,
    onProgress: (progress) => {
      if (typeof onProgress === 'function') onProgress(progress);
    },
    ...shared,
  });
  return { outputLocation, composition: describe(composition) };
}

/** Render a single frame to a PNG file. */
export async function renderStill(options) {
  return withRenderTemp(() => renderStillInner(options));
}

async function renderStillInner(options) {
  const { id, frame = 0, inputProps = {}, outputLocation, browserExecutable } = options;
  const { renderStill: renderStillFrame, selectComposition } = await loadRenderer();
  const serveUrl = await ensureServeUrl();
  const shared = rendererOptions(browserExecutable);
  const composition = await selectComposition({ serveUrl, id, inputProps, ...shared });

  await mkdir(path.dirname(outputLocation), { recursive: true });
  await renderStillFrame({
    composition,
    serveUrl,
    output: outputLocation,
    frame,
    imageFormat: 'png',
    inputProps,
    overwrite: true,
    ...shared,
  });
  return { outputLocation, composition: describe(composition) };
}

/**
 * Serialize renders. Remotion is CPU- and memory-hungry, and two concurrent
 * Chrome renders on one machine are more likely to fail than to finish sooner.
 */
let queue = Promise.resolve();

export function enqueue(operation) {
  const run = queue.then(operation, operation);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
