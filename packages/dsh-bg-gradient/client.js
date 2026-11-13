/**
 * Client half: a configurable chat background plus its Settings row.
 *
 * Rendering strategy:
 *   - the background layers are painted on <body>, but only while a conversation
 *     slot is mounted (`:has([data-slot^="conversation"])`), so the sidebar and
 *     the Plugins/Settings pages keep their stock surfaces;
 *   - `--dsw-alias-bg-base` becomes translucent for that same scope, which lets
 *     the chat column reveal the painted background without patching shipped
 *     component CSS;
 *   - a readability scrim is part of the background layer, so text contrast
 *     stays bounded even for an arbitrary uploaded photo;
 *   - the Settings row reads and writes the Host preference endpoint, and
 *     streams uploads through the Host image endpoint.
 *
 * Modes: none | gradient | solid | wallpaper | upload.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-bg-gradient',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const API = '/api/dsh-bg-gradient';
    const IMAGE_API = '/api/dsh-bg-gradient/image';
    const LIGHT_BASE = '#FFFFFF';
    const DARK_BASE = '#151517';

    const MODES = ['none', 'gradient', 'solid', 'wallpaper', 'upload'];

    /** Gradient presets: three stops, an angle, and a locale key pair. */
    const PRESETS = [
      {
        id: 'aurora',
        labelKey: 'preset.aurora',
        hintKey: 'preset.auroraHint',
        angle: 135,
        light: ['#DFEDFF', '#B7D2FF', '#8FB4FA'],
        dark: ['#0C1A30', '#12386A', '#16467F'],
      },
      {
        id: 'sky',
        labelKey: 'preset.sky',
        hintKey: 'preset.skyHint',
        angle: 160,
        light: ['#EAF3FF', '#C6DCFF', '#9FC0FA'],
        dark: ['#0A1526', '#0F2B52', '#13386A'],
      },
      {
        id: 'ice',
        labelKey: 'preset.ice',
        hintKey: 'preset.iceHint',
        angle: 135,
        light: ['#F2F8FF', '#DCEAFF', '#C2D9FA'],
        dark: ['#0B1420', '#111F35', '#16283F'],
      },
      {
        id: 'deep',
        labelKey: 'preset.deep',
        hintKey: 'preset.deepHint',
        angle: 145,
        light: ['#D3E6FF', '#A5C6FF', '#7AA5F7'],
        dark: ['#08152B', '#123E77', '#1A5296'],
      },
    ];

    /** Solid presets: a small curated set plus the native colour input. */
    const SOLIDS = [
      { id: 'midnight', hex: '#0B1220' },
      { id: 'slate', hex: '#1F2937' },
      { id: 'ocean', hex: '#0E3A5F' },
      { id: 'forest', hex: '#123B2E' },
      { id: 'plum', hex: '#2E123B' },
      { id: 'sand', hex: '#E7DCC8' },
    ];

    /** Procedural wallpapers. Keep ids in sync with index.js. */
    const WALLPAPERS = [
      { id: 'mesh', labelKey: 'wallpaper.mesh' },
      { id: 'waves', labelKey: 'wallpaper.waves' },
      { id: 'topo', labelKey: 'wallpaper.topo' },
      { id: 'dots', labelKey: 'wallpaper.dots' },
      { id: 'rays', labelKey: 'wallpaper.rays' },
      { id: 'grid', labelKey: 'wallpaper.grid' },
    ];

    const DEFAULTS = Object.freeze({
      enabled: true,
      mode: 'gradient',
      preset: 'aurora',
      intensity: 100,
      solid: '#0B1220',
      wallpaper: 'mesh',
      dim: 40,
      animate: true,
      upload: null,
    });

    const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
    const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const NS = '@local/dsh-bg-gradient';

    const DICTS = {
      en: {
        title: 'Background',
        loading: 'Loading palette…',
        unavailable: 'Unavailable: {message}',
        'group.mode': 'Background mode',
        'group.preset': 'Gradient preset',
        'mode.none': 'None',
        'mode.gradient': 'Gradient',
        'mode.solid': 'Solid',
        'mode.wallpaper': 'Wallpaper',
        'mode.upload': 'Upload',
        'hint.none': 'Stock surface, no background',
        'hint.gradient': '{preset} · {strength}% strength',
        'hint.solid': 'Solid wash behind the chat',
        'hint.wallpaper': 'Procedural pattern · {name}',
        'hint.upload': 'Your own image · {detail}',
        strength: 'Strength',
        'solid.custom': 'Custom colour',
        dim: 'Readability',
        'dimHint': 'Higher keeps text crisp and the background softer.',
        'preset.aurora': 'Aurora',
        'preset.auroraHint': 'DeepSeek blue',
        'preset.sky': 'Sky',
        'preset.skyHint': 'Soft wash',
        'preset.ice': 'Ice',
        'preset.iceHint': 'Barely there',
        'preset.deep': 'Deep',
        'preset.deepHint': 'Strong blue',
        'wallpaper.mesh': 'Mesh',
        'wallpaper.waves': 'Waves',
        'wallpaper.topo': 'Topography',
        'wallpaper.dots': 'Dots',
        'wallpaper.rays': 'Rays',
        'wallpaper.grid': 'Grid',
        'upload.choose': 'Choose image',
        'upload.replace': 'Replace',
        'upload.remove': 'Remove',
        'upload.empty': 'Drop a JPG, PNG, WebP, or GIF here, or choose one.',
        'upload.animate': 'Play animation',
        'upload.animateHint': 'Animated GIF/WebP loops; reduced motion shows a still frame.',
        'upload.busy': 'Uploading…',
        'upload.detail': '{type} · {size}',
        'error.tooLarge': 'That image is larger than 8 MB.',
        'error.badType': 'Use a JPG, PNG, WebP, or GIF image.',
        'error.badImage': 'That file is not a valid image.',
        'error.io': 'The image could not be saved.',
        'error.generic': 'Something went wrong. Try again.',
        reset: 'Reset',
      },
      id: {
        title: 'Latar belakang',
        loading: 'Memuat palet…',
        unavailable: 'Tidak tersedia: {message}',
        'group.mode': 'Mode latar belakang',
        'group.preset': 'Preset gradient',
        'mode.none': 'Tanpa',
        'mode.gradient': 'Gradient',
        'mode.solid': 'Warna',
        'mode.wallpaper': 'Wallpaper',
        'mode.upload': 'Unggah',
        'hint.none': 'Permukaan bawaan, tanpa latar',
        'hint.gradient': '{preset} · kekuatan {strength}%',
        'hint.solid': 'Warna datar di belakang chat',
        'hint.wallpaper': 'Pola prosedural · {name}',
        'hint.upload': 'Gambar milikmu · {detail}',
        strength: 'Kekuatan',
        'solid.custom': 'Warna khusus',
        dim: 'Keterbacaan',
        'dimHint': 'Makin tinggi, teks makin jelas dan latar makin samar.',
        'preset.aurora': 'Aurora',
        'preset.auroraHint': 'Biru DeepSeek',
        'preset.sky': 'Langit',
        'preset.skyHint': 'Wash lembut',
        'preset.ice': 'Es',
        'preset.iceHint': 'Sangat tipis',
        'preset.deep': 'Dalam',
        'preset.deepHint': 'Biru kuat',
        'wallpaper.mesh': 'Mesh',
        'wallpaper.waves': 'Gelombang',
        'wallpaper.topo': 'Topografi',
        'wallpaper.dots': 'Titik',
        'wallpaper.rays': 'Berkas cahaya',
        'wallpaper.grid': 'Grid',
        'upload.choose': 'Pilih gambar',
        'upload.replace': 'Ganti',
        'upload.remove': 'Hapus',
        'upload.empty': 'Letakkan JPG, PNG, WebP, atau GIF di sini, atau pilih berkas.',
        'upload.animate': 'Putar animasi',
        'upload.animateHint': 'GIF/WebP animasi berulang; reduced motion menampilkan frame diam.',
        'upload.busy': 'Mengunggah…',
        'upload.detail': '{type} · {size}',
        'error.tooLarge': 'Gambar itu lebih besar dari 8 MB.',
        'error.badType': 'Gunakan gambar JPG, PNG, WebP, atau GIF.',
        'error.badImage': 'Berkas itu bukan gambar yang valid.',
        'error.io': 'Gambar gagal disimpan.',
        'error.generic': 'Terjadi kesalahan. Coba lagi.',
        reset: 'Atur ulang',
      },
      zh: {
        title: '背景',
        loading: '正在加载配色…',
        unavailable: '不可用：{message}',
        'group.mode': '背景模式',
        'group.preset': '渐变预设',
        'mode.none': '无',
        'mode.gradient': '渐变',
        'mode.solid': '纯色',
        'mode.wallpaper': '壁纸',
        'mode.upload': '上传',
        'hint.none': '默认表面，无背景',
        'hint.gradient': '{preset} · 强度 {strength}%',
        'hint.solid': '聊天背后的纯色',
        'hint.wallpaper': '程序化图案 · {name}',
        'hint.upload': '你自己的图片 · {detail}',
        strength: '强度',
        'solid.custom': '自定义颜色',
        dim: '可读性',
        'dimHint': '越高文字越清晰，背景越柔和。',
        'preset.aurora': '极光',
        'preset.auroraHint': 'DeepSeek 蓝',
        'preset.sky': '天空',
        'preset.skyHint': '柔和浅色',
        'preset.ice': '冰蓝',
        'preset.iceHint': '若有若无',
        'preset.deep': '深蓝',
        'preset.deepHint': '强烈蓝色',
        'wallpaper.mesh': '网格',
        'wallpaper.waves': '波浪',
        'wallpaper.topo': '地形',
        'wallpaper.dots': '圆点',
        'wallpaper.rays': '光束',
        'wallpaper.grid': '格线',
        'upload.choose': '选择图片',
        'upload.replace': '替换',
        'upload.remove': '移除',
        'upload.empty': '将 JPG、PNG、WebP 或 GIF 拖到此处，或选择文件。',
        'upload.animate': '播放动画',
        'upload.animateHint': 'GIF/WebP 循环播放；减少动态效果时显示静帧。',
        'upload.busy': '正在上传…',
        'upload.detail': '{type} · {size}',
        'error.tooLarge': '图片大于 8 MB。',
        'error.badType': '请使用 JPG、PNG、WebP 或 GIF 图片。',
        'error.badImage': '该文件不是有效图片。',
        'error.io': '图片保存失败。',
        'error.generic': '出了点问题，请重试。',
        reset: '重置',
      },
    };

    /**
     * Accent tokens stay global: the DeepSeek blue accent is a theme choice,
     * independent of which background is active. Code blocks, dialogs, and
     * semantic colours stay untouched.
     */
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

    /** `overrideTokens` wants token -> { light, dark }, never scheme -> token map. */
    function accentLayer() {
      const layer = {};
      for (const token of Object.keys(ACCENT_TOKENS.light)) {
        layer[token] = {
          light: ACCENT_TOKENS.light[token],
          dark: ACCENT_TOKENS.dark[token] ?? ACCENT_TOKENS.light[token],
        };
      }
      return layer;
    }

    const BACKGROUND_CSS = [
      'body[data-dcb="on"]:has([data-slot^="conversation"]){',
      'background-image:var(--dcb-layers);background-attachment:fixed;background-size:cover;',
      'background-position:center;background-repeat:no-repeat;',
      '--dsw-alias-bg-base:var(--dcb-base-alpha)}',
      'body[data-dcb="on"].dcb-global{',
      'background-image:var(--dcb-layers);background-attachment:fixed;background-size:cover;',
      'background-position:center;background-repeat:no-repeat;',
      '--dsw-alias-bg-base:var(--dcb-base-alpha)}',
      '@media (prefers-reduced-transparency:reduce){',
      'body[data-dcb="on"]:has([data-slot^="conversation"]),body[data-dcb="on"].dcb-global{',
      'background-image:none}}',
    ].join('');

    const ROW_CSS = [
      '.dcb-row{display:flex;flex-direction:column;gap:12px;padding:16px 0;',
      'border-bottom:.5px solid var(--dsw-alias-border-l2)}',
      '.dcb-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.dcb-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}',
      '.dcb-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin:0}',
      '.dcb-modes{display:flex;flex-wrap:wrap;gap:6px}',
      '.dcb-mode{box-sizing:border-box;flex:1 1 96px;max-width:172px;border:.5px solid var(--dsw-alias-border-l4);',
      'border-radius:10px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;',
      'font-size:12px;cursor:pointer;display:flex;align-items:center;gap:7px;padding:6px 8px;text-align:left;',
      'transition:border-color .15s,background .15s}',
      '.dcb-mode:hover:not([aria-pressed="true"]){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dcb-mode[aria-pressed="true"]{border-color:var(--dsw-alias-state-business-primary);',
      'box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary) inset}',
      '.dcb-mode:focus-visible,.dcb-chip:focus-visible,.dcb-wall:focus-visible,.dcb-btn:focus-visible{outline:none;',
      'box-shadow:0 0 0 2px var(--dsw-alias-bg-base),0 0 0 4px var(--dsw-alias-state-business-primary)}',
      '.dcb-mini{flex:none;width:26px;height:26px;border-radius:7px;border:.5px solid var(--dsw-alias-border-l1);',
      'background-color:var(--dsw-alias-bg-layer-2);background-size:cover;background-position:center}',
      '.dcb-panel{display:flex;flex-direction:column;gap:10px}',
      '.dcb-chips{display:flex;flex-wrap:wrap;gap:8px}',
      '.dcb-chip{box-sizing:border-box;min-width:104px;flex:1 1 104px;max-width:180px;',
      'border:.5px solid var(--dsw-alias-border-l4);border-radius:12px;background:transparent;',
      'color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;cursor:pointer;',
      'display:flex;flex-direction:column;gap:6px;padding:7px;text-align:left;',
      'transition:border-color .15s,background .15s}',
      '.dcb-chip:hover:not([aria-pressed="true"]){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dcb-chip[aria-pressed="true"]{border-color:var(--dsw-alias-state-business-primary);',
      'box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary) inset}',
      '.dcb-swatch{height:44px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l1);',
      'background-color:var(--dsw-alias-bg-layer-2);background-size:cover;background-position:center}',
      '.dcb-chipLabel{display:flex;flex-direction:column;gap:1px;line-height:15px;min-width:0}',
      '.dcb-chipLabel span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dcb-chipLabel small{color:var(--dsw-alias-label-caption);font-size:10.5px;',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dcb-walls{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px}',
      '.dcb-wall{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);border-radius:12px;',
      'background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;',
      'cursor:pointer;display:flex;flex-direction:column;gap:6px;padding:7px;text-align:left}',
      '.dcb-wall:hover:not([aria-pressed="true"]){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dcb-wall[aria-pressed="true"]{border-color:var(--dsw-alias-state-business-primary);',
      'box-shadow:0 0 0 1px var(--dsw-alias-state-business-primary) inset}',
      '.dcb-wallArt{height:52px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l1);',
      'background-size:cover;background-position:center}',
      '.dcb-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
      '.dcb-slider{flex:1 1 180px;min-width:140px;accent-color:var(--dsw-alias-state-business-primary);height:20px}',
      '.dcb-value{font-size:12px;color:var(--dsw-alias-label-secondary);',
      'font-variant-numeric:tabular-nums;min-width:38px;text-align:right}',
      '.dcb-btn{border:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-button-ghost-active-fill);',
      'color:var(--dsw-alias-label-primary);border-radius:8px;font:inherit;font-size:12px;',
      'padding:5px 10px;cursor:pointer}',
      '.dcb-btn:hover{background:var(--dsw-alias-button-ghost-active-hover)}',
      '.dcb-btn:disabled{opacity:.55;cursor:default}',
      '.dcb-reset{align-self:flex-start}',
      '.dcb-solidRow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.dcb-color{width:38px;height:30px;padding:0;border:.5px solid var(--dsw-alias-border-l3);',
      'border-radius:8px;background:transparent;cursor:pointer}',
      '.dcb-swatches{display:flex;gap:6px;flex-wrap:wrap}',
      '.dcb-swatchBtn{width:30px;height:30px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l2);',
      'cursor:pointer;padding:0;box-shadow:0 0 0 1px transparent inset}',
      '.dcb-swatchBtn[aria-pressed="true"]{box-shadow:0 0 0 2px var(--dsw-alias-bg-base) inset,',
      '0 0 0 1px var(--dsw-alias-state-business-primary)}',
      '.dcb-upload{display:flex;flex-direction:column;gap:8px}',
      '.dcb-drop{display:flex;gap:12px;align-items:center;border:1px dashed var(--dsw-alias-border-l3);',
      'border-radius:12px;padding:10px;background:var(--dsw-alias-bg-layer-1)}',
      '.dcb-drop[data-over="true"]{border-color:var(--dsw-alias-state-business-primary)}',
      '.dcb-preview{flex:none;width:120px;height:70px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l1);',
      'background-color:var(--dsw-alias-bg-layer-2);background-size:cover;background-position:center}',
      '.dcb-dropText{display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.dcb-uploadMeta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.dcb-check{display:flex;align-items:center;gap:6px;font-size:12px;',
      'color:var(--dsw-alias-label-secondary)}',
      '.dcb-error{margin:0;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}',
      '.dcb-off .dcb-panel,.dcb-off .dcb-controls{opacity:.55}',
    ].join('');

    const DARK_SCHEME = 'dark';

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

    function rgba(hex, alpha) {
      const [r, g, b] = parseHex(hex);
      return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`;
    }

    function gradientFor(preset, mode, intensity) {
      const stops = preset?.[mode];
      if (!stops) return 'none';
      const base = mode === DARK_SCHEME ? DARK_BASE : LIGHT_BASE;
      const amount = clamp((Number(intensity) || 0) / 100, 0, 1);
      const colors = stops.map((stop) => blend(base, stop, amount));
      return `linear-gradient(${preset.angle ?? 135}deg, ${colors.join(', ')})`;
    }

    function presetById(id) {
      return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];
    }

    /**
     * Scrim alpha, per scheme. The minimum is what keeps secondary chat text at
     * or above 4.5:1 over the worst possible image pixel (pure black in light,
     * pure white in dark) after the two translucent `bg-base` layers; the slider
     * only makes it softer. `test/logic.test.mjs` recomputes this gate.
     */
    function scrimAlpha(scheme, dim) {
      const amount = clamp(Number(dim) || 0, 0, 100) / 100;
      return scheme === DARK_SCHEME ? 0.1 + 0.15 * amount : 0.62 + 0.14 * amount;
    }

    function baseAlpha(scheme) {
      return scheme === DARK_SCHEME ? '#15151770' : '#FFFFFF75';
    }

    /* ---------------------------------------------------------------- *
     * Procedural wallpapers (original SVG, no bundled media).
     * ---------------------------------------------------------------- */

    const INK = {
      light: { a: '#3B6BF5', b: '#7C4DFF', c: '#00A6A6', d: '#F06AA8', bg: '#F2F5FF' },
      dark: { a: '#4C7DFF', b: '#9A6BFF', c: '#12B5B5', d: '#FF7AB8', bg: '#0A1024' },
    };

    const WALLPAPER_SIZE = { width: 1600, height: 1000 };

    function svgDoc(body, defs) {
      const { width, height } = WALLPAPER_SIZE;
      return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
        `viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">` +
        `${defs}${body}</svg>`
      );
    }

    function radial(id, color) {
      return (
        `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">` +
        `<stop offset="0%" stop-color="${color}" stop-opacity="0.9"/>` +
        `<stop offset="100%" stop-color="${color}" stop-opacity="0"/>` +
        `</radialGradient>`
      );
    }

    function wallpaperSvg(id, scheme) {
      const ink = INK[scheme === DARK_SCHEME ? 'dark' : 'light'];
      if (id === 'waves') {
        return svgDoc(
          `<rect width="1600" height="1000" fill="${ink.bg}"/>` +
            `<path d="M0 620 C260 480 520 760 800 620 S1340 460 1600 600 L1600 1000 L0 1000 Z" fill="${ink.a}" opacity=".5"/>` +
            `<path d="M0 750 C300 610 560 890 860 750 S1360 630 1600 770 L1600 1000 L0 1000 Z" fill="${ink.b}" opacity=".42"/>` +
            `<path d="M0 880 C320 760 620 1000 940 880 S1400 780 1600 900 L1600 1000 L0 1000 Z" fill="${ink.c}" opacity=".38"/>`,
          `<defs><linearGradient id="wgl" x1="0" y1="0" x2="1" y2="1">` +
            `<stop offset="0" stop-color="${ink.a}"/><stop offset="1" stop-color="${ink.b}"/>` +
            `</linearGradient></defs>`,
        );
      }
      if (id === 'topo') {
        const rings = (cx, cy, color, opacity) =>
          [0, 1, 2, 3, 4, 5, 6, 7]
            .map(
              (index) =>
                `<ellipse cx="${cx}" cy="${cy}" rx="${170 + index * 92}" ry="${112 + index * 64}" ` +
                `fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.6" ` +
                `transform="rotate(-18 ${cx} ${cy})"/>`,
            )
            .join('');
        return svgDoc(
          `<rect width="1600" height="1000" fill="${ink.bg}"/>` +
            rings(980, 420, ink.a, 0.32) +
            rings(320, 760, ink.b, 0.24) +
            rings(1380, 900, ink.c, 0.18),
        );
      }
      if (id === 'dots') {
        return svgDoc(
          `<defs><pattern id="dd" width="46" height="46" patternUnits="userSpaceOnUse">` +
            `<circle cx="5" cy="5" r="2.6" fill="${ink.a}" opacity=".55"/>` +
            `</pattern>${radial('dgl', ink.b)}</defs>` +
            `<rect width="1600" height="1000" fill="${ink.bg}"/>` +
            `<rect width="1600" height="1000" fill="url(#dd)"/>` +
            `<circle cx="1180" cy="280" r="520" fill="url(#dgl)"/>` +
            `<circle cx="260" cy="820" r="360" fill="url(#dgl)" opacity=".6"/>`,
        );
      }
      if (id === 'rays') {
        const bars = [
          [-220, ink.a, 0.55, 150],
          [40, ink.b, 0.45, 120],
          [260, ink.c, 0.4, 90],
          [430, ink.a, 0.3, 60],
          [600, ink.d, 0.28, 46],
        ]
          .map(
            ([x, color, opacity, width]) =>
              `<rect x="${x}" y="-600" width="${width}" height="2300" fill="${color}" opacity="${opacity}"/>`,
          )
          .join('');
        return svgDoc(
          `<defs><linearGradient id="rf" x1="0" y1="0" x2="0" y2="1">` +
            `<stop offset="0" stop-color="#fff" stop-opacity=".22"/>` +
            `<stop offset=".55" stop-color="#fff" stop-opacity="0"/>` +
            `<stop offset="1" stop-color="#000" stop-opacity=".18"/>` +
            `</linearGradient></defs>` +
            `<rect width="1600" height="1000" fill="${ink.bg}"/>` +
            `<g transform="rotate(-22 800 500)">${bars}</g>` +
            `<rect width="1600" height="1000" fill="url(#rf)"/>`,
        );
      }
      if (id === 'grid') {
        return svgDoc(
          `<defs><pattern id="gg" width="80" height="80" patternUnits="userSpaceOnUse">` +
            `<path d="M80 0H0V80" fill="none" stroke="${ink.a}" stroke-opacity=".26" stroke-width="1"/>` +
            `</pattern>${radial('ggl', ink.b)}</defs>` +
            `<rect width="1600" height="1000" fill="${ink.bg}"/>` +
            `<rect width="1600" height="1000" fill="url(#gg)"/>` +
            `<circle cx="1240" cy="260" r="460" fill="url(#ggl)"/>` +
            `<rect x="130" y="640" width="380" height="220" rx="30" fill="${ink.c}" opacity=".2"/>` +
            `<rect x="230" y="700" width="380" height="220" rx="30" fill="${ink.d}" opacity=".14"/>`,
        );
      }
      // mesh
      return svgDoc(
        `<defs>${radial('m1', ink.a)}${radial('m2', ink.b)}${radial('m3', ink.c)}${radial('m4', ink.d)}</defs>` +
          `<rect width="1600" height="1000" fill="${ink.bg}"/>` +
          `<circle cx="260" cy="200" r="520" fill="url(#m1)"/>` +
          `<circle cx="1270" cy="180" r="460" fill="url(#m2)"/>` +
          `<circle cx="980" cy="800" r="520" fill="url(#m3)"/>` +
          `<circle cx="140" cy="880" r="420" fill="url(#m4)"/>` +
          `<circle cx="760" cy="520" r="300" fill="url(#m2)" opacity=".5"/>`,
      );
    }

    function wallpaperUrl(id, scheme) {
      const svg = wallpaperSvg(WALLPAPERS.some((item) => item.id === id) ? id : 'mesh', scheme);
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    }

    /* ---------------------------------------------------------------- *
     * Config normalisation + layer composition.
     * ---------------------------------------------------------------- */

    function normalizeUpload(value) {
      if (!value || typeof value !== 'object') return null;
      if (typeof value.url !== 'string' || !value.url.startsWith(`${IMAGE_API}?`)) return null;
      return {
        url: value.url,
        ext: typeof value.ext === 'string' ? value.ext : '',
        mime: typeof value.mime === 'string' ? value.mime : '',
        bytes: Number(value.bytes) || 0,
        animated: Boolean(value.animated),
      };
    }

    function normalize(input, fallback = DEFAULTS) {
      const source = typeof input === 'object' && input !== null ? input : {};
      let mode = MODES.includes(source.mode) ? source.mode : null;
      if (mode === null) {
        if (source.enabled === false || source.preset === 'none') mode = 'none';
        else if (source.preset !== undefined) mode = 'gradient';
        else mode = fallback.mode;
      }
      return {
        enabled: mode !== 'none',
        mode,
        preset: PRESETS.some((preset) => preset.id === source.preset) ? source.preset : fallback.preset,
        intensity:
          source.intensity === undefined
            ? fallback.intensity
            : clamp(Math.round(Number(source.intensity) || 0), 0, 100),
        solid: /^#[0-9a-f]{6}$/i.test(source.solid) ? source.solid.toUpperCase() : fallback.solid,
        wallpaper: WALLPAPERS.some((item) => item.id === source.wallpaper)
          ? source.wallpaper
          : fallback.wallpaper,
        dim: source.dim === undefined ? fallback.dim : clamp(Math.round(Number(source.dim) || 0), 0, 100),
        animate: typeof source.animate === 'boolean' ? source.animate : fallback.animate,
        upload: source.upload === undefined ? fallback.upload ?? null : normalizeUpload(source.upload),
      };
    }

    function backgroundLayers(config, scheme, stillUrl) {
      const base = scheme === DARK_SCHEME ? DARK_BASE : LIGHT_BASE;
      const scrim = rgba(base, scrimAlpha(scheme, config.dim));
      const scrimLayer = `linear-gradient(${scrim}, ${scrim})`;
      if (config.mode === 'gradient') {
        return gradientFor(presetById(config.preset), scheme, config.intensity);
      }
      if (config.mode === 'solid') {
        return `${scrimLayer}, linear-gradient(${config.solid}, ${config.solid})`;
      }
      if (config.mode === 'wallpaper') {
        return `${scrimLayer}, ${wallpaperUrl(config.wallpaper, scheme)}`;
      }
      if (config.mode === 'upload') {
        const url = stillUrl || config.upload?.url;
        return url ? `${scrimLayer}, url("${url}")` : scrimLayer;
      }
      return 'none';
    }

    function themeScheme(snapshot) {
      return snapshot?.active?.colorScheme === 'dark' ? 'dark' : 'light';
    }

    /* ---------------------------------------------------------------- *
     * Browser helpers.
     * ---------------------------------------------------------------- */

    function installStyle(ctx, id, css) {
      const tag = document.createElement('style');
      tag.dataset.plugin = NS;
      tag.dataset.pluginCss = id;
      tag.textContent = css;
      document.head.append(tag);
      ctx.effect(() => () => tag.remove(), `dsh-bg-gradient: style ${id}`);
      return tag;
    }

    function supportsHas() {
      try {
        return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' &&
          CSS.supports('selector(:has(*))');
      } catch {
        return false;
      }
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error('read failed'));
        reader.readAsDataURL(file);
      });
    }

    function formatBytes(bytes) {
      if (!bytes) return '0 KB';
      if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function loadImageElement(url) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('image decode failed'));
        image.src = url;
      });
    }

    /**
     * Decode the first frame of an animated GIF/WebP into a still data URL.
     * `createImageBitmap` gives the first frame; the <img> + canvas path is the
     * fallback for browsers that lack it.
     */
    async function firstFrame(blob) {
      const canvas = document.createElement('canvas');
      const max = 1600;
      if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(blob);
        const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();
        return canvas.toDataURL('image/jpeg', 0.85);
      }
      const objectUrl = URL.createObjectURL(blob);
      try {
        const image = await loadImageElement(objectUrl);
        const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }

    /* ---------------------------------------------------------------- *
     * React hooks.
     * ---------------------------------------------------------------- */

    function useScheme(ctx) {
      const [scheme, setScheme] = React.useState(() => themeScheme(ctx.theme.getTheme()));
      React.useEffect(() => {
        const off = ctx.on('theme/change', (snapshot) => setScheme(themeScheme(snapshot)));
        return () => {
          if (typeof off === 'function') off();
        };
      }, []);
      return scheme;
    }

    function useLocaleRevision(ctx) {
      const [, setRevision] = React.useState(0);
      React.useEffect(() => {
        if (!ctx.locale?.subscribe) return undefined;
        return ctx.locale.subscribe(() => setRevision((value) => value + 1));
      }, []);
    }

    /* ---------------------------------------------------------------- *
     * Settings row.
     * ---------------------------------------------------------------- */

    function BackgroundRow({ ctx, t, onChange }) {
      const scheme = useScheme(ctx);
      useLocaleRevision(ctx);

      const [config, setConfig] = React.useState(null);
      const [error, setError] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [dragging, setDragging] = React.useState(false);
      const configRef = React.useRef(null);
      const inputRef = React.useRef(null);
      const writeTimer = React.useRef(0);

      React.useEffect(() => {
        let cancelled = false;
        fetch(API, { credentials: 'same-origin' })
          .then((response) =>
            response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)),
          )
          .then((value) => {
            if (cancelled) return;
            const next = normalize(value);
            configRef.current = next;
            setConfig(next);
            onChange(next);
          })
          .catch((cause) => {
            if (!cancelled) setError(String(cause?.message ?? cause));
          });
        return () => {
          cancelled = true;
          window.clearTimeout(writeTimer.current);
        };
      }, []);

      const persist = React.useCallback((next, delay = 0) => {
        window.clearTimeout(writeTimer.current);
        writeTimer.current = window.setTimeout(() => {
          fetch(API, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: next.mode,
              preset: next.preset,
              intensity: next.intensity,
              solid: next.solid,
              wallpaper: next.wallpaper,
              dim: next.dim,
              animate: next.animate,
            }),
          })
            .then((response) => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.json();
            })
            .catch((cause) => setError(t('error.generic')));
        }, delay);
      }, []);

      const commit = React.useCallback((patch, delay = 0) => {
        const current = configRef.current;
        if (!current) return;
        const next = normalize({ ...current, ...patch }, current);
        configRef.current = next;
        setConfig(next);
        setError(null);
        onChange(next);
        persist(next, delay);
      }, []);

      const uploadFile = React.useCallback(async (file) => {
        if (!file) return;
        if (!ACCEPT_TYPES.includes(file.type)) {
          setError(t('error.badType'));
          return;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          setError(t('error.tooLarge'));
          return;
        }
        setBusy(true);
        setError(null);
        try {
          const dataUrl = await readFileAsDataUrl(file);
          const response = await fetch(IMAGE_API, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.upload) {
            const code = payload?.code;
            const key =
              code === 'too-large'
                ? 'error.tooLarge'
                : code === 'bad-type'
                  ? 'error.badType'
                  : code === 'io'
                    ? 'error.io'
                    : 'error.badImage';
            throw new Error(t(key));
          }
          commit({ mode: 'upload', upload: payload.upload, animate: true });
        } catch (cause) {
          const message = String(cause?.message ?? '');
          setError(message && !message.startsWith('HTTP') ? message : t('error.generic'));
        } finally {
          setBusy(false);
          setDragging(false);
        }
      }, []);

      const removeUpload = React.useCallback(async () => {
        setBusy(true);
        try {
          await fetch(IMAGE_API, { method: 'DELETE', credentials: 'same-origin' });
          commit({ mode: 'gradient', upload: null });
        } catch {
          setError(t('error.generic'));
        } finally {
          setBusy(false);
        }
      }, []);

      if (config === null) {
        return h(
          'div',
          { className: 'dcb-row' },
          h('div', { className: 'dcb-title' }, t('title')),
          h('p', { className: 'dcb-hint' }, error ? t('unavailable', { message: error }) : t('loading')),
        );
      }

      const mode = config.mode;
      const off = !config.enabled || mode === 'none';
      const preset = presetById(config.preset);
      const wallpaper = WALLPAPERS.find((item) => item.id === config.wallpaper) ?? WALLPAPERS[0];
      const upload = config.upload;
      const uploadDetail = upload
        ? t('upload.detail', {
            type: upload.ext ? upload.ext.toUpperCase() : 'IMG',
            size: formatBytes(upload.bytes),
          })
        : t('upload.empty');

      const hint =
        mode === 'gradient'
          ? t('hint.gradient', { preset: t(preset.labelKey), strength: config.intensity })
          : mode === 'solid'
            ? t('hint.solid')
            : mode === 'wallpaper'
              ? t('hint.wallpaper', { name: t(wallpaper.labelKey) })
              : mode === 'upload'
                ? t('hint.upload', { detail: upload ? uploadDetail : t('upload.empty') })
                : t('hint.none');

      const modeSwatch = (id) => {
        if (id === 'none') return 'none';
        if (id === 'gradient') return gradientFor(preset, scheme, config.intensity);
        if (id === 'solid') return `linear-gradient(${config.solid}, ${config.solid})`;
        if (id === 'wallpaper') return wallpaperUrl(config.wallpaper, scheme);
        return upload ? `url("${upload.url}")` : 'none';
      };

      const selectMode = (id) => {
        if (id === config.mode) return;
        if (id === 'upload' && !upload) {
          commit({ mode: 'upload' });
          inputRef.current?.click();
          return;
        }
        commit({ mode: id });
      };

      const panel = [];
      if (mode === 'gradient') {
        panel.push(
          h(
            'div',
            { className: 'dcb-chips', role: 'group', 'aria-label': t('group.preset') },
            PRESETS.map((item) =>
              h(
                'button',
                {
                  key: item.id,
                  type: 'button',
                  className: 'dcb-chip',
                  'aria-pressed': config.preset === item.id,
                  onClick: () => commit({ preset: item.id }),
                },
                h('span', {
                  className: 'dcb-swatch',
                  'aria-hidden': 'true',
                  style: { backgroundImage: gradientFor(item, scheme, 100) },
                }),
                h(
                  'span',
                  { className: 'dcb-chipLabel' },
                  h('span', null, t(item.labelKey)),
                  h('small', null, t(item.hintKey)),
                ),
              ),
            ),
          ),
          h(
            'div',
            { className: 'dcb-controls' },
            h('label', { className: 'dcb-hint', htmlFor: 'dcb-intensity' }, t('strength')),
            h('input', {
              id: 'dcb-intensity',
              className: 'dcb-slider',
              type: 'range',
              min: 0,
              max: 100,
              step: 5,
              value: config.intensity,
              'aria-valuetext': `${config.intensity}%`,
              onChange: (event) => commit({ intensity: Number(event.target.value) }, 250),
            }),
            h('span', { className: 'dcb-value' }, `${config.intensity}%`),
          ),
        );
      }

      if (mode === 'solid') {
        panel.push(
          h(
            'div',
            { className: 'dcb-solidRow' },
            h('input', {
              className: 'dcb-color',
              type: 'color',
              value: config.solid,
              'aria-label': t('solid.custom'),
              onChange: (event) => commit({ solid: String(event.target.value).toUpperCase() }, 250),
            }),
            h(
              'div',
              { className: 'dcb-swatches', role: 'group', 'aria-label': t('solid.custom') },
              SOLIDS.map((item) =>
                h('button', {
                  key: item.id,
                  type: 'button',
                  className: 'dcb-swatchBtn',
                  title: item.id,
                  'aria-label': item.id,
                  'aria-pressed': config.solid.toUpperCase() === item.hex,
                  style: { background: item.hex },
                  onClick: () => commit({ solid: item.hex }),
                }),
              ),
            ),
          ),
        );
      }

      if (mode === 'wallpaper') {
        panel.push(
          h(
            'div',
            { className: 'dcb-walls', role: 'group', 'aria-label': t('mode.wallpaper') },
            WALLPAPERS.map((item) =>
              h(
                'button',
                {
                  key: item.id,
                  type: 'button',
                  className: 'dcb-wall',
                  'aria-pressed': config.wallpaper === item.id,
                  onClick: () => commit({ wallpaper: item.id }),
                },
                h('span', {
                  className: 'dcb-wallArt',
                  'aria-hidden': 'true',
                  style: { backgroundImage: wallpaperUrl(item.id, scheme) },
                }),
                h('span', null, t(item.labelKey)),
              ),
            ),
          ),
        );
      }

      if (mode === 'upload') {
        panel.push(
          h(
            'div',
            { className: 'dcb-upload' },
            h(
              'div',
              {
                className: 'dcb-drop',
                'data-over': dragging ? 'true' : undefined,
                onDragOver: (event) => {
                  event.preventDefault();
                  setDragging(true);
                },
                onDragLeave: () => setDragging(false),
                onDrop: (event) => {
                  event.preventDefault();
                  setDragging(false);
                  void uploadFile(event.dataTransfer?.files?.[0]);
                },
              },
              h('span', {
                className: 'dcb-preview',
                'aria-hidden': 'true',
                style: upload ? { backgroundImage: `url("${upload.url}")` } : undefined,
              }),
              h(
                'div',
                { className: 'dcb-dropText' },
                h('p', { className: 'dcb-hint' }, upload ? uploadDetail : t('upload.empty')),
                h(
                  'div',
                  { className: 'dcb-uploadMeta' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dcb-btn',
                      disabled: busy,
                      onClick: () => inputRef.current?.click(),
                    },
                    busy ? t('upload.busy') : upload ? t('upload.replace') : t('upload.choose'),
                  ),
                  upload
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: 'dcb-btn',
                          disabled: busy,
                          onClick: () => void removeUpload(),
                        },
                        t('upload.remove'),
                      )
                    : null,
                ),
              ),
            ),
            upload?.animated
              ? h(
                  'label',
                  { className: 'dcb-check' },
                  h('input', {
                    type: 'checkbox',
                    checked: config.animate,
                    onChange: (event) => commit({ animate: event.target.checked }),
                  }),
                  h('span', null, t('upload.animate')),
                  h('span', { className: 'dcb-hint' }, '·'),
                  h('span', { className: 'dcb-hint' }, t('upload.animateHint')),
                )
              : null,
          ),
        );
      }

      if (mode === 'solid' || mode === 'wallpaper' || mode === 'upload') {
        panel.push(
          h(
            'div',
            { className: 'dcb-controls' },
            h('label', { className: 'dcb-hint', htmlFor: 'dcb-dim' }, t('dim')),
            h('input', {
              id: 'dcb-dim',
              className: 'dcb-slider',
              type: 'range',
              min: 0,
              max: 100,
              step: 5,
              value: config.dim,
              'aria-valuetext': `${config.dim}%`,
              onChange: (event) => commit({ dim: Number(event.target.value) }, 250),
            }),
            h('span', { className: 'dcb-value' }, `${config.dim}%`),
          ),
          h('p', { className: 'dcb-hint' }, t('dimHint')),
        );
      }

      return h(
        'div',
        { className: off ? 'dcb-row dcb-off' : 'dcb-row' },
        h(
          'div',
          { className: 'dcb-head' },
          h('div', { className: 'dcb-title' }, t('title')),
          h('p', { className: 'dcb-hint' }, hint),
        ),
        h(
          'div',
          { className: 'dcb-modes', role: 'group', 'aria-label': t('group.mode') },
          MODES.map((id) =>
            h(
              'button',
              {
                key: id,
                type: 'button',
                className: 'dcb-mode',
                'aria-pressed': mode === id,
                onClick: () => selectMode(id),
              },
              h('span', {
                className: 'dcb-mini',
                'aria-hidden': 'true',
                style: { backgroundImage: modeSwatch(id) },
              }),
              h('span', null, t(`mode.${id}`)),
            ),
          ),
        ),
        panel.length ? h('div', { className: 'dcb-panel' }, panel) : null,
        error ? h('p', { className: 'dcb-error', role: 'alert' }, error) : null,
        h(
          'button',
          {
            type: 'button',
            className: 'dcb-btn dcb-reset',
            onClick: () => commit(DEFAULTS, 0),
          },
          t('reset'),
        ),
        h('input', {
          ref: inputRef,
          type: 'file',
          accept: ACCEPT_TYPES.join(','),
          style: { display: 'none' },
          onChange: (event) => {
            void uploadFile(event.target.files?.[0]);
            event.target.value = '';
          },
        }),
      );
    }

    return {
      inject: ['slots', 'theme', 'locale'],
      /* Exposed for the offline preview/test harness only; the loader ignores it. */
      __preview: {
        DEFAULTS,
        PRESETS,
        SOLIDS,
        WALLPAPERS,
        LIGHT_BASE,
        DARK_BASE,
        ACCENT_TOKENS,
        backgroundLayers,
        baseAlpha,
        gradientFor,
        normalize,
        scrimAlpha,
        wallpaperSvg,
        wallpaperUrl,
      },
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
      ctx.effect(() => {
        const disposers = Object.entries(DICTS).map(([locale, dict]) =>
          ctx.locale.register(NS, locale, dict),
        );
        return () => disposers.forEach((dispose) => dispose());
      }, 'dsh-bg-gradient: locale');

      installStyle(ctx, 'background', BACKGROUND_CSS);
      installStyle(ctx, 'row', ROW_CSS);

      const root = document.documentElement;
      const body = document.body;
      let tokenLayer = null;
      let current = DEFAULTS;
      let scheme = 'light';
      let reducedMotion = false;
      let stillUrl = null;
      let stillKey = null;
      let stillRequest = 0;
      let disposed = false;

      const canHas = supportsHas();
      if (body.classList && !canHas) body.classList.add('dcb-global');

      function render() {
        const on = current.enabled && current.mode !== 'none';
        if (!on) {
          body.removeAttribute('data-dcb');
          root.style.removeProperty('--dcb-layers');
          root.style.removeProperty('--dcb-base-alpha');
          if (tokenLayer) {
            tokenLayer();
            tokenLayer = null;
          }
          return;
        }
        root.style.setProperty('--dcb-layers', backgroundLayers(current, scheme, stillUrl));
        root.style.setProperty('--dcb-base-alpha', baseAlpha(scheme));
        body.setAttribute('data-dcb', 'on');
        if (!tokenLayer) tokenLayer = ctx.theme.overrideTokens('dsh-bg-gradient', accentLayer());
      }

      /** Decode a still frame only when an animated upload must not move. */
      function refreshStill() {
        const upload = current.upload;
        const needed =
          current.mode === 'upload' &&
          Boolean(upload) &&
          upload.animated &&
          (!current.animate || reducedMotion);
        if (!needed) {
          if (stillUrl !== null || stillKey !== null) {
            stillUrl = null;
            stillKey = null;
            render();
          }
          return;
        }
        const key = `${upload.url}|${current.animate}|${reducedMotion}`;
        if (key === stillKey) return;
        stillKey = key;
        stillUrl = null;
        render();
        const serial = ++stillRequest;
        fetch(upload.url, { credentials: 'same-origin' })
          .then((response) =>
            response.ok ? response.blob() : Promise.reject(new Error(`HTTP ${response.status}`)),
          )
          .then((blob) => firstFrame(blob))
          .then((url) => {
            if (disposed || serial !== stillRequest) return;
            stillUrl = url;
            render();
          })
          .catch(() => {
            if (disposed || serial !== stillRequest) return;
            stillUrl = null;
            render();
          });
      }

      function adopt(value) {
        current = normalize(value, current);
        render();
        refreshStill();
      }

      ctx.effect(() => {
        const off = ctx.on('theme/change', (snapshot) => {
          const next = themeScheme(snapshot);
          if (next === scheme) return;
          scheme = next;
          if (current.enabled && current.mode !== 'none') render();
        });
        scheme = themeScheme(ctx.theme.getTheme());
        return off;
      }, 'dsh-bg-gradient: follow light/dark');

      ctx.effect(() => {
        if (typeof window.matchMedia !== 'function') return undefined;
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => {
          reducedMotion = query.matches;
          adopt(current);
        };
        reducedMotion = query.matches;
        query.addEventListener?.('change', update);
        return () => query.removeEventListener?.('change', update);
      }, 'dsh-bg-gradient: follow reduced motion');

      ctx.effect(() => {
        let cancelled = false;
        render();
        fetch(API, { credentials: 'same-origin' })
          .then((response) =>
            response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)),
          )
          .then((value) => {
            if (!cancelled) adopt(value);
          })
          .catch(() => {
            if (!cancelled) adopt(DEFAULTS);
          });
        return () => {
          cancelled = true;
          disposed = true;
          current = DEFAULTS;
          stillUrl = null;
          stillKey = null;
          body.removeAttribute('data-dcb');
          body.classList?.remove('dcb-global');
          root.style.removeProperty('--dcb-layers');
          root.style.removeProperty('--dcb-base-alpha');
          if (tokenLayer) {
            tokenLayer();
            tokenLayer = null;
          }
        };
      }, 'dsh-bg-gradient: chat background');

      ctx.slots.inject('settings.general.item', () =>
        ctx.slots.register(
          {
            name: 'settings.general.item',
            id: 'background',
            order: 12,
            label: () => ctx.locale.bind(NS)('title'),
          },
          () => {
            const t = ctx.locale.bind(NS);
            return h(BackgroundRow, { ctx, t, onChange: adopt });
          },
        ),
      );
    }
  },
});
