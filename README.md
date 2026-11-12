# dsh-plugins-collections

> A curated, source-first collection of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugins — kept as a reproducible workspace instead of a list of npm names.

<p>
  <img alt="DSH" src="https://img.shields.io/badge/DSH-0.2.1--rc.5-4B6BFB">
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white">
  <img alt="Platform" src="https://img.shields.io/badge/platform-web-8A2BE2">
  <img alt="Plugins" src="https://img.shields.io/badge/plugins-7-informational">
  <img alt="License" src="https://img.shields.io/badge/license-see%20per%20package-yellow">
</p>

---

## Table of contents

- [Why this repository exists](#why-this-repository-exists)
- [Plugin catalog](#plugin-catalog)
  - [UI & shell](#ui--shell)
  - [Agent tooling](#agent-tooling)
  - [Usage & cost](#usage--cost)
- [Repository layout](#repository-layout)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration model](#configuration-model)
- [Data & privacy](#data--privacy)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Adding a new plugin](#adding-a-new-plugin)
- [Contributing](#contributing)
- [License & attribution](#license--attribution)
- [Ringkasan (Bahasa Indonesia)](#ringkasan-bahasa-indonesia)

---

## Why this repository exists

DSH loads plugins into a **profile** — an ordered stack of patch layers under `~/.dsh/profiles/<name>`.
Local plugins are wired in with `link:` entries, and the profile's `package.json` records nothing but a
path. That has three consequences worth designing around:

1. **A path is not a backup.** If the plugin directory disappears, `link:` dangles; the profile still boots,
   but the plugin's `insert` entry silently fails to mount.
2. **Some plugins never appear in a manifest at all.** A plugin can live purely as an `insert` in
   `cordis.patch.yml` plus a hand-made symlink in `node_modules/`. `pnpm install` prunes it.
3. **Third-party plugins should not be vendored.** They belong in `dependencies` with a pinned range, so
   upstream fixes and security patches flow in normally.

This repository keeps the *sources* of the local plugins under version control, records the profile
configuration that activates them, and pins — rather than copies — what comes from npm.

## Plugin catalog

Seven plugins, six of them stored here as full source trees.

| Plugin | Version | Kind | Requires | Status |
| --- | --- | --- | --- | --- |
| [`dsh-bg-gradient`](packages/dsh-bg-gradient) | 0.1.0 | UI theme | — | active |
| [`usrsoda-gif`](packages/usrsoda-gif) | 1.2.0 | UI decoration | — | active |
| [`opencode-go-usage`](packages/opencode-go-usage) | 0.1.0 | Usage tracking | — | active |
| `dsh-peak-hours` | ^1.13.20 | Usage tracking | npm | active |
| [`dsh-situ-ticket`](packages/dsh-situ-ticket) | 0.2.5 | Agent tool + panel | Situ account | optional |
| [`dsh-remotion`](packages/dsh-remotion) | 1.0.0 | Agent tool + panel | npm deps, Chrome | optional |
| [`dsh-agent-orchestration`](packages/dsh-agent-orchestration) | 1.0.0 | UI view | — | optional |

`dsh-peak-hours` is deliberately **not** vendored: it is published on npm under MIT by
[@run666888](https://github.com/run666888/dsh-peak-hours) and is pinned by version range only.

### UI & shell

#### `dsh-bg-gradient`

Paints a fixed blue gradient behind the Web GUI shell and swaps the near-black primary accent for
DeepSeek blue, without touching surfaces that must stay opaque (code blocks, bubbles, dialogs, tooltips,
semantic colours).

- **Settings → Appearance → Background**: five preset chips (None, Aurora, Sky, Ice, Deep) plus a 0–100 %
  strength slider and Reset. Choices persist through the host endpoint.
- **Contrast-gated**: `test/logic.test.mjs` asserts every preset in both colour schemes keeps secondary text
  at or above 4.5:1 over the deepest stop. Current worst case is Aurora at 4.75:1.
- **Activated by patch only.** It is an `insert` entry, not a profile bundle — see
  [Configuration model](#configuration-model).

#### `usrsoda-gif`

Shows a small `@usrsoda` GIF beneath the composer that changes with agent state: `idle`, `working`,
`complete`. Ships `en`, `id`, and `zh` locales and an icon.

- `client.js` is a **build artifact**: `node scripts/build.mjs` inlines the clips from `media/` as base64
  using `src/client.template.js`. Edit the template, then rebuild.
- The bundled clips originate from a third-party X post; see [License & attribution](#license--attribution).

#### `dsh-agent-orchestration`

A live board inside the conversation that renders the delegation tree of subagents as they spawn, work,
and finish. Pure client-side; no host dependency beyond the client runtime.

### Agent tooling

#### `dsh-situ-ticket`

Read-only bridge to Telkom University's Service Desk (**Situ**), exposing one tool and one sidebar panel.

| `situ_ticket` action | Returns |
| --- | --- |
| `status` | Single ticket by number: state, subject, service, requester/assignee, dates, deadline, rating, your tasks on it, optional status history |
| `list` | Recent tickets for the account — active, closed, or both |
| `tasks` | Every task assigned to you across tickets, open-only by default, with deadlines and overdue flags |

The panel mirrors this over a same-origin API that never exposes credentials:

```
GET /situ-ticket/api/status
GET /situ-ticket/api/tasks?limit=25&includeDone=0
GET /situ-ticket/api/tickets?status=active|closed|any&limit=25
GET /situ-ticket/api/ticket?number=X&history=1
```

Only read endpoints are implemented — no ticket or task is ever created, updated, or closed.

Credentials are never passed through chat. Three sources are checked in order:

1. `credentialsFile` in the plugin config,
2. `SITU_CREDENTIALS_FILE`,
3. `~/.dsh/situ-credentials.json` — `{ "username": "...", "password": "..." }`.

#### `dsh-remotion`

Remotion inside DSH: a **Remotion** view in the conversation plus two agent tools.

- `remotion_render` — render a composition to `mp4`, `webm`, `gif`, or `png` inside the session workspace
  (`<cwd>/remotion/`); `props.prompt` renders the prompt as kinetic type.
- `remotion_compositions` — list compositions and report whether a local browser was detected.
- UI API under `/dsh-remotion`: `api/state`, `api/compositions`, `api/render`, `api/job`, `media/*` with
  HTTP Range support.

Rendering happens in the host process: webpack bundles the React project, a local Chrome/Edge (or a
downloaded headless shell) is driven, and ffmpeg from `@remotion/compositor-*` encodes the result. Nothing
is uploaded. The first render in a host process costs roughly 10–20 s; later renders reuse the bundle.

### Usage & cost

#### `opencode-go-usage`

Records per-model token usage from DSH LLM streams and reports it against OpenCode Go's plan windows
(rolling 5 h, weekly, monthly) using the published per-million-token prices and monthly USD allowances.

- Reads `~/.dsh/sessions` and `~/.local/share/opencode/opencode.db`.
- Writes `~/.dsh/opencode-go-usage.json`.
- Exposes `GET /api/opencode-go-usage` for the UI.
- **Known limitation**: recorded events currently carry `tokens: 0` — the usage hook is not yet capturing
  the counts. The UI therefore under-reports.

#### `dsh-peak-hours` (npm)

Sidebar badge marking the current DeepSeek peak-pricing window, with a 24-hour schedule bar, a countdown,
and a settings card that splits logged usage into peak / off-peak tokens and compares actual cost against
all-peak and all-off-peak baselines.

## Repository layout

```
.
├─ packages/
│  ├─ dsh-agent-orchestration/   # @local/dsh-agent-orchestration
│  ├─ dsh-bg-gradient/           # @local/dsh-bg-gradient
│  ├─ dsh-remotion/              # @local/dsh-remotion
│  ├─ dsh-situ-ticket/           # dsh-situ-ticket
│  ├─ opencode-go-usage/         # @local/opencode-go-usage
│  └─ usrsoda-gif/               # @local/usrsoda-gif
├─ profile/
│  ├─ package.json               # profile dependencies + bundle list (relative link:)
│  └─ cordis.patch.yml           # patch layer: inserts dsh-bg-gradient
├─ AGENTS.md                     # instructions for AI coding agents
├─ .gitattributes                # LF normalisation, binary markers
└─ .gitignore
```

Each `packages/*` directory is a complete, self-contained DSH plugin: `package.json` with a `dsh` block,
a host entry (`index.js`), a client entry (`client.js`), a `cordis.patch.yml`, and optional `lib/`,
`locale/`, `test/`, and assets.

## Requirements

| Component | Version |
| --- | --- |
| DSH | `0.2.1-rc.5` (tested) |
| Node.js | ≥ 20 (`dsh-remotion`); ≥ 18 for the rest |
| pnpm | 12.x (used by `dsh plugin`) |
| Platform | DSH Web GUI (`dsh.client.platform: "web"`) |
| Optional | Chrome/Edge for `dsh-remotion` |

All plugins are host-side ESM with **no bundled runtime dependencies**, except `dsh-remotion`, which
declares Remotion, React, and React DOM.

## Installation

### 1. Clone

```bash
git clone https://github.com/yogiex/dsh-plugins-collections.git
cd dsh-plugins-collections
```

### 2. Register the plugins in a profile

A profile lives at `~/.dsh/profiles/<name>`; `~/.dsh/profiles/web` is the Web profile. Compare this
repository's [`profile/package.json`](profile/package.json) with yours, then add `link:` entries whose
paths are **relative to the profile directory**:

```json
{
  "dependencies": {
    "@local/usrsoda-gif": "link:../../../dsh-playground/dsh-plugins-collections/packages/usrsoda-gif",
    "@local/opencode-go-usage": "link:../../../dsh-playground/dsh-plugins-collections/packages/opencode-go-usage",
    "@local/dsh-bg-gradient": "link:../../../dsh-playground/dsh-plugins-collections/packages/dsh-bg-gradient",
    "dsh-peak-hours": "^1.13.20"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-peak-hours",
        "@local/usrsoda-gif",
        "@local/opencode-go-usage"
      ]
    }
  }
}
```

Then add the `insert` entry from [`profile/cordis.patch.yml`](profile/cordis.patch.yml) to the profile's own
`cordis.patch.yml`.

> **Do not** list `@local/dsh-bg-gradient` in `dsh.profile.bundles`. Its bundle patch already inserts it,
> and the loader does not de-duplicate `id`s — registering it twice mounts it twice.

### 3. Install dependencies

```bash
dsh plugin --profile web install
# if the lockfile is out of date:
dsh plugin --profile web install --no-frozen-lockfile
```

For `dsh-remotion`, install its npm dependencies once:

```bash
cd packages/dsh-remotion && npm install   # ~470 MB
```

### 4. Verify

`--dump-config` composes patches but does **not** import modules, so it cannot prove a plugin resolves.
Use a real resolution check instead:

```bash
cd ~/.dsh/profiles/web
readlink -f node_modules/@local/*
node -e "const{createRequire}=require('module');const r=createRequire(process.cwd()+'/package.json');for (const p of ['@local/usrsoda-gif','@local/opencode-go-usage','@local/dsh-bg-gradient']) console.log(p, r.resolve(p))"
```

### 5. Restart

```bash
dsh web
```

Then reload the Web GUI (Ctrl+R). A plugin that mounts after the host started will not appear until the
page is reloaded — and one whose directory moved needs a host restart.

## Configuration model

DSH composes a profile from four layers, in order:

```
dsh.profile.bundles  →  each bundle's dsh.bundle.patch  →  profile cordis.patch.yml  →  --patch overlays
```

Two field groups drive a plugin:

```jsonc
{
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },   // patch layer loaded when this package is a bundle
    "client": {
      "platform": "web",                            // only "web" is consumed today
      "immediately": true,                          // activate eagerly at boot
      "inject": ["@deepseek-ai/dsh-client-runtime"] // client-module load ordering
    }
  }
}
```

Resolution details that matter in practice:

- `insert.name` that is a bare package name is imported by the loader with the **profile directory** as
  base URL, so it resolves through `<profile>/node_modules`.
- A missing package fails only that entry: the loader logs an error, skips the row, and boot continues.
  There is no fatal error and no retry.
- `link:` is resolved relative to the profile directory by DSH and by pnpm. Absolute paths survive a
  repository move; relative paths survive a `~/.dsh` move. This repository chooses relative, because the
  repository is the thing that moves.

## Data & privacy

Nothing here sends data to a third party. What is written locally:

| File | Written by | Content |
| --- | --- | --- |
| `~/.dsh/opencode-go-usage.json` | `opencode-go-usage` | Per-request token/cost events |
| `~/.dsh/dsh-bg-gradient.json` | `dsh-bg-gradient` | Selected preset and strength |
| `~/.dsh/situ-credentials.json` | you | Situ SSO username/password (never read by the agent) |
| `<cwd>/remotion/` | `dsh-remotion` | Rendered media inside the session workspace |

What is read: `~/.dsh/sessions` (usage plugin), `~/.local/share/opencode/opencode.db` (usage plugin), and
the Situ HTTP API (ticket plugin, read-only endpoints).

None of the files above are tracked by git; they are covered by `.gitignore`.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Plugin missing after `pnpm install` | Installed only as an `insert` + hand-made symlink | Add it to `dependencies`, then reinstall |
| `Cannot find module '@local/...'` | `link:` target moved or was pruned | Fix the entry, run `dsh plugin --profile <p> install` |
| `ERR_PNPM_OUTDATED_LOCKFILE` | Frozen lockfile against an edited `package.json` | Add `--no-frozen-lockfile` |
| `cannot resolve profile bundle "..."` | Name not in `dependencies` or not installed | Check `readlink -f node_modules/<name>` |
| Plugin mounted twice in the UI | Present in both `bundles` and `cordis.patch.yml` | Keep it in exactly one layer |
| UI unchanged after an edit | Client module cached; host bundle stale | Reload the page; restart `dsh web` after a directory move |
| `--dump-config` fails with `EACCES` | The command rewrites the profile's `cordis.yml` | Run it in a writable session, not a read-only sandbox |
| Remotion render hangs on first run | Downloading Chrome Headless Shell | Wait, or set `REMOTION_BROWSER_EXECUTABLE` |

## Development

```bash
# contrast + token-layer test for the gradient (writes test/applied.json)
cd packages/dsh-bg-gradient && node --test test/logic.test.mjs

# Situ tool/route smoke test (no network)
cd packages/dsh-situ-ticket && node test/smoke.mjs

# rebuild the usrsoda client from src/ + media/
cd packages/usrsoda-gif && node scripts/build.mjs

# client-module smoke check for Remotion
cd packages/dsh-remotion && npm install && node scripts/smoke-client.mjs
```

All plugins are plain ESM — no TypeScript build step, no bundler beyond the two generated `client.js`
files (`usrsoda-gif`, and the Remotion bundle produced at runtime).

## Adding a new plugin

1. Create `packages/<slug>/` with `package.json`, `index.js`, `client.js`, `cordis.patch.yml`.
2. Name it `@local/<slug>` unless it is meant for npm, and set `"private": true` while it lives here.
3. Declare the `dsh` block: `bundle.patch`, and `client.platform` / `immediately` / `inject`.
4. Register it in the profile **once** — either `dependencies` + `bundles`, or `dependencies` + an
   `insert` in the patch layer, never both.
5. Add the plugin to the catalog table in `README.md` and to `AGENTS.md` if it changes the workflow.
6. Verify resolution with `require.resolve` before committing.

## Contributing

Issues and pull requests are welcome. Please keep them small and scoped to one plugin, and include the
commands you used to verify the change. Before opening a PR:

- No `node_modules/`, credentials, usage data, or generated render output.
- No absolute paths in manifests or docs.
- No third-party media without explicit licensing.

## License & attribution

Licensing is **per package**, not per repository:

| Package | License |
| --- | --- |
| `dsh-situ-ticket` | MIT |
| `dsh-remotion` | MIT for this plugin's code; **Remotion itself is not MIT** — free for individuals and companies of ≤3 people, commercial licence required above that ([pricing](https://www.remotion.dev/pricing)) |
| `dsh-peak-hours` | MIT, © [run666888](https://github.com/run666888/dsh-peak-hours) |
| `dsh-bg-gradient`, `opencode-go-usage`, `dsh-agent-orchestration` | unpublished local code |
| `usrsoda-gif` media | © [@usrsoda](https://x.com/usrsoda) — included for personal use, **not** licensed for redistribution |

`usrsoda-gif/client.js` embeds the source clips as base64, so removing `media/` alone does not remove the
third-party assets from the bundle. Replace them with your own artwork and rebuild before redistributing.

## Acknowledgements

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — the plugin host and client runtime.
- [Remotion](https://www.remotion.dev) — programmatic video for `dsh-remotion`.
- [@run666888/dsh-peak-hours](https://github.com/run666888/dsh-peak-hours) — peak/off-peak pricing badge.
- [@usrsoda](https://x.com/usrsoda) — the state GIF artwork.

## Ringkasan (Bahasa Indonesia)

Repo ini menyimpan **sumber lengkap** plugin DSH yang dipakai di satu perangkat, bukan sekadar daftar nama
paket. Enam plugin ada di `packages/`, satu (`dsh-peak-hours`) dipin dari npm. Konfigurasi profil `web`
yang mengaktifkannya ada di `profile/`.

Dua hal yang paling sering bikin gagal saat memasang ulang:

1. `dsh-bg-gradient` **tidak boleh** dimasukkan ke `dsh.profile.bundles` — cukup lewat entri `insert`,
   karena loader tidak melakukan dedupe dan plugin akan ter-mount dua kali.
2. `dsh --dump-config` tidak membuktikan plugin ter-resolve; pakai `require.resolve` seperti di bagian
   [Installation](#installation).

Panduan untuk agen AI ada di [`AGENTS.md`](AGENTS.md).
