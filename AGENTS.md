# AGENTS.md

Instructions for AI coding agents working in this repository. Read this before touching anything; it
records constraints that are easy to violate and expensive to discover.

## What this repository is

A source-of-truth collection of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH)
plugins. Each `packages/*` directory is a complete, working plugin — not a template and not a fork. The
`profile/` directory is a reference snapshot of the DSH profile that activates them.

The repository is a **backup and distribution artifact**. Its primary job is that `git clone` plus the
steps in `README.md` reproduce a working DSH installation. Optimize for that.

## Repository map

| Path | Contents | Safe to edit |
| --- | --- | --- |
| `packages/*/index.js` | Host half of a plugin | Yes |
| `packages/*/client.js` | Client half — **generated** for `usrsoda-gif`, hand-written elsewhere | Careful, see below |
| `packages/*/lib/` | Host-side helpers (`situ-ticket`, `remotion`) | Yes |
| `packages/*/cordis.patch.yml` | The plugin's own patch layer | Yes |
| `packages/*/package.json` | Manifest, including the `dsh` block | Yes, keep the `dsh` block intact |
| `packages/*/locale/*.json` | UI strings (`en`, `id`, `zh`) | Yes, keep all existing keys |
| `packages/usrsoda-gif/src/`, `scripts/` | Source for the generated client | Yes, then rebuild |
| `packages/*/test/`, `scripts/` | Smoke tests and dev scripts | Yes |
| `packages/dsh-remotion/remotion/` | Remotion compositions (TSX) | Yes |
| `docs/assets/` | Downscaled GIF previews used by `README.md` | Regenerate with the `ffmpeg` command in the README, never hand-edit |
| `profile/` | Reference profile config | Yes, keep paths relative |
| `README.md` | User-facing documentation | Yes, keep the catalog table current |

## Hard rules

1. **Never commit secrets or personal state.** No `~/.dsh/.credentials.yaml`, `situ-credentials.json`,
   `opencode-go-usage.json`, `dsh-bg-gradient.json`, session logs, or anything under `node_modules/`.
   `.gitignore` covers these — do not weaken it.
2. **Never commit absolute paths.** Profile `link:` values must stay relative to the profile directory
   (`link:../../../…/packages/<slug>`). Windows paths may appear only as `<ANDA>` placeholders in docs.
3. **Register a plugin exactly once.** A plugin is activated either through `dsh.profile.bundles` +
   its own `dsh.bundle.patch`, or through an `insert` entry in the profile patch layer. Never both — the
   loader does not de-duplicate `id`s, so a double registration mounts the plugin twice.
4. **`@local/dsh-bg-gradient` stays out of `bundles`.** It is an `insert`-only plugin. This is the single
   most common way to break the profile.
5. **Do not vendor npm plugins.** `dsh-peak-hours` is pinned by range in `profile/package.json`; copying
   its source here would fork it and block upstream updates.
6. **Do not redistribute third-party media.** `packages/usrsoda-gif/media/*` belongs to
   [@usrsoda](https://x.com/usrsoda) and is embedded as base64 inside `client.js`. Replacing `media/`
   without rebuilding leaves the original assets in the bundle.
7. **Do not add a licence to a package that does not have one.** Licensing is per package and documented
   in `README.md`; `dsh-remotion` depends on Remotion, which is not MIT.

## The plugin contract

Every plugin is an ESM package with a `dsh` block in `package.json`:

```jsonc
{
  "type": "module",
  "exports": { ".": "./index.js", "./client": "./client.js" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": ["@deepseek-ai/dsh-client-runtime"]
    }
  }
}
```

- `index.js` exports `apply(ctx)` (host side). It may also export `name`, `inject`, and tool/route
  registrations. Host dependencies are Node built-ins plus the DSH context only.
- `client.js` is loaded by the DSH client module loader. It is not a standalone bundle: `react` and the
  `@deepseek-ai/dsh-client-*` packages come from the host, so never add them as real dependencies.
- `dsh.client.platform` accepts only `"web"` today. `inject` controls client-module load order, not
  host-side dependency injection.
- `exports["./client"]` must exist for any package that declares `dsh.client`, otherwise the host throws.

## Working on a plugin

```bash
# gradient: contrast + token-layer assertions (writes test/applied.json, git-ignored)
node --test packages/dsh-bg-gradient/test/logic.test.mjs

# Situ: tool registration + route shape, no network
node packages/dsh-situ-ticket/test/smoke.mjs

# usrsoda: regenerate client.js after editing src/ or media/
node packages/usrsoda-gif/scripts/build.mjs

# Remotion: needs its own npm deps first
cd packages/dsh-remotion && npm install && node scripts/smoke-client.mjs
```

For `usrsoda-gif`, `client.js` is generated — edit `src/client.template.js`, rebuild, and commit both the
template and the regenerated client.

## Verifying a profile change

`dsh --profile <name> --dump-config` composes patch layers but does **not** import modules, so it cannot
prove that a plugin resolves. It also rewrites the profile's `cordis.yml`, which fails in a read-only
sandbox. Use real resolution instead:

```bash
cd ~/.dsh/profiles/web
readlink -f node_modules/@local/*
node -e "const{createRequire}=require('module');const r=createRequire(process.cwd()+'/package.json');console.log(r.resolve('@local/dsh-bg-gradient'))"
```

A missing plugin fails silently at boot: the loader logs an error for that entry and continues. Assume
nothing works until resolution is checked.

## Before committing

```bash
git status --short
git grep -nE "sk-[A-Za-z0-9]{10,}|ghp_|xox[bp]-" -- . ':!AGENTS.md'   # secrets
git grep -n "/home/\|C:\\\\Users\\\\[A-Za-z]" -- . ':!AGENTS.md'      # absolute paths
git diff --cached --stat                                         # no node_modules, no binaries
```

Update `README.md` when a plugin is added, renamed, or its status changes; the catalog table is the
repository's index.

## Commit conventions

Conventional Commits, imperative mood, one logical change per commit:

```
feat(<plugin>): add peak-window badge to the sidebar
fix(opencode-go-usage): capture token counts from stream usage events
docs: document the insert-only activation of dsh-bg-gradient
chore(profile): pin dsh-peak-hours to ^1.13.20
```

Scopes: a package slug, `profile`, or `docs`. Keep the subject line under 72 characters and put rationale
in the body when the change is not self-evident.

## Known traps

| Trap | Reality |
| --- | --- |
| "`dump-config` passed, so it works" | It never imports the plugin. Use `require.resolve`. |
| "I removed `media/`, so the copyrighted assets are gone" | `usrsoda-gif/client.js` embeds them as base64. Rebuild. |
| "Adding it to `bundles` is harmless" | It duplicates the `insert`; the plugin mounts twice. |
| "`pnpm install` keeps my hand-made symlink" | It prunes anything not in `dependencies`. |
| "Relative `link:` breaks when the repo moves" | It breaks when `~/.dsh` moves; absolute breaks when the repo moves. This repo chooses relative. |
| "Hot reload covers a directory move" | It does not. Restart `dsh web`. |
