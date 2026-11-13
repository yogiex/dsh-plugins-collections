# dsh-bg-gradient

A configurable **chat background** for the DeepSeek Harness Web GUI, plus the DeepSeek-blue primary
accent. Despite the historical package name, it no longer paints the whole shell: the sidebar and the
Plugins/Settings pages keep their stock surfaces.

Generate `preview.html` with `node test/build-preview.mjs` to review the mode gallery.

## Modes

| Mode | What it paints |
|---|---|
| None | Stock surface, no background |
| Gradient | Aurora, Sky, Ice, or Deep; a 0–100 % strength slider blends the stops toward the palette base |
| Solid | A curated colour, a custom colour, or a native colour picker |
| Wallpaper | Six original procedural SVG patterns: Mesh, Waves, Topography, Dots, Rays, Grid |
| Upload | Your own JPG, PNG, WebP, or GIF, up to 8 MiB, stored by the Host |

All modes except Gradient share a **readability scrim**: `Readability` (0–100) blends the background
toward the palette base. The scrim minimum is chosen so secondary chat text stays at or above 4.5:1
over the worst possible image pixel (pure black in light mode, pure white in dark mode) after the two
translucent `bg-base` layers; raising the slider only makes the background softer. Photos therefore
read as an ambient tint rather than a full-bleed photo — text in DSH sits directly on the conversation
surface, so this is the trade-off that keeps the chat legible.

## What changes

| Layer | What happens |
|---|---|
| Chat canvas | `body` gets `--dcb-layers` while a conversation slot is mounted |
| Surface | `--dsw-alias-bg-base` becomes translucent **inside that same scope** |
| Sidebar | Untouched (`--dsw-specific-sidebar-fill` stays stock) |
| Accent | Primary buttons, links, focus ring, and selected states use DeepSeek blue |
| Animation | Uploaded GIF/WebP loops only while `Play animation` is on and reduced motion is not requested |
| Untouched | Code blocks, bubbles, composer input, dialogs, tooltips, error/success/warn colours |

Scoping uses one shipped slot contract:

```css
body[data-dcb="on"]:has([data-slot^="conversation"]) { … }
```

`data-slot` is the wrapper attribute DSH's renderer puts around slot content, and shipped CSS already
uses `[data-slot="conversation.session"]` for layout. If a future release renames the conversation
slot, this selector is the one line to update.

`prefers-reduced-transparency: reduce` drops the painted image while keeping the safe tokens;
`prefers-reduced-motion: reduce` decodes the first frame of an animated upload and shows that instead.

## Settings row

`Background` appears under Appearance with:

- five mode chips: None, Gradient, Solid, Wallpaper, Upload
- the matching conditional controls (preset chips and strength, colour row, wallpaper grid, upload panel)
- `Readability` for Solid, Wallpaper, and Upload
- Reset

The upload panel accepts click, drag-and-drop, replace, remove, and an optional animation toggle. Every
choice persists through the Host endpoint, so it survives reloads and browser changes.

## Storage

| Path | Contents |
|---|---|
| `$DSH_HOME/dsh-bg-gradient.json` | Preference file (v2 schema; v1 files migrate automatically) |
| `$DSH_HOME/dsh-bg-gradient-assets/chat-background.<ext>` | The uploaded image; the Host owns the file name |

Only raster images are accepted: the Host verifies the declared MIME type against the actual magic
bytes (JPEG, PNG, WebP, GIF). SVG is rejected because the endpoint serves the file back into the page
and SVG can carry script. The request body is capped at 12 MiB and the decoded image at 8 MiB.

## Config

`cordis.patch.yml` in the composition can set the defaults:

```yaml
- insert:
    - id: dsh-bg-gradient
      name: '@local/dsh-bg-gradient'
      config:
        mode: gradient      # none | gradient | solid | wallpaper | upload
        preset: aurora      # aurora | sky | ice | deep
        intensity: 100      # 0-100
        solid: '#0B1220'
        wallpaper: mesh     # mesh | waves | topo | dots | rays | grid
        dim: 40             # 0-100 readability scrim
        animate: true
```

A user change through the Settings row is written to `$DSH_HOME/dsh-bg-gradient.json` and wins over the
config. Delete that file to fall back to the composition defaults. `mode: upload` without an asset on
disk falls back to Gradient.

## API

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/dsh-bg-gradient` | — | effective config + `upload` metadata |
| POST | `/api/dsh-bg-gradient` | config fields | effective config |
| POST | `/api/dsh-bg-gradient/image` | `{ dataUrl }` | `{ upload }` |
| GET | `/api/dsh-bg-gradient/image?v=…` | — | the image bytes, `no-store` |
| DELETE | `/api/dsh-bg-gradient/image` | — | `{ ok: true }` |

Upload errors carry `{ error, code }`: `bad-data-url`, `bad-type`, `bad-image`, `too-large`, `io`.

## Tests

```bash
node --test test/host.test.mjs    # migration, routes, validation, fixed-path asset store
node --test test/logic.test.mjs   # layers, accent tokens, row registration, contrast gate
node test/build-preview.mjs       # renders preview.html from test/applied.json
```

`test/applied.json` is the bridge: the preview cannot drift from the bundle. The contrast gate is
recomputed for every gradient, wallpaper, solid extreme, and worst-case upload in both schemes across
the whole readability range.

## Install (patch-only, no restart for client changes)

The plugin is already active in this profile through an `insert` entry plus a `node_modules` symlink.
`@local/dsh-bg-gradient` must stay out of `dsh.profile.bundles`; double registration mounts it twice.
A **Host** change (`index.js`, routes, storage) needs a `dsh web` restart. Client-only changes are
picked up by the bundle poll.

## Notes and limits

- The background is static except for an uploaded animated GIF/WebP. There is no video wallpaper.
- Wallpapers are procedural SVG, so no third-party photo licensing enters the bundle.
- Wallpaper visibility is intentionally bounded by readability. Lower `Readability` to see more of the
  image; the contrast floor is still enforced at the scrim minimum.
- No per-session backgrounds and no cross-tab live sync; the row reads the Host value on mount.
- The accent uses `#3D6EE0` rather than the exact brand `#4176E6` because white button labels need
  4.5:1 (`#4176E6` gives 4.23:1). Dark mode uses `#7AAAFF` with a navy label (8.04:1).
