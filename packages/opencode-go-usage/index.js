import { mkdir, readFile, writeFile, rename, readdir, stat } from "node:fs/promises";
import { zstdDecompressSync } from "node:zlib";
import path from "node:path";
import os from "node:os";

const name = "opencode-go-usage";
const inject = ["commands", "webServer"];

/**
 * OpenCode Go prices per 1M tokens and the plan's monthly USD allowance, from
 * https://opencode.ai/docs/console/go#usage-limits (Go column).
 */
const MODEL_PRICES = {
  "deepseek-v4.1-flash": { input: 0.15, output: 0.6, cacheRead: 0.003, monthly: 100, peak: true },
  "deepseek-v4-pro": { input: 0.66, output: 1.98, cacheRead: 0.022, monthly: 15, peak: true },
  "glm-5.3": { input: 1.4, output: 4.4, cacheRead: 0.26, monthly: 15 },
  "glm-5.3-flash": { input: 0.15, output: 0.5, cacheRead: 0.03, monthly: 60 },
  "glm-5.2": { input: 1.4, output: 4.4, cacheRead: 0.26, monthly: 60 },
  "kimi-k3": { input: 3, output: 15, cacheRead: 0.3, monthly: 15 },
  "kimi-k3.1-pro": { input: 2, output: 10, cacheRead: 0.2, monthly: 15 },
  "kimi-k2.7-code": { input: 0.95, output: 4, cacheRead: 0.19, monthly: 60 },
  "qwen3.8-max": { input: 2, output: 6, cacheRead: 0.25, monthly: 15 },
  "qwen3.8-flash": { input: 0.15, output: 0.47, cacheRead: 0.016, monthly: 30 },
  "qwen3.7-plus": { input: 0.4, output: 1.6, cacheRead: 0.04, monthly: 60 },
  "minimax-m3": { input: 0.3, output: 1.2, cacheRead: 0.06, monthly: 60 },
  "minimax-m3.1-flash": { input: 0.15, output: 0.6, cacheRead: 0.015, monthly: 20 },
  "longcat-2.0": { input: 0.3, output: 1.2, cacheRead: 0.006, monthly: 60 },
  "step-5-preview": { input: 1, output: 2.7, cacheRead: 0.1, monthly: 15 },
  "mimo-v2.6-flash": { input: 0.14, output: 0.28, cacheRead: 0.0028, monthly: 60 },
  "mimo-v2.6-pro": { input: 0.435, output: 0.87, cacheRead: 0.003625, monthly: 15 },
  "mimo-v2.5": { input: 0.14, output: 0.28, cacheRead: 0.0028, monthly: 60 },
  "mimo-v2.5-pro": { input: 0.435, output: 0.87, cacheRead: 0.003625, monthly: 15 },
  "hy3": { input: 0.14, output: 0.58, cacheRead: 0.035, monthly: 60 },
  "hy4": { input: 0.834, output: 2.501, cacheRead: 0.042, monthly: 60 },
  "hy4-preview": { input: 0.834, output: 2.501, cacheRead: 0.042, monthly: 30 },
  "grok-4.7": { input: 2, output: 6, cacheRead: 0.5, monthly: 15 },
  "gpt-6-luna": { input: 0.1, output: 0.5, cacheRead: 0.01, monthly: 15 },
  "gpt-5.6-luna": { input: 0.2, output: 1.2, cacheRead: 0.02, monthly: 15 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, monthly: 15 },
  "gemini-4-argon": { input: 2, output: 10, cacheRead: 0.1, monthly: 30 },
  "muse-spark-1.3-contributor": { input: 0.1, output: 0.2, cacheRead: 0.002, monthly: 60 },
  "muse-spark-1.2-contributor": { input: 0.1, output: 0.2, cacheRead: 0.002, monthly: 60 },
  "beam-free": { input: 0, output: 0, cacheRead: 0, monthly: Infinity },
  "iceman-contributor-free": { input: 0, output: 0, cacheRead: 0, monthly: Infinity },
  "longcat-2.5-free": { input: 0, output: 0, cacheRead: 0, monthly: Infinity },
  "step-5-preview-free": { input: 0, output: 0, cacheRead: 0, monthly: Infinity },
  "longcat-2.5-preview-free": { input: 0, output: 0, cacheRead: 0, monthly: Infinity },
};

const MODEL_NAMES = {
  "deepseek-v4.1-flash": "DeepSeek V4.1 Flash",
  "deepseek-v4-pro": "DeepSeek V4 Pro",
  "beam-free": "Beam",
  "longcat-2.5-free": "LongCat 2.5",
  "longcat-2.5-preview-free": "LongCat 2.5 Preview",
  "longcat-2.0": "LongCat 2.0",
  "step-5-preview": "Step 5 Preview",
  "step-5-preview-free": "Step 5 Preview",
  "glm-5.3": "GLM 5.3",
  "glm-5.3-flash": "GLM 5.3 Flash",
  "glm-5.2": "GLM 5.2",
  "kimi-k3": "Kimi K3",
  "kimi-k3.1-pro": "Kimi K3.1 Pro",
  "kimi-k2.7-code": "Kimi K2.7 Code",
  "qwen3.8-max": "Qwen3.8 Max",
  "qwen3.8-flash": "Qwen3.8 Flash",
  "qwen3.7-plus": "Qwen3.7 Plus",
  "minimax-m3": "MiniMax M3",
  "minimax-m3.1-flash": "MiniMax M3.1 Flash",
};

const PLAN_MULTIPLIER = { go: 1, "go-plus": 4, "go-teams": 2 };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** A request counts 20% of the monthly allowance per 5h, 50% per week, 100% per month. */
const WINDOWS = [
  { key: "rolling", label: "Rolling", ms: 5 * HOUR, share: 0.2 },
  { key: "weekly", label: "Weekly", ms: 7 * DAY, share: 0.5 },
  { key: "monthly", label: "Monthly", ms: 30 * DAY, share: 1 },
];

const PERIOD_MS = WINDOWS[2].ms;
const SCAN_TTL_MS = 120_000;

let scanCache = { at: 0, events: [], sources: { sessions: 0, opencode: 0, live: 0 }, error: null };

function home() {
  return os.homedir();
}

function storagePath() {
  return path.join(home(), ".dsh", "opencode-go-usage.json");
}

function sessionsRoot() {
  return path.join(home(), ".dsh", "sessions");
}

function opencodeDbPath() {
  return path.join(home(), ".local", "share", "opencode", "opencode.db");
}

async function loadLiveEvents() {
  try {
    const parsed = JSON.parse(await readFile(storagePath(), "utf8"));
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

async function saveLiveState(events) {
  await mkdir(path.dirname(storagePath()), { recursive: true });
  const tmp = `${storagePath()}.tmp`;
  await writeFile(tmp, JSON.stringify({ version: 2, events }, null, 2), "utf8");
  await rename(tmp, storagePath());
}

async function recordEvent(model, tokens) {
  const events = await loadLiveEvents();
  events.push({ ts: new Date().toISOString(), model: String(model), tokens, live: true });
  if (events.length > 5000) events.splice(0, events.length - 5000);
  await saveLiveState(events);
}

/** Peak hours double DeepSeek prices: 01:00-04:00 and 06:00-10:00 UTC, Mon-Fri. */
function isPeak(ts) {
  const date = new Date(ts);
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  const hour = date.getUTCHours();
  return (hour >= 1 && hour < 4) || (hour >= 6 && hour < 10);
}

function costOf(model, tokens, ts) {
  const price = MODEL_PRICES[model];
  if (price === undefined) return 0;
  const input = Number(tokens.inputTokens) || 0;
  const output = Number(tokens.outputTokens) || 0;
  const cacheRead = Number(tokens.cacheReadTokens) || 0;
  const factor = price.peak === true && isPeak(ts) ? 2 : 1;
  return ((input * price.input + output * price.output + cacheRead * price.cacheRead) / 1_000_000) * factor;
}

function totalTokensOf(tokens) {
  const input = Number(tokens.inputTokens) || 0;
  const output = Number(tokens.outputTokens) || 0;
  const cacheRead = Number(tokens.cacheReadTokens) || 0;
  const total = Number(tokens.totalTokens) || 0;
  return total > 0 ? total : input + output + cacheRead;
}

/** Harvest per-request usage from DSH session logs, which record every model call. */
async function scanSessionFile(file, cutoff) {
  const compressed = await readFile(file);
  const text = zstdDecompressSync(compressed).toString("utf8");
  const events = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith('{"type":"assistant/message"')) continue;
    const at = line.indexOf('"provider":"opencode-go"');
    if (at === -1) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    const data = record.data;
    const usage = data?.usage;
    const source = data?.message?.source;
    if (usage === undefined || source?.provider !== "opencode-go") continue;
    const ts = Number(record.time) || 0;
    if (ts < cutoff) continue;
    events.push({
      ts: new Date(ts).toISOString(),
      model: source.model,
      tokens: totalTokensOf(usage),
      allowance: costOf(source.model, usage, ts),
      source: "session",
    });
  }
  return events;
}

async function listSessionFiles(root) {
  const files = [];
  let dirs;
  try {
    dirs = await readdir(root, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const sub = path.join(root, dir.name);
    let entries;
    try {
      entries = await readdir(sub, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".jsonl.zstd")) files.push(path.join(sub, entry.name));
      else if (entry.isDirectory()) {
        const nested = path.join(sub, entry.name, "session.v4.jsonl.zstd");
        try {
          await stat(nested);
          files.push(nested);
        } catch {}
      }
    }
  }
  return files;
}

async function scanSessions(cutoff) {
  const events = [];
  const files = await listSessionFiles(sessionsRoot());
  for (const file of files) {
    try {
      events.push(...(await scanSessionFile(file, cutoff)));
    } catch {}
  }
  return events;
}

/** Fold the OpenCode CLI database history in, when it holds anything usable. */
async function scanOpencodeDb(cutoff) {
  try {
    await stat(opencodeDbPath());
  } catch {
    return [];
  }
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(opencodeDbPath(), { readOnly: true });
    try {
      const rows = db
        .prepare(
          `SELECT time_created AS ts,
                  json_extract(data, '$.modelID') AS model,
                  json_extract(data, '$.cost') AS cost,
                  json_extract(data, '$.tokens.total') AS tokens
             FROM message
            WHERE time_created > ?
              AND json_extract(data, '$.role') = 'assistant'
              AND json_extract(data, '$.providerID') = 'opencode-go'
            LIMIT 20000`,
        )
        .all(cutoff);
      return rows
        .filter((row) => typeof row.model === "string" && row.model.length > 0)
        .map((row) => ({
          ts: new Date(Number(row.ts)).toISOString(),
          model: row.model,
          tokens: Number(row.tokens) || 0,
          allowance: Number(row.cost) || 0,
          source: "opencode",
        }));
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

async function collectEvents() {
  const now = Date.now();
  if (now - scanCache.at < SCAN_TTL_MS) return scanCache;
  const cutoff = now - PERIOD_MS;
  const sessions = await scanSessions(cutoff);
  const opencode = sessions.length > 0 ? [] : await scanOpencodeDb(cutoff);
  const live = sessions.length > 0 ? [] : await loadLiveEvents();
  scanCache = {
    at: now,
    events: [...sessions, ...opencode, ...live],
    sources: { sessions: sessions.length, opencode: opencode.length, live: live.length },
    error: null,
  };
  return scanCache;
}

const isUnlimited = (model) => (MODEL_PRICES[model]?.monthly ?? Infinity) === Infinity;

function monthlyLimit(model, plan) {
  const base = MODEL_PRICES[model]?.monthly ?? Infinity;
  return Number.isFinite(base) ? base * (PLAN_MULTIPLIER[plan] ?? 1) : Infinity;
}

function displayName(model) {
  return MODEL_NAMES[model] ?? model;
}

function resetInMs(events, windowMs, now) {
  const cutoff = now - windowMs;
  let oldest = Infinity;
  for (const event of events) {
    const ts = Date.parse(event.ts);
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    if (ts < oldest) oldest = ts;
  }
  return oldest === Infinity ? null : Math.max(0, oldest + windowMs - now);
}

function sumInWindow(events, model, windowMs, now, pick) {
  const cutoff = now - windowMs;
  let total = 0;
  for (const event of events) {
    if (event.model !== model) continue;
    const ts = Date.parse(event.ts);
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    total += pick(event);
  }
  return total;
}

function summarize(events, plan, sources) {
  const now = Date.now();
  const models = [...new Set(events.map((event) => event.model))];
  const paid = models.filter((model) => !isUnlimited(model));

  const limits = WINDOWS.map((window) => {
    let worst = 0;
    let driver = null;
    for (const model of paid) {
      const limit = monthlyLimit(model, plan) * window.share;
      if (!(limit > 0)) continue;
      const used = sumInWindow(events, model, window.ms, now, (event) => Number(event.allowance) || 0);
      const ratio = used / limit;
      if (ratio > worst) {
        worst = ratio;
        driver = { model, used, limit };
      }
    }
    return {
      key: window.key,
      label: window.label,
      windowMs: window.ms,
      percentage: Math.min(100, worst * 100),
      resetInMs: resetInMs(events, window.ms, now),
      driver:
        driver === null
          ? null
          : { model: driver.model, name: displayName(driver.model), used: driver.used, limit: driver.limit },
    };
  });

  const perModel = models.map((model) => {
    const tokens = sumInWindow(events, model, PERIOD_MS, now, (event) => Number(event.tokens) || 0);
    const allowance = sumInWindow(events, model, PERIOD_MS, now, (event) => Number(event.allowance) || 0);
    const requests = events.filter((event) => event.model === model).length;
    return { model, name: displayName(model), tokens, allowance, requests, unlimited: isUnlimited(model) };
  });
  const totalTokens = perModel.reduce((acc, entry) => acc + entry.tokens, 0) || 1;
  const totalCost = perModel.reduce((acc, entry) => acc + entry.allowance, 0);
  const totalRequests = perModel.reduce((acc, entry) => acc + entry.requests, 0);

  return {
    plan,
    generatedAt: new Date(now).toISOString(),
    sources,
    requests: totalRequests,
    tokens: totalTokens,
    cost: totalCost,
    limits,
    models: perModel
      .map((entry) => ({ ...entry, share: (entry.tokens / totalTokens) * 100 }))
      .sort((left, right) => right.tokens - left.tokens),
  };
}

function formatResets(ms) {
  if (ms === null || !Number.isFinite(ms)) return "no usage recorded";
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(totalMinutes % 60).padStart(2, "0")}m`;
  return `${totalMinutes}m`;
}

function bar(percentage) {
  const pct = Math.max(0, Math.min(100, percentage));
  const filled = Math.round(pct / 5);
  return "█".repeat(filled) + "░".repeat(20 - filled);
}

function renderReport(summary) {
  const lines = ["# OpenCode Go usage (local estimate)", ""];
  lines.push(
    `Plan **${summary.plan}** · ${summary.requests} requests · ${(summary.tokens / 1_000_000).toFixed(1)}M tokens · ~$${summary.cost.toFixed(2)}`,
  );
  lines.push("");
  lines.push("## Limits");
  for (const limit of summary.limits) {
    lines.push(`- **${limit.label}** — ${limit.percentage.toFixed(0)}% used · resets in ${formatResets(limit.resetInMs)}`);
    lines.push(`  \`${bar(limit.percentage)}\``);
    if (limit.driver) {
      lines.push(`  _${limit.driver.name}: $${limit.driver.used.toFixed(4)} of $${limit.driver.limit.toFixed(2)}_`);
    }
  }
  lines.push("");
  lines.push("## Models");
  if (summary.models.length === 0) lines.push("_No usage captured yet._");
  for (const model of summary.models) {
    const share = model.share > 0 && model.share < 1 ? "<1%" : `${Math.round(model.share)}%`;
    lines.push(`- **${model.name}**${model.unlimited ? " (unlimited)" : ""} — ${share} · ${model.requests} req`);
  }
  lines.push("");
  lines.push("> Estimate from DSH session logs on this machine. The OpenCode Console stays authoritative.");
  return lines.join("\n");
}

function installFetchCapture(logger) {
  if (globalThis.__opencodeGoUsageFetchPatched) return;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function capturedFetch(...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url ?? "";
      if (url.includes("opencode.ai/inference/")) {
        response
          .clone()
          .text()
          .then((text) => {
            const payloads = text.includes("data:")
              ? text
                  .split(/\r?\n/u)
                  .map((line) => line.trim())
                  .filter((line) => line.startsWith("data:"))
                  .map((line) => line.slice(5).trim())
              : [text];
            for (const payload of payloads) {
              if (payload.length === 0 || payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                const usage = json?.usage;
                const model = json?.model;
                if (typeof model === "string" && usage?.opencode !== undefined) {
                  recordEvent(model, totalTokensOf(usage)).catch(() => {});
                }
              } catch {}
            }
          })
          .catch((error) => logger?.warn?.(`opencode-go-usage: capture failed: ${String(error)}`));
      }
    } catch (error) {
      logger?.warn?.(`opencode-go-usage: fetch wrapper failed: ${String(error)}`);
    }
    return response;
  };
  globalThis.__opencodeGoUsageFetchPatched = true;
}

async function report(config) {
  const plan = config?.plan ?? "go";
  const scan = await collectEvents();
  return summarize(scan.events, plan, scan.sources);
}

export function apply(ctx, config) {
  installFetchCapture(ctx.logger);

  ctx.effect(function* () {
    yield ctx.commands.register({
      definitionId: "opencode-go-usage",
      name: "opencode-go-usage",
      description: "Show locally estimated OpenCode Go usage",
      handler: async (invocation) => {
        if ((invocation?.rawInput ?? "").trim() === "reset") {
          await saveLiveState([]);
          scanCache = { at: 0, events: [], sources: scanCache.sources, error: null };
          return { kind: "success", text: "Local capture cache cleared; session logs are re-scanned on the next request." };
        }
        return { kind: "success", text: renderReport(await report(config)) };
      },
    });
    yield ctx.webServer.register({
      kind: "exact",
      path: "/api/opencode-go-usage",
      handler: async (_req, res) => {
        try {
          const summary = await report(config);
          res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
          res.end(JSON.stringify(summary));
        } catch (error) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(error?.message ?? error) }));
        }
      },
    });
  }, "opencode-go-usage lifecycle");
}

export { inject, name };
