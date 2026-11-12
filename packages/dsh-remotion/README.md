# @local/dsh-remotion

Remotion (https://www.remotion.dev) inside DeepSeek Harness: a **Remotion** view in the
conversation where you write a prompt, render it, and immediately watch the resulting
video, plus two agent tools so a session can produce video files on request.

Rendering happens in the DSH host process. Remotion bundles the React project with
webpack, drives a local Chrome/Edge (or downloads Chrome Headless Shell when none is
found), and encodes with the ffmpeg binary that ships in `@remotion/compositor-*`.
Nothing is uploaded.

**Looking ahead.** `REQUIREMENTS-V2.md` analyses the next generation of this plugin: a
declarative studio where a video project is a JSON file in the workspace and scenes use a
template library, so an agent can produce video without editing TSX. Nothing from v2 is
implemented yet; this package still renders v1 prompt clips.

## What it contributes

- **Remotion view** (`conversation.view`, id `remotion`): video preview of the newest
  render, a prompt editor with a Render button and live progress, composition metadata,
  the prompt the current video was rendered from, and the list of rendered files.
- **`remotion_render` tool**: renders a composition to mp4/webm/gif/png inside the
  session workspace (`<cwd>/remotion/`); `props.prompt` renders the prompt as kinetic
  type.
- **`remotion_compositions` tool**: lists available compositions and whether a local
  browser was detected.
- **UI API** under `/dsh-remotion`: `api/state`, `api/compositions`, `api/render`,
  `api/job`, and `media/*` with Range support.

## The bundled project

`remotion/` is a complete Remotion project:

- `remotion/index.tsx` — `registerRoot`
- `remotion/Root.tsx` — registers both compositions
- `remotion/PromptVideo.tsx` — the prompt composition: 1920×1080, 30 fps, 120 frames.
  The prompt is split into words that spring in one by one; the accent colours are
  derived from a hash of the prompt, so different prompts produce visibly different
  clips.
- `remotion/HelloWorld.tsx` — a static hello-world scene (90 frames) used by the
  `HelloWorld` composition.

Edit these files to change the video. The bundle is cached for the lifetime of the host
process, so a running host keeps serving the bundle it built first; composition edits are
picked up after a host restart until cache invalidation lands (see `REQUIREMENTS.md`, M1).
The package root is also the project root, so `react`, `remotion`, and the Remotion
tooling resolve from the package's own `node_modules`.

`media/prompt-sample.mp4` is the committed prompt sample used as the panel's default
preview; `media/hello-world.mp4` is the static sample. Both appear under Renders with a
"Bundled sample" tag.

## Usage

In the panel: edit the prompt, press **Render** (or Ctrl/⌘+Enter), and the clip plays as
soon as it finishes. The "Rendered from prompt" line above the editor shows which prompt
produced the video on screen.

Through the agent, or the tool directly:

```
remotion_render { "props": { "prompt": "Halo dari prompt!" } }
remotion_render { "format": "png", "frame": 42, "output": "poster.png" }
remotion_render { "composition_id": "HelloWorld", "format": "mp4" }
```

The first render of a host process bundles the project (roughly 10–20 s) and starts
Chrome; later renders reuse the bundle.

## Browser and binaries

The plugin looks for Chrome/Edge in the usual Windows, macOS, and Linux locations and
uses it as `browserExecutable`. Override the choice with the
`REMOTION_BROWSER_EXECUTABLE` environment variable. Without a detected browser, Remotion
downloads Chrome Headless Shell on first use.

Temporary bundling and pre-encode files are pinned to `.cache/tmp` inside the package
because the OS temp directory is sometimes not writable for the renderer's child
processes.

## Install

Install this directory as a bundle through Plugin Manager (`install_bundle` with the
absolute package directory). The patch inserts the `remotion` row; the Client module
registers the Remotion view.

The package's own `node_modules` holds Remotion and its tooling (about 470 MB installed).
The bundle is linked, so the host resolves those modules from this directory; a plain
`npm install` here is what populates them.

## Developer scripts

- `node scripts/render-sample.mjs` — re-render `media/hello-world.mp4` after editing the
  composition.
- `node scripts/smoke-client.mjs` — execute and server-render the Client half without a
  browser, to catch registration or first-render crashes.

Both need a shell that may spawn child processes (esbuild, Chrome), so run them outside
the DSH file sandbox when it blocks process creation.

## Licensing

Remotion is not MIT. It is free for individuals and companies of up to three people, and
requires a company license otherwise — see https://www.remotion.dev/pricing. This bundle
only wires the public packages; it ships no Remotion code of its own beyond the sample
composition.
