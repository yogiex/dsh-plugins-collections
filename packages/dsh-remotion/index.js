/**
 * Host half of the Remotion bundle.
 *
 * Two callers share one render engine from lib/render.js:
 *  - the `remotion_render` and `remotion_compositions` agent tools,
 *  - the UI API under `/dsh-remotion/api`, consumed by the Remotion page in
 *    client.js, plus the media route that streams the rendered files.
 *
 * Rendering runs in this host process: Remotion bundles the bundled sample
 * project with webpack and drives a local Chrome/Edge or its own headless
 * shell. Nothing is uploaded anywhere.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import {
  MEDIA_DIR,
  PACKAGE_DIR,
  detectBrowser,
  enqueue,
  listCompositions,
  renderComposition,
  renderStill,
} from './lib/render.js';

export const name = 'remotion';

const API_PREFIX = '/dsh-remotion';
const TOOL_TIMEOUT_MS = 600_000;
const MAX_BODY_BYTES = 256 * 1024;
const MAX_JOBS = 20;
/**
 * Folder the panel writes to and lists. It mirrors the agent tools: the
 * `remotion` folder inside the session workspace, not a folder inside this
 * package. Updated whenever a tool call reveals the active workspace.
 */
let uiWorkspaceDir;
function uiRendersDir() {
  return uiWorkspaceDir ?? path.join(process.cwd(), 'remotion');
}
const IMAGE_FORMATS = new Set(['png']);
const VIDEO_FORMATS = new Set(['mp4', 'webm', 'gif']);
const MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

/* ------------------------------------------------------------------ *
 * Composition cache
 * ------------------------------------------------------------------ */

let compositionsCache;
let compositionsError;
let compositionsPromise;

/** Bundle once, then answer from cache; a failed attempt is retried next call. */
async function loadCompositions(force = false) {
  if (force) {
    compositionsCache = undefined;
  }
  if (compositionsCache !== undefined) return compositionsCache;
  if (compositionsPromise === undefined) {
    compositionsError = undefined;
    compositionsPromise = enqueue(() => listCompositions())
      .then((compositions) => {
        compositionsCache = compositions;
        return compositions;
      })
      .catch((error) => {
        compositionsError = error?.message ?? String(error);
        throw error;
      })
      .finally(() => {
        compositionsPromise = undefined;
      });
  }
  return compositionsPromise;
}

/* ------------------------------------------------------------------ *
 * UI render jobs
 * ------------------------------------------------------------------ */

const jobs = new Map();
let latestJobId;
let activeJobId;

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    compositionId: job.compositionId,
    composition: job.composition,
    format: job.format,
    prompt: job.prompt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    output: job.output,
    url: job.url,
    error: job.error,
  };
}

function rememberJob(job) {
  jobs.set(job.id, job);
  while (jobs.size > MAX_JOBS) {
    const oldest = jobs.keys().next().value;
    if (oldest === activeJobId) break;
    jobs.delete(oldest);
  }
}

/** Start one UI render, rejecting while another one is still running. */
function startJob({ compositionId, format, props, prompt }) {
  if (activeJobId !== undefined) {
    return { busy: true, job: jobs.get(activeJobId) };
  }
  const id = randomUUID();
  const extension = format === 'png' ? 'png' : format;
  const filename = `${compositionId}-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
  const outputLocation = path.join(uiRendersDir(), filename);
  const job = {
    id,
    status: 'running',
    progress: 0,
    compositionId,
    composition: undefined,
    format,
    prompt,
    startedAt: new Date().toISOString(),
    finishedAt: undefined,
    output: undefined,
    url: undefined,
    error: undefined,
    filename,
  };
  rememberJob(job);
  latestJobId = id;
  activeJobId = id;

  const render =
    format === 'png'
      ? renderStill({ id: compositionId, inputProps: props, frame: 0, outputLocation })
      : renderComposition({
          id: compositionId,
          inputProps: props,
          format,
          outputLocation,
          onProgress: ({ progress }) => {
            job.progress = Math.round(progress * 1000) / 1000;
          },
        });

  render
    .then((result) => {
      job.status = 'done';
      job.progress = 1;
      job.output = outputLocation;
      job.composition = result?.composition;
      job.url = `${API_PREFIX}/media/renders/${encodeURIComponent(filename)}`;
    })
    .catch((error) => {
      job.status = 'failed';
      job.error = error?.message ?? String(error);
    })
    .finally(() => {
      job.finishedAt = new Date().toISOString();
      if (activeJobId === id) activeJobId = undefined;
    });

  return { busy: false, job };
}

/* ------------------------------------------------------------------ *
 * Media listing and serving
 * ------------------------------------------------------------------ */

async function listRenders() {
  const dir = uiRendersDir();
  if (!existsSync(dir)) return [];
  const names = await readdir(dir).catch(() => []);
  const rows = [];
  for (const name of names) {
    const extension = path.extname(name).toLowerCase();
    if (MIME[extension] === undefined) continue;
    const info = await stat(path.join(dir, name)).catch(() => undefined);
    if (info === undefined || !info.isFile()) continue;
    rows.push({
      name,
      url: `${API_PREFIX}/media/renders/${encodeURIComponent(name)}`,
      size: info.size,
      modifiedAt: info.mtime.toISOString(),
      sample: false,
    });
  }
  rows.sort((left, right) => String(right.modifiedAt ?? '').localeCompare(String(left.modifiedAt ?? '')));
  return rows.slice(0, 30);
}

function send(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(text);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('body terlalu besar');
    chunks.push(chunk);
  }
  if (size === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    const value = JSON.parse(text);
    return value !== null && typeof value === 'object' ? value : {};
  } catch {
    throw new Error('body bukan JSON yang valid');
  }
}

/** Stream one file below the media directory, honoring simple Range requests. */
function serveMedia(req, res, baseDir, filePath) {
  const resolved = path.resolve(baseDir, filePath);
  if (resolved !== baseDir && !resolved.startsWith(`${baseDir}${path.sep}`)) {
    return sendText(res, 403, 'forbidden');
  }
  if (!existsSync(resolved)) return sendText(res, 404, 'not found');

  let info;
  try {
    info = statSync(resolved);
  } catch {
    return sendText(res, 404, 'not found');
  }
  if (!info.isFile()) return sendText(res, 404, 'not found');

  const type = MIME[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream';
  const headers = {
    'content-type': type,
    'accept-ranges': 'bytes',
    'cache-control': 'no-store',
  };

  const range = typeof req.headers.range === 'string' ? /^bytes=(\d*)-(\d*)$/.exec(req.headers.range) : null;
  if (range !== null) {
    const start = range[1] === '' ? Math.max(0, info.size - Number(range[2] ?? 0)) : Number(range[1]);
    const end = range[2] === '' || range[1] === '' ? info.size - 1 : Math.min(Number(range[2]), info.size - 1);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= info.size) {
      res.writeHead(416, { 'content-range': `bytes */${info.size}` });
      return res.end();
    }
    res.writeHead(206, {
      ...headers,
      'content-range': `bytes ${start}-${end}/${info.size}`,
      'content-length': end - start + 1,
    });
    createReadStream(resolved, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { ...headers, 'content-length': info.size });
    createReadStream(resolved).pipe(res);
  }
  return undefined;
}

/* ------------------------------------------------------------------ *
 * Tools
 * ------------------------------------------------------------------ */

const COMPOSITION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', description: 'Composition id from remotion_compositions.' },
    width: { type: 'integer' },
    height: { type: 'integer' },
    fps: { type: 'number' },
    durationInFrames: { type: 'integer' },
    durationInSeconds: { type: 'number' },
  },
  required: ['id', 'width', 'height', 'fps', 'durationInFrames'],
};

const RENDER_PARAMETERS = {
  type: 'object',
  additionalProperties: false,
  properties: {
    composition_id: {
      type: 'string',
      description: 'Composition to render. Defaults to HelloWorld, the sample bundled with the plugin.',
    },
    format: {
      type: 'string',
      enum: ['mp4', 'webm', 'gif', 'png'],
      description: 'mp4 (default) for video, png for a single still frame.',
    },
    frame: {
      type: 'integer',
      description: 'Frame to capture for format "png". Defaults to 0.',
    },
    output: {
      type: 'string',
      description:
        'Output file path. Relative paths resolve inside the session workspace (in a "remotion" folder); omission picks a timestamped name there.',
    },
    props: {
      type: 'object',
      description:
        'Input props passed to the composition, merged over its defaultProps. A string "prompt" renders the PromptVideo composition: the prompt text becomes the video.',
    },
  },
};

const RENDER_OUTPUT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    composition: COMPOSITION_SCHEMA,
    format: { type: 'string' },
    output: { type: 'string', description: 'Absolute path of the written file.' },
    durationMs: { type: 'integer' },
  },
  required: ['composition', 'format', 'output'],
};

const COMPOSITIONS_PARAMETERS = {
  type: 'object',
  additionalProperties: false,
  properties: {
    refresh: {
      type: 'boolean',
      description: 'Re-bundle the project instead of answering from the cached composition list.',
    },
  },
};

const COMPOSITIONS_OUTPUT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    compositions: { type: 'array', items: COMPOSITION_SCHEMA },
    browser: {
      type: 'object',
      additionalProperties: false,
      properties: {
        detected: { type: 'boolean' },
        path: { type: 'string' },
      },
      required: ['detected'],
    },
  },
  required: ['compositions', 'browser'],
};

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/** Session working directory when the tool registry passes the agent along. */
async function resolveOutputDir(ctx, exec) {
  try {
    const service = ctx.get('workingDirectory');
    const agent = exec?.agent ?? exec?.callerAgent ?? exec?.session?.agent;
    if (service !== undefined && agent !== undefined && agent !== null) {
      const dir = await service.ensure(agent);
      if (typeof dir === 'string' && dir.length > 0) {
        uiWorkspaceDir = path.join(dir, 'remotion');
        return uiWorkspaceDir;
      }
    }
    if (typeof service?.defaultDirectory === 'string' && service.defaultDirectory.length > 0) {
      uiWorkspaceDir = path.join(service.defaultDirectory, 'remotion');
      return uiWorkspaceDir;
    }
  } catch {
    // Fall through to the package-local output folder.
  }
  return path.join(PACKAGE_DIR, 'out');
}

/* ------------------------------------------------------------------ *
 * Plugin
 * ------------------------------------------------------------------ */

export const inject = ['tools', 'webServer'];

/**
 * Register the Remotion tools and the UI API/media routes.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  try {
    const service = ctx.get('workingDirectory');
    if (uiWorkspaceDir === undefined && typeof service?.defaultDirectory === 'string') {
      uiWorkspaceDir = path.join(service.defaultDirectory, 'remotion');
    }
  } catch {
    // No working-directory service: keep process.cwd().
  }

  ctx.tools.register({
    name: 'remotion_compositions',
    description:
      'List the Remotion compositions available to this plugin and whether a local Chrome the renderer can drive was detected. Call it before remotion_render to discover composition ids and their dimensions, frame rate, and duration.',
    parameters: COMPOSITIONS_PARAMETERS,
    output: {
      schema: COMPOSITIONS_OUTPUT,
      render: (_args, value) => {
        const lines = value.compositions.map(
          (item) =>
            `- ${item.id} · ${item.width}×${item.height} · ${item.fps} fps · ${item.durationInFrames} frame (${item.durationInSeconds ?? '?'} dtk)`,
        );
        const browser = value.browser.detected
          ? `Browser: ${value.browser.path}`
          : 'Browser: tidak terdeteksi, Remotion akan mengunduh Chrome Headless Shell saat render pertama.';
        return [{ type: 'text', text: [`${value.compositions.length} komposisi:`, ...lines, browser].join('\n') }];
      },
    },
    timeoutMs: TOOL_TIMEOUT_MS,
    isConcurrencySafe: () => false,
    async execute(args) {
      const compositions = await loadCompositions(args.refresh === true);
      const browserPath = detectBrowser();
      return {
        compositions,
        browser: browserPath === undefined ? { detected: false } : { detected: true, path: browserPath },
      };
    },
  });

  ctx.tools.register({
    name: 'remotion_render',
    description:
      'Render a Remotion composition to a video or still file in the session workspace. Remotion builds videos from React components: pass props.prompt to render the PromptVideo composition, which turns the prompt text into a kinetic typographic clip, or edit the composition in the bundled remotion/ project for anything richer. A 4-second 1080p sample renders in about 15-25 seconds with the local Chrome. Returns the output path and the composition metadata; for png the frame is selected with "frame".',
    parameters: RENDER_PARAMETERS,
    output: {
      schema: RENDER_OUTPUT,
      render: (_args, value) => {
        const meta = `${value.composition.id} · ${value.composition.width}×${value.composition.height} · ${value.composition.fps} fps · ${value.composition.durationInFrames} frame`;
        const seconds = typeof value.durationMs === 'number' ? `\nDurasi render: ${(value.durationMs / 1000).toFixed(1)} detik.` : '';
        return [{ type: 'text', text: `${value.format.toUpperCase()} siap: ${value.output}\n${meta}${seconds}` }];
      },
    },
    timeoutMs: TOOL_TIMEOUT_MS,
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const inputProps = args.props !== null && typeof args.props === 'object' ? args.props : {};
      const prompt = typeof inputProps.prompt === 'string' && inputProps.prompt.trim().length > 0
        ? inputProps.prompt.trim()
        : undefined;
      const compositionId = typeof args.composition_id === 'string' && args.composition_id.length > 0
        ? args.composition_id
        : prompt === undefined
          ? 'HelloWorld'
          : 'PromptVideo';
      const format = typeof args.format === 'string' ? args.format : 'mp4';
      if (!VIDEO_FORMATS.has(format) && !IMAGE_FORMATS.has(format)) {
        throw new Error(`Format "${format}" tidak didukung. Pilih mp4, webm, gif, atau png.`);
      }
      const started = Date.now();

      let outputLocation;
      if (typeof args.output === 'string' && args.output.trim().length > 0) {
        const raw = args.output.trim();
        const base = path.isAbsolute(raw) ? raw : path.join(await resolveOutputDir(ctx, exec), raw);
        outputLocation = path.extname(base) === '' ? `${base}.${format}` : base;
      } else {
        const dir = await resolveOutputDir(ctx, exec);
        outputLocation = path.join(dir, `${compositionId}-${stamp()}.${format}`);
      }

      const result = await enqueue(() =>
        format === 'png'
          ? renderStill({
              id: compositionId,
              frame: Number.isInteger(args.frame) ? args.frame : 0,
              inputProps,
              outputLocation,
            })
          : renderComposition({ id: compositionId, inputProps, format, outputLocation }),
      );

      return {
        composition: result.composition,
        format,
        output: result.outputLocation,
        durationMs: Date.now() - started,
      };
    },
  });

  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'prefix',
      path: API_PREFIX,
      handler: async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://remotion.local');
        const pathname = url.pathname.startsWith(API_PREFIX)
          ? url.pathname.slice(API_PREFIX.length)
          : url.pathname;

        if (pathname.startsWith('/media/')) {
          if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'metode tidak didukung' });
          const rest = pathname.slice('/media/'.length);
          if (rest.startsWith('renders/')) {
            return serveMedia(req, res, uiRendersDir(), rest.slice('renders/'.length));
          }
          return serveMedia(req, res, MEDIA_DIR, rest);
        }

        try {
          if (pathname === '/api/state' && req.method === 'GET') {
            const browserPath = detectBrowser();
            return send(res, 200, {
              browser: browserPath === undefined ? { detected: false } : { detected: true, path: browserPath },
              compositions: compositionsCache ?? null,
              compositionsError: compositionsError ?? null,
              renders: await listRenders(),
              workspace: uiRendersDir(),
              job: latestJobId === undefined ? null : publicJob(jobs.get(latestJobId)),
            });
          }

          if (pathname === '/api/compositions' && req.method === 'GET') {
            const compositions = await loadCompositions(url.searchParams.get('refresh') === '1');
            return send(res, 200, { compositions });
          }

          if (pathname === '/api/render' && req.method === 'POST') {
            const body = await readJsonBody(req);
            const prompt = typeof body.prompt === 'string' && body.prompt.trim().length > 0
              ? body.prompt.trim()
              : undefined;
            const compositionId = typeof body.compositionId === 'string' && body.compositionId.length > 0
              ? body.compositionId
              : prompt === undefined
                ? 'HelloWorld'
                : 'PromptVideo';
            const format = typeof body.format === 'string' ? body.format : 'mp4';
            if (!VIDEO_FORMATS.has(format) && !IMAGE_FORMATS.has(format)) {
              return send(res, 400, { error: `format "${format}" tidak didukung` });
            }
            const props = {
              ...(body.props !== null && typeof body.props === 'object' ? body.props : {}),
              ...(prompt === undefined ? {} : { prompt }),
            };
            await mkdir(uiRendersDir(), { recursive: true });
            const started = startJob({ compositionId, format, props, prompt });
            if (started.busy) {
              return send(res, 409, { error: 'render lain masih berjalan', job: publicJob(started.job) });
            }
            return send(res, 202, { job: publicJob(started.job) });
          }

          if (pathname === '/api/job' && req.method === 'GET') {
            const id = url.searchParams.get('id');
            const job = jobs.get(id);
            if (job === undefined) return send(res, 404, { error: 'job tidak ditemukan' });
            return send(res, 200, { job: publicJob(job) });
          }

          return send(res, 404, { error: 'endpoint tidak dikenal' });
        } catch (error) {
          return send(res, 500, { error: error?.message ?? String(error) });
        }
      },
    }),
  );
}
