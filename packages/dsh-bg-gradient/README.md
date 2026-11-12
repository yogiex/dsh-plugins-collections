# dsh-bg-gradient

Blue gradient background + DeepSeek-blue primary accent for the DeepSeek Harness Web GUI,
with a **Background** row in Settings → General.

![preview light](../media/bg-gradient-light.png)

## What it changes

| Layer | What happens |
|---|---|
| Page canvas | `body` gets a fixed `linear-gradient` driven by `--dbb-grad-active` (light/dark aware) |
| Scrim | `--dsw-alias-bg-base` and `--dsw-specific-sidebar-fill` get alpha, so the shell reveals the gradient |
| Accent | Primary buttons, links, focus ring and selected states use DeepSeek blue instead of near-black |
| Untouched | Code blocks, bubbles, composer input, dialogs, tooltips, error/success/warn colours stay opaque and semantic |

The gradient is painted *behind* the shell, and the shell's own surfaces act as the scrim. Per-layer alpha is 0.46
(light) / 0.44 (dark); because the frame and the conversation root both paint `bg-base`, the effective scrim is
~0.71 / ~0.69. The stops are saturated blues (`#DFEDFF → #B7D2FF → #8FB4FA` for Aurora) and the default strength is
100 %, so the canvas reads as blue instead of a faint wash.

`test/logic.test.mjs` gates this: for every preset and both schemes, secondary text over the deepest stop under the
effective scrim must stay at or above 4.5:1. Current worst cases: Aurora 4.75, Sky 4.92, Ice 5.24, Deep 4.57.

## Settings row

`Background` appears under Appearance with:

- five preset chips: None, Aurora, Sky, Ice, Deep
- a strength slider (0–100 %) that blends every stop toward the palette base colour
- Reset

Chips and slider persist through the Host endpoint, so the choice survives reloads.

## Config

`cordis.patch.yml` in the composition can set the defaults:

```yaml
- insert:
    - id: dsh-bg-gradient
      name: '@local/dsh-bg-gradient'
      config:
        enabled: true
        preset: aurora      # none | aurora | sky | ice | deep
        intensity: 100      # 0-100
```

A user change through the Settings row is written to `$DSH_HOME/dsh-bg-gradient.json` and wins over the config.
Delete that file to fall back to the composition defaults.

## API

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/dsh-bg-gradient` | — | `{ enabled, preset, intensity }` |
| POST | `/api/dsh-bg-gradient` | same shape | effective config |

## Tests

```bash
node test/logic.test.mjs   # stubs the loader, DOM and Cordis; asserts gradient math, token layer, row registration
node test/build-preview.mjs  # renders preview.html from the values the test captured
```

`test/applied.json` is the bridge: the preview cannot drift from the bundle.

## Install (patch-only, no restart)

```bash
ln -s "$PWD" ~/.dsh/profiles/web/node_modules/@local/dsh-bg-gradient
# then append to ~/.dsh/profiles/web/cordis.patch.yml
```

```yaml
- insert:
    - id: dsh-bg-gradient
      name: '@local/dsh-bg-gradient'
      config:
        enabled: true
        preset: aurora
        intensity: 100
```

The server's HMR watches the patch file and recomposes live; the client bundle is stat-polled every 500 ms.
Remove the row (and the symlink) to uninstall.

## Notes and limits

- The gradient is static: no animation, so menus keep their `backdrop-filter` cost unchanged.
- `prefers-reduced-transparency: reduce` drops the gradient while keeping the scrim tokens.
- Sticky headers and the composer fade use `bg-base`, so they become slightly translucent; if that bothers you,
  raise `intensity` down (less gradient) or keep the scrim alpha where it is.
- The accent uses `#3D6EE0` rather than the exact brand `#4176E6` because white button labels need 4.5:1
  (`#4176E6` gives 4.23:1). Dark mode uses `#7AAAFF` with a navy label (8.04:1).
