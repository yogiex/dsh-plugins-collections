/**
 * Client half: configurable blue gradient background + a Settings row.
 *
 * Rendering strategy:
 *   - the gradient itself is painted on <body> (fixed to the viewport);
 *   - surface tokens are made translucent through ctx.theme.overrideTokens,
 *     so the shipped component CSS reveals the gradient without patching it;
 *   - the Settings row reads and writes the Host preference endpoint.
 *
 * Intensity blends every gradient stop toward the palette base colour, so 0%
 * is visually identical to the stock palette and 100% is the full gradient.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-bg-gradient',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const API = '/api/dsh-bg-gradient';
    const LIGHT_BASE = '#FFFFFF';
    const DARK_BASE = '#151517';

    /** Presets: three stops, an angle, and a label. Keep ids in sync with index.js. */
    const PRESETS = [
      { id: 'none', label: 'None', hint: 'Stock palette', light: null, dark: null },
      {
        id: 'aurora',
        label: 'Aurora',
        hint: 'DeepSeek blue',
        angle: 135,
        light: ['#DFEDFF', '#B7D2FF', '#8FB4FA'],
        dark: ['#0C1A30', '#12386A', '#16467F'],
      },
      {
        id: 'sky',
        label: 'Sky',
        hint: 'Soft wash',
        angle: 160,
        light: ['#EAF3FF', '#C6DCFF', '#9FC0FA'],
        dark: ['#0A1526', '#0F2B52', '#13386A'],
      },
      {
        id: 'ice',
        label: 'Ice',
        hint: 'Barely there',
        angle: 135,
        light: ['#F2F8FF', '#DCEAFF', '#C2D9FA'],
        dark: ['#0B1420', '#111F35', '#16283F'],
      },
      {
        id: 'deep',
        label: 'Deep',
        hint: 'Strong blue',
        angle: 145,
        light: ['#D3E6FF', '#A5C6FF', '#7AA5F7'],
        dark: ['#08152B', '#123E77', '#1A5296'],
      },
    ];

    /**
     * Two responsibilities in one override layer:
     *   - the page scrim and the sidebar fill carry alpha so the gradient shows;
     *   - the primary accent becomes DeepSeek blue instead of near-black.
     * Code blocks, bubbles, inputs and raised layers stay opaque on purpose:
     * those are the surfaces that must keep text legible.
     *
     * `#3D6EE0` is the brand blue `#4176E6` nudged darker so white button labels
     * clear 4.5:1 (4.66); the hue is unchanged to the eye. Dark mode uses the
     * light DeepSeek blue `#7AAAFF` with a navy label (8.04:1).
     */
    const SURFACE_TOKENS = {
      light: {
        '--dsw-alias-bg-base': '#FFFFFF75',
        '--dsw-specific-sidebar-fill': '#F9FAFB75',
      },
      dark: {
        '--dsw-alias-bg-base': '#15151770',
        '--dsw-specific-sidebar-fill': '#1B1B1C70',
      },
    };

    const ACCENT_TOKENS = {
      light: {
        '--dsw-alias-brand-primary': '#3D6EE0',
        '--dsw-alias-button-primary-fill': '#3D6EE0',
        '--dsw-alias-button-primary-hover': '#3366DB',
        '--dsw-alias-button-primary-dimmed': '#E3ECFF',
        '--dsw-alias-state-business-primary': '#3D6EE0',
        '--dsw-alias-link': '#3366DB',
        '--dsw-alias-button-info-fill': '#3D6EE0',
        '--dsw-alias-button-info-hover': '#5686FE',
        '--dsw-alias-label-primary-bluish': '#123A7A',
      },
      dark: {
        '--dsw-alias-brand-primary': '#7AAAFF',
        '--dsw-alias-button-primary-fill': '#7AAAFF',
        '--dsw-alias-button-primary-hover': '#93C0FF',
        '--dsw-alias-button-primary-dimmed': '#24365A',
        '--dsw-alias-label-primary-foreground': '#0B1220',
        '--dsw-alias-state-business-primary': '#7AAAFF',
        '--dsw-alias-link': '#8CBDFF',
        '--dsw-alias-button-info-fill': '#7AAAFF',
        '--dsw-alias-button-info-hover': '#93C0FF',
      },
    };

    /**
     * Build the override layer in the shape `overrideTokens` expects: token name
     * to a `{ light, dark }` pair — never scheme to token map.
     */
    function layerTokens() {
      const light = { ...SURFACE_TOKENS.light, ...ACCENT_TOKENS.light };
      const dark = { ...SURFACE_TOKENS.dark, ...ACCENT_TOKENS.dark };
      const layer = {};
      for (const name of Object.keys(light)) {
        layer[name] = { light: light[name], dark: dark[name] ?? light[name] };
      }
      return layer;
    }

    const GRADIENT_CSS = [
      'body[data-dbb="on"]{background-image:var(--dbb-grad-active);',
      'background-attachment:fixed;background-size:cover;background-repeat:no-repeat}',
      '@media (prefers-reduced-transparency:reduce){body[data-dbb="on"]{background-image:none}}',
      '@media (prefers-reduced-motion:reduce){body[data-dbb="on"]{background-attachment:scroll}}',
    ].join('');

    const ROW_CSS = [
      '.dbb-row{display:flex;flex-direction:column;gap:10px;padding:16px 0;',
      'border-bottom:.5px solid var(--dsw-alias-border-l2)}',
      '.dbb-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.dbb-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}',
      '.dbb-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin:0}',
      '.dbb-chips{display:flex;flex-wrap:wrap;gap:8px}',
      '.dbb-chip{box-sizing:border-box;min-width:104px;flex:1 1 104px;max-width:180px;',
      'border:.5px solid var(--dsw-alias-border-l4);border-radius:12px;background:transparent;',
      'color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;cursor:pointer;',
      'display:flex;flex-direction:column;gap:6px;padding:7px;text-align:left;transition:border-color .15s,background .15s}',
      '.dbb-chip:hover:not([aria-pressed="true"]){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dbb-chip[aria-pressed="true"]{border-color:var(--dsw-alias-state-business-primary);',
      'box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary) inset}',
      '.dbb-chip:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-bg-base),0 0 0 4px var(--dsw-alias-state-business-primary)}',
      '.dbb-swatch{height:44px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l1);',
      'background-color:var(--dsw-alias-bg-layer-2);background-size:cover}',
      '.dbb-chipLabel{display:flex;flex-direction:column;gap:1px;line-height:15px;min-width:0}',
      '.dbb-chipLabel span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dbb-chipLabel small{color:var(--dsw-alias-label-caption);font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dbb-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
      '.dbb-slider{flex:1 1 180px;min-width:140px;accent-color:var(--dsw-alias-state-business-primary);height:20px}',
      '.dbb-value{font-size:12px;color:var(--dsw-alias-label-secondary);',
      'font-variant-numeric:tabular-nums;min-width:38px;text-align:right}',
      '.dbb-reset{border:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-button-ghost-active-fill);',
      'color:var(--dsw-alias-label-primary);border-radius:8px;font:inherit;font-size:12px;padding:5px 10px;cursor:pointer}',
      '.dbb-reset:hover{background:var(--dsw-alias-button-ghost-active-hover)}',
      '.dbb-reset:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-bg-base),0 0 0 4px var(--dsw-alias-state-business-primary)}',
      '.dbb-off .dbb-controls{opacity:.55}',
    ].join('');

    const DEFAULTS = { enabled: true, preset: 'aurora', intensity: 100 };

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function parseHex(hex) {
      const value = hex.replace('#', '');
      return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
    }

    function toHex(channels) {
      return `#${channels
        .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
        .join('')}`;
    }

    /** Blend `color` toward `base`; 0 keeps the base colour and 1 keeps the stop. */
    function blend(base, color, amount) {
      const from = parseHex(base);
      const to = parseHex(color);
      return toHex(to.map((channel, index) => from[index] + (channel - from[index]) * amount));
    }

    function gradientFor(preset, mode, intensity) {
      const stops = preset[mode];
      if (!stops) return 'none';
      const base = mode === 'light' ? LIGHT_BASE : DARK_BASE;
      const amount = clamp(intensity / 100, 0, 1);
      const colors = stops.map((stop) => blend(base, stop, amount));
      return `linear-gradient(${preset.angle ?? 135}deg, ${colors.join(', ')})`;
    }

    function presetById(id) {
      return PRESETS.find((preset) => preset.id === id) ?? PRESETS[1];
    }

    function normalize(input, fallback = DEFAULTS) {
      const source = typeof input === 'object' && input !== null ? input : {};
      return {
        enabled: typeof source.enabled === 'boolean' ? source.enabled : fallback.enabled,
        preset: PRESETS.some((preset) => preset.id === source.preset) ? source.preset : fallback.preset,
        intensity:
          source.intensity === undefined
            ? fallback.intensity
            : clamp(Math.round(Number(source.intensity) || 0), 0, 100),
      };
    }

    function installStyle(ctx, id, css) {
      const tag = document.createElement('style');
      tag.dataset.plugin = '@local/dsh-bg-gradient';
      tag.dataset.pluginCss = id;
      tag.textContent = css;
      document.head.append(tag);
      ctx.effect(() => () => tag.remove(), `dsh-bg-gradient: style ${id}`);
      return tag;
    }

    function BackgroundRow({ onChange }) {
      const [config, setConfig] = React.useState(null);
      const [error, setError] = React.useState(null);

      React.useEffect(() => {
        let cancelled = false;
        fetch(API, { credentials: 'same-origin' })
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
          .then((value) => {
            if (cancelled) return;
            const next = normalize(value);
            setConfig(next);
            onChange(next);
          })
          .catch((cause) => {
            if (!cancelled) setError(String(cause?.message ?? cause));
          });
        return () => {
          cancelled = true;
        };
      }, []);

      const commit = React.useCallback(
        (patch) => {
          setConfig((current) => {
            const next = normalize({ ...(current ?? DEFAULTS), ...patch }, current ?? DEFAULTS);
            onChange(next);
            fetch(API, {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(next),
            }).catch((cause) => setError(String(cause?.message ?? cause)));
            return next;
          });
        },
        [onChange],
      );

      if (config === null) {
        return h(
          'div',
          { className: 'dbb-row' },
          h('div', { className: 'dbb-title' }, 'Background'),
          h('p', { className: 'dbb-hint' }, error ? `Unavailable: ${error}` : 'Loading palette…'),
        );
      }

      const preset = presetById(config.preset);
      const off = !config.enabled || config.preset === 'none';

      return h(
        'div',
        { className: off ? 'dbb-row dbb-off' : 'dbb-row' },
        h(
          'div',
          { className: 'dbb-head' },
          h('div', { className: 'dbb-title' }, 'Background'),
          h(
            'p',
            { className: 'dbb-hint' },
            off ? 'Stock surface, no gradient' : `${preset.label} · ${config.intensity}% strength`,
          ),
        ),
        h(
          'div',
          { className: 'dbb-chips', role: 'group', 'aria-label': 'Background gradient preset' },
          PRESETS.map((item) =>
            h(
              'button',
              {
                key: item.id,
                type: 'button',
                className: 'dbb-chip',
                'aria-pressed': config.preset === item.id,
                onClick: () => commit({ preset: item.id, enabled: item.id !== 'none' }),
              },
              h('span', {
                className: 'dbb-swatch',
                'aria-hidden': 'true',
                style: { backgroundImage: item.light ? gradientFor(item, 'light', 100) : 'none' },
              }),
              h(
                'span',
                { className: 'dbb-chipLabel' },
                h('span', null, item.label),
                h('small', null, item.hint),
              ),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dbb-controls' },
          h('label', { className: 'dbb-hint', htmlFor: 'dbb-intensity' }, 'Strength'),
          h('input', {
            id: 'dbb-intensity',
            className: 'dbb-slider',
            type: 'range',
            min: 0,
            max: 100,
            step: 5,
            value: config.intensity,
            disabled: off,
            'aria-valuetext': `${config.intensity} percent`,
            onChange: (event) => commit({ intensity: Number(event.target.value) }),
          }),
          h('span', { className: 'dbb-value' }, `${config.intensity}%`),
          h(
            'button',
            {
              type: 'button',
              className: 'dbb-reset',
              onClick: () => commit({ ...DEFAULTS }),
            },
            'Reset',
          ),
        ),
      );
    }

    return {
      inject: ['slots', 'theme'],
      /* Exposed for the offline preview harness only; the loader ignores it. */
      __preview: { PRESETS, gradientFor, SURFACE_TOKENS, ACCENT_TOKENS },
      apply(ctx) {
        try {
          return applyPlugin(ctx);
        } catch (error) {
          console.error('[dsh-bg-gradient] activation failed', error && error.stack ? error.stack : error);
          throw error;
        }
      },
    };

    function applyPlugin(ctx) {
        installStyle(ctx, 'gradient', GRADIENT_CSS);
        installStyle(ctx, 'row', ROW_CSS);

        const root = document.documentElement;
        let tokenLayer = null;
        let current = DEFAULTS;

        let scheme = 'light';
        const activeGradient = () => gradientFor(presetById(current.preset), scheme, current.intensity);

        const render = (config) => {
          current = normalize(config, current);
          const on = current.enabled && current.preset !== 'none';
          if (!on) {
            document.body.removeAttribute('data-dbb');
            root.style.removeProperty('--dbb-grad-active');
            tokenLayer?.();
            tokenLayer = null;
            return;
          }
          root.style.setProperty('--dbb-grad-active', activeGradient());
          document.body.setAttribute('data-dbb', 'on');
          if (!tokenLayer) tokenLayer = ctx.theme.overrideTokens('dsh-bg-gradient', layerTokens());
        };

        const adoptScheme = (snapshot) => {
          const next = snapshot?.active?.colorScheme === 'dark' ? 'dark' : 'light';
          if (next === scheme) return;
          scheme = next;
          if (current.enabled && current.preset !== 'none') {
            root.style.setProperty('--dbb-grad-active', activeGradient());
          }
        };

        ctx.effect(() => {
          const off = ctx.on('theme/change', adoptScheme);
          adoptScheme(ctx.theme.getTheme());
          return off;
        }, 'dsh-bg-gradient: follow light/dark');

        ctx.effect(() => {
          document.body.setAttribute('data-dbb', 'off');
          render(DEFAULTS);
          fetch(API, { credentials: 'same-origin' })
            .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
            .then((value) => render(value))
            .catch(() => render(DEFAULTS));
          return () => {
            tokenLayer?.();
            tokenLayer = null;
            document.body.removeAttribute('data-dbb');
            root.style.removeProperty('--dbb-grad-active');
          };
        }, 'dsh-bg-gradient: page gradient');

        ctx.slots.inject('settings.general.item', () =>
          ctx.slots.register(
            {
              name: 'settings.general.item',
              id: 'background',
              order: 12,
              label: () => 'Background',
            },
          () => h(BackgroundRow, { onChange: render }),
        ),
      );
    }
  },
});
