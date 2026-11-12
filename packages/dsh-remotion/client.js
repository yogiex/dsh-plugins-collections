window.__ModuleLoader__.load({
  id: '@local/dsh-remotion',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'remotion';
    const API = '/dsh-remotion/api';
    const STYLE_ID = 'dsh-remotion-style';

    /* ------------------------------------------------------------------ *
     * Dictionaries
     * ------------------------------------------------------------------ */

    const en = {
      'view.title': 'Remotion',
      'view.subtitle': 'React video rendering studio',
      'status.ready': 'Chrome detected',
      'status.managed': 'Managed Chrome',
      'status.busy': 'Rendering {percent}%',
      'status.preparing': 'Preparing…',
      'action.render': 'Render video',
      'action.again': 'Render again',
      'action.refresh': 'Refresh',
      'action.open': 'Open',
      'meta.frames': '{frames} frames',
      'meta.seconds': '{seconds} s',
      'meta.composition': 'Composition',
      'section.renders': 'Renders',
      'section.composition': 'Composition',
      'renders.empty': 'No renders in this workspace yet. Hit Render video to produce the first one.',
      'renders.sample': 'Bundled sample',
      'state.loading': 'Loading the studio…',
      'state.errorTitle': 'The Remotion host is unreachable',
      'state.errorBody': 'The /dsh-remotion endpoint did not answer. Reload the page or restart the bundle.',
      'render.preparing': 'Bundling the project and starting Chrome — the first render takes a few extra seconds…',
      'render.failed': 'Render failed',
      'render.done': 'Render finished',
      'render.busy': 'Another render is already running.',
      'prompt.label': 'Prompt',
      'prompt.default': 'Type a prompt, press Render, and watch it become a video.',
      'prompt.placeholder': 'Describe the clip you want to see…',
      'prompt.hint': 'Prompt text is rendered into the video as kinetic type; the accents follow the words.',
      'prompt.caption': 'Rendered from prompt',
      'prompt.empty': 'Write a prompt before rendering.',
      'prompt.count': '{count} characters',
      'footer.note': 'Renders run on the DSH host with your local Chrome and are written to the remotion folder inside the session workspace. This list follows that folder.',
      'composition.unknown': 'Sample composition',
      'composition.loading': 'Resolving compositions…',
    };

    const id = {
      'view.title': 'Remotion',
      'view.subtitle': 'Studio render video dari React',
      'status.ready': 'Chrome terdeteksi',
      'status.managed': 'Chrome terkelola',
      'status.busy': 'Merender {percent}%',
      'status.preparing': 'Menyiapkan…',
      'action.render': 'Render video',
      'action.again': 'Render ulang',
      'action.refresh': 'Segarkan',
      'action.open': 'Buka',
      'meta.frames': '{frames} frame',
      'meta.seconds': '{seconds} dtk',
      'meta.composition': 'Komposisi',
      'section.renders': 'Hasil render',
      'section.composition': 'Komposisi',
      'renders.empty': 'Belum ada hasil render di workspace ini. Tekan Render video untuk membuat yang pertama.',
      'renders.sample': 'Contoh bawaan',
      'state.loading': 'Memuat studio…',
      'state.errorTitle': 'Host Remotion tidak dapat dihubungi',
      'state.errorBody': 'Endpoint /dsh-remotion tidak merespons. Muat ulang halaman atau jalankan ulang bundle.',
      'render.preparing': 'Membundel proyek dan menyalakan Chrome — render pertama butuh beberapa detik tambahan…',
      'render.failed': 'Render gagal',
      'render.done': 'Render selesai',
      'render.busy': 'Render lain sedang berjalan.',
      'prompt.label': 'Prompt',
      'prompt.default': 'Tulis prompt, tekan Render, lalu lihat hasilnya jadi video.',
      'prompt.placeholder': 'Ceritakan video yang ingin kamu lihat…',
      'prompt.hint': 'Teks prompt dirender jadi kinetic type; warna aksennya mengikuti isi prompt.',
      'prompt.caption': 'Dirender dari prompt',
      'prompt.empty': 'Tulis prompt dulu sebelum render.',
      'prompt.count': '{count} karakter',
      'footer.note': 'Render berjalan di host DSH memakai Chrome lokal dan ditulis ke folder remotion di dalam workspace sesi. Daftar ini mengikuti folder tersebut.',
      'composition.unknown': 'Komposisi contoh',
      'composition.loading': 'Menyiapkan komposisi…',
    };

    const zh = {
      'view.title': 'Remotion',
      'view.subtitle': 'React 视频渲染工作室',
      'status.ready': '已检测到 Chrome',
      'status.managed': '托管 Chrome',
      'status.busy': '渲染中 {percent}%',
      'status.preparing': '准备中…',
      'action.render': '渲染视频',
      'action.again': '再次渲染',
      'action.refresh': '刷新',
      'action.open': '打开',
      'meta.frames': '{frames} 帧',
      'meta.seconds': '{seconds} 秒',
      'meta.composition': '合成',
      'section.renders': '渲染结果',
      'section.composition': '合成',
      'renders.empty': '还没有渲染结果。点击“渲染视频”生成第一个。',
      'renders.sample': '内置示例',
      'state.loading': '正在加载工作室…',
      'state.errorTitle': '无法连接 Remotion 主机',
      'state.errorBody': '/dsh-remotion 端点没有响应。请刷新页面或重启该 bundle。',
      'render.preparing': '正在打包项目并启动 Chrome，首次渲染会多等几秒…',
      'render.failed': '渲染失败',
      'render.done': '渲染完成',
      'render.busy': '已有另一个渲染在运行。',
      'prompt.label': '提示词',
      'prompt.default': '写下提示词，点击渲染，然后看它变成视频。',
      'prompt.placeholder': '描述你想要的画面…',
      'prompt.hint': '提示词会作为动态文字渲染进视频，配色由文字决定。',
      'prompt.caption': '渲染自提示词',
      'prompt.empty': '请先填写提示词。',
      'prompt.count': '{count} 个字符',
      'footer.note': '渲染在 DSH 主机上使用本地 Chrome 运行，结果写入会话 workspace 内的 remotion 文件夹。此列表跟随该文件夹。',
      'composition.unknown': '示例合成',
      'composition.loading': '正在解析合成…',
    };

    /* ------------------------------------------------------------------ *
     * Helpers
     * ------------------------------------------------------------------ */

    function formatSize(bytes) {
      const value = typeof bytes === 'number' && Number.isFinite(bytes) ? bytes : 0;
      if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
      if (value >= 1024) return `${Math.round(value / 1024)} KB`;
      return `${value} B`;
    }

    function formatTime(iso) {
      if (typeof iso !== 'string' || iso.length === 0) return '';
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return '';
      try {
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      } catch {
        return date.toISOString().slice(11, 16);
      }
    }

    async function api(path, options) {
      const response = await fetch(`${API}${path}`, {
        headers: { 'content-type': 'application/json' },
        ...options,
      });
      let payload;
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }
      if (!response.ok) {
        const error = new Error(payload.error ?? `HTTP ${response.status}`);
        error.payload = payload;
        throw error;
      }
      return payload;
    }

    /* ------------------------------------------------------------------ *
     * Artwork
     * ------------------------------------------------------------------ */

    function StudioMark({ size }) {
      return h(
        'svg',
        { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', 'aria-hidden': true, focusable: 'false' },
        h('rect', { x: 2.4, y: 4.6, width: 19.2, height: 14.8, rx: 3.2, stroke: 'currentColor', strokeWidth: 1.5 }),
        h('path', { d: 'M10.1 9.4v5.2l4.4-2.6z', fill: 'currentColor' }),
        h('path', { d: 'M2.4 8.6h19.2M6.4 8.6v10.8M17.6 8.6v10.8', stroke: 'currentColor', strokeWidth: 1.1, opacity: 0.45 }),
      );
    }

    function EmptyArt() {
      return h(
        'svg',
        { className: 'dsr-emptyArt', viewBox: '0 0 120 56', width: 120, height: 56, fill: 'none', 'aria-hidden': true },
        h('rect', { x: 12, y: 12, width: 96, height: 32, rx: 6, stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1.2 }),
        h('path', { d: 'M56 22.5v11l9.6-5.5z', fill: 'var(--dsw-alias-brand-primary)', opacity: 0.75 }),
      );
    }

    /* ------------------------------------------------------------------ *
     * Page
     * ------------------------------------------------------------------ */

    function createPage(boundT) {
      function RemotionPage(props) {
        const t = typeof props.t === 'function' ? props.t : boundT;
        const [state, setState] = React.useState(undefined);
        const [loadError, setLoadError] = React.useState(undefined);
        const [compositions, setCompositions] = React.useState(undefined);
        const [job, setJob] = React.useState(undefined);
        const [actionError, setActionError] = React.useState(undefined);
        const [starting, setStarting] = React.useState(false);
        const [picked, setPicked] = React.useState(undefined);
        const [prompt, setPrompt] = React.useState(() => t('prompt.default'));
        const alive = React.useRef(true);

        React.useEffect(() => {
          alive.current = true;
          return () => {
            alive.current = false;
          };
        }, []);

        const refresh = React.useCallback(async () => {
          try {
            const next = await api('/state');
            if (!alive.current) return;
            setState(next);
            setLoadError(undefined);
            if (next.job !== null && next.job !== undefined) setJob(next.job);
          } catch (error) {
            if (!alive.current) return;
            setLoadError(error?.message ?? String(error));
          }
        }, []);

        React.useEffect(() => {
          refresh();
        }, [refresh]);

        React.useEffect(() => {
          if (picked === undefined) return;
          const rows = state?.renders ?? [];
          if (!rows.some((row) => row.url === picked)) setPicked(undefined);
        }, [state, picked]);

        React.useEffect(() => {
          let disposed = false;
          api('/compositions')
            .then((payload) => {
              if (!disposed) setCompositions(payload.compositions);
            })
            .catch(() => {
              if (!disposed) setCompositions([]);
            });
          return () => {
            disposed = true;
          };
        }, []);

        const running = job !== undefined && job !== null && job.status === 'running';
        React.useEffect(() => {
          if (!running) return undefined;
          const timer = setInterval(async () => {
            try {
              const payload = await api(`/job?id=${encodeURIComponent(job.id)}`);
              if (!alive.current) return;
              setJob(payload.job);
              if (payload.job.status !== 'running') refresh();
            } catch {
              /* keep polling until the host answers or the job settles */
            }
          }, 900);
          return () => clearInterval(timer);
        }, [running, job?.id, refresh]);

        const startRender = React.useCallback(async () => {
          const trimmed = prompt.trim();
          if (trimmed.length === 0) {
            setActionError(t('prompt.empty'));
            return;
          }
          setStarting(true);
          setActionError(undefined);
          setPicked(undefined);
          try {
            const payload = await api('/render', {
              method: 'POST',
              body: JSON.stringify({ compositionId: 'PromptVideo', format: 'mp4', prompt: trimmed }),
            });
            if (!alive.current) return;
            setJob(payload.job);
          } catch (error) {
            if (!alive.current) return;
            setActionError(
              error?.payload?.job !== undefined && error.payload.job !== null
                ? t('render.busy')
                : error?.message ?? String(error),
            );
          } finally {
            if (alive.current) setStarting(false);
          }
        }, [prompt, t]);

        const composition =
          compositions === undefined
            ? undefined
            : compositions.find((item) => item.id === (job?.composition?.id ?? job?.compositionId ?? 'PromptVideo')) ??
              compositions[0];
        const renders = state?.renders ?? [];
        const latestRender = renders.find((row) => row.sample !== true);
        const pickedRender = picked === undefined ? undefined : renders.find((row) => row.url === picked);
        const source =
          pickedRender?.url ??
          (running || job?.status === 'done'
            ? job?.url ?? latestRender?.url ?? renders[0]?.url
            : latestRender?.url ?? renders[0]?.url);
        const busy = running || starting;
        const percent = job?.progress !== undefined ? Math.round(job.progress * 100) : 0;
        const statusText = loadError !== undefined
          ? t('status.managed')
          : busy
            ? percent === 0
              ? t('status.preparing')
              : t('status.busy', { percent })
            : state?.browser?.detected === false
              ? t('status.managed')
              : t('status.ready');

        let body;
        if (loadError !== undefined) {
          body = h(
            'div',
            { className: 'dsr-error', role: 'alert' },
            h('span', { className: 'dsr-errorTitle' }, t('state.errorTitle')),
            h('span', { className: 'dsr-errorBody' }, t('state.errorBody')),
            h('button', { type: 'button', className: 'dsr-btn', onClick: refresh }, t('action.refresh')),
          );
        } else if (state === undefined) {
          body = h(
            'div',
            { className: 'dsr-loading', role: 'status', 'aria-live': 'polite' },
            h('span', { className: 'dsr-spinner', 'aria-hidden': true }),
            h('span', null, t('state.loading')),
          );
        } else {
          body = [
            h(
              'div',
              { className: 'dsr-stage', key: 'stage' },
              source === undefined
                ? h(
                    'div',
                    { className: 'dsr-stageEmpty' },
                    h(EmptyArt),
                    h('span', { className: 'dsr-stageEmptyText' }, t('renders.empty')),
                  )
                : h('video', {
                    key: source,
                    className: 'dsr-video',
                    src: source,
                    controls: true,
                    autoPlay: true,
                    muted: true,
                    loop: true,
                    playsInline: true,
                    preload: 'metadata',
                  }),
              running
                ? h(
                    'div',
                    { className: 'dsr-progressOverlay', role: 'status', 'aria-live': 'polite' },
                    h(
                      'div',
                      { className: 'dsr-progressTrack' },
                      h('div', { className: 'dsr-progressFill', style: { width: `${percent}%` } }),
                    ),
                    h('span', { className: 'dsr-progressText' }, percent === 0 ? t('render.preparing') : `${percent}%`),
                  )
                : null,
            ),
            job?.prompt === undefined || job.prompt === null
              ? null
              : h(
                  'div',
                  { className: 'dsr-promptCaption', key: 'caption' },
                  h('span', { className: 'dsr-promptCaptionLabel' }, t('prompt.caption')),
                  h('span', { className: 'dsr-promptCaptionText' }, job.prompt),
                ),
            h(
              'div',
              { className: 'dsr-promptCard', key: 'prompt' },
              h(
                'div',
                { className: 'dsr-promptHead' },
                h('label', { className: 'dsr-promptLabel', htmlFor: 'dsr-prompt-input' }, t('prompt.label')),
                h('span', { className: 'dsr-promptCount' }, t('prompt.count', { count: prompt.length })),
              ),
              h('textarea', {
                id: 'dsr-prompt-input',
                className: 'dsr-promptInput',
                value: prompt,
                rows: 3,
                spellCheck: false,
                placeholder: t('prompt.placeholder'),
                onChange: (event) => setPrompt(event.target.value),
                onKeyDown: (event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !busy) {
                    event.preventDefault();
                    startRender();
                  }
                },
              }),
              h(
                'div',
                { className: 'dsr-promptFoot' },
                h('span', { className: 'dsr-promptHint' }, t('prompt.hint')),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsr-btn dsr-btnPrimary',
                    onClick: startRender,
                    disabled: busy || prompt.trim().length === 0,
                    'aria-busy': busy ? 'true' : 'false',
                  },
                  busy
                    ? percent === 0
                      ? t('status.preparing')
                      : t('status.busy', { percent })
                    : t('action.render'),
                ),
              ),
            ),
            h(
              'div',
              { className: 'dsr-metaRow', key: 'meta' },
              h(
                'div',
                { className: 'dsr-meta' },
                h('span', { className: 'dsr-metaName' }, composition?.id ?? 'PromptVideo'),
                h(
                  'span',
                  { className: 'dsr-metaFacts' },
                  composition === undefined
                    ? t('composition.loading')
                    : [
                        `${composition.width}×${composition.height}`,
                        `${composition.fps} fps`,
                        t('meta.frames', { frames: composition.durationInFrames }),
                        t('meta.seconds', { seconds: composition.durationInSeconds }),
                      ].join(' · '),
                ),
              ),
              h(
                'div',
                { className: 'dsr-actions' },
                source === undefined
                  ? null
                  : h(
                      'a',
                      { className: 'dsr-btn', href: source, target: '_blank', rel: 'noreferrer' },
                      t('action.open'),
                    ),
              ),
            ),
            actionError === undefined
              ? null
              : h(
                  'div',
                  { className: 'dsr-notice dsr-noticeError', key: 'error', role: 'alert' },
                  h('span', null, actionError),
                ),
            h(
              'section',
              { className: 'dsr-section', key: 'renders' },
              h(
                'div',
                { className: 'dsr-sectionHead' },
                h('h3', { className: 'dsr-sectionTitle' }, t('section.renders')),
                h('span', { className: 'dsr-sectionCount' }, String(renders.length)),
              ),
              state?.workspace === undefined
                ? null
                : h('p', { className: 'dsr-path', title: state.workspace }, state.workspace),
              renders.length === 0
                ? h('p', { className: 'dsr-emptyText' }, t('renders.empty'))
                : h(
                    'ul',
                    { className: 'dsr-list' },
                    renders.map((row) =>
                      h(
                        'li',
                        { className: picked === row.url ? 'dsr-row dsr-rowSelected' : 'dsr-row', key: row.name },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dsr-rowPick',
                            onClick: () => setPicked(row.url),
                            'aria-pressed': picked === row.url ? 'true' : 'false',
                            title: row.name,
                          },
                          h('span', { className: 'dsr-rowGlyph', 'aria-hidden': true }, row.sample ? '◇' : '▶'),
                          h('span', { className: 'dsr-rowName' }, row.name),
                          row.sample
                            ? h('span', { className: 'dsr-tag' }, t('renders.sample'))
                            : h('span', { className: 'dsr-rowMeta' }, `${formatSize(row.size)} · ${formatTime(row.modifiedAt)}`),
                        ),
                        h('a', { className: 'dsr-rowOpen', href: row.url, target: '_blank', rel: 'noreferrer' }, t('action.open')),
                      ),
                    ),
                  ),
            ),
            h('p', { className: 'dsr-foot', key: 'foot' }, t('footer.note')),
          ];
        }

        return h(
          'div',
          { className: 'dsr-page' },
          h(
            'header',
            { className: 'dsr-head' },
            h(
              'div',
              { className: 'dsr-headInner' },
              h('span', { className: 'dsr-headMark', 'aria-hidden': true }, h(StudioMark, { size: 18 })),
              h('h2', { className: 'dsr-title' }, t('view.title')),
              h('span', { className: 'dsr-subtitle' }, t('view.subtitle')),
              h('span', { className: busy ? 'dsr-pill dsr-pillBusy' : 'dsr-pill', role: 'status', 'aria-atomic': 'true' }, statusText),
            ),
          ),
          h('div', { className: 'dsr-content' }, body),
        );
      }

      class Boundary extends React.Component {
        constructor(properties) {
          super(properties);
          this.state = { failed: false };
        }

        static getDerivedStateFromError() {
          return { failed: true };
        }

        componentDidCatch(failure) {
          console.error('dsh-remotion: view crashed', failure);
        }

        render() {
          if (this.state.failed) {
            return h(
              'div',
              { className: 'dsr-page' },
              h(
                'div',
                { className: 'dsr-content' },
                h(
                  'div',
                  { className: 'dsr-error', role: 'alert' },
                  h('span', { className: 'dsr-errorTitle' }, this.props.t('state.errorTitle')),
                  h('span', { className: 'dsr-errorBody' }, this.props.t('state.errorBody')),
                ),
              ),
            );
          }
          return this.props.children;
        }
      }

      function BoundedPage(pageProps) {
        const t = typeof pageProps.t === 'function' ? pageProps.t : boundT;
        return h(Boundary, { t }, h(RemotionPage, pageProps));
      }

      return BoundedPage;
    }

    /* ------------------------------------------------------------------ *
     * Styles
     * ------------------------------------------------------------------ */

    const CSS = `
.dsr-page{display:block;color:var(--dsw-alias-label-primary)}
.dsr-head{border-bottom:1px solid var(--dsw-alias-border-l1)}
.dsr-headInner{display:flex;align-items:center;gap:10px;width:100%;max-width:var(--dsh-chat-content-width,920px);margin:0 auto;padding:13px 24px 12px;box-sizing:border-box;min-width:0}
.dsr-headMark{display:grid;place-items:center;width:26px;height:26px;flex:none;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary)}
.dsr-title{margin:0;flex:none;font-size:15px;line-height:20px;font-weight:600;letter-spacing:-0.01em}
.dsr-subtitle{flex:1;min-width:0;font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsr-pill{display:inline-flex;align-items:center;gap:6px;flex:none;margin-inline-start:auto;padding:3px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:16px;white-space:nowrap;font-variant-numeric:tabular-nums}
.dsr-pillBusy{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 32%,var(--dsw-alias-border-l1));color:var(--dsw-alias-brand-primary)}
.dsr-content{display:flex;flex-direction:column;gap:14px;width:100%;max-width:var(--dsh-chat-content-width,920px);margin:0 auto;padding:20px 24px 32px;box-sizing:border-box}

.dsr-stage{position:relative;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;overflow:hidden;background:#06070c;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center}
.dsr-video{width:100%;height:100%;display:block;object-fit:contain;background:#06070c}
.dsr-stageEmpty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px;text-align:center}
.dsr-stageEmptyText{font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary);max-width:380px}
.dsr-emptyArt{opacity:.9}

.dsr-progressOverlay{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:6px;padding:12px 14px;background:linear-gradient(180deg,transparent,rgba(3,4,8,.86) 55%);color:#f6f7fb}
.dsr-progressTrack{height:3px;border-radius:999px;background:rgba(246,247,251,.18);overflow:hidden}
.dsr-progressFill{height:100%;border-radius:999px;background:linear-gradient(90deg,#7a6cff,#40d6be);transition:width .35s ease-out}
.dsr-progressText{font-size:11.5px;line-height:16px;letter-spacing:.01em;color:rgba(246,247,251,.82);font-variant-numeric:tabular-nums}

.dsr-metaRow{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dsr-meta{display:flex;flex-direction:column;gap:1px;min-width:0}
.dsr-metaName{font-size:13.5px;line-height:19px;font-weight:600}
.dsr-metaFacts{font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dsr-actions{display:flex;align-items:center;gap:8px;flex:none}
.dsr-btn{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:6px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-decoration:none;cursor:pointer;transition:background .12s ease-out,border-color .12s ease-out,opacity .12s ease-out}
.dsr-btn:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.dsr-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsr-btnPrimary{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,var(--dsw-alias-bg-layer-1));font-weight:500}
.dsr-btnPrimary:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 20%,var(--dsw-alias-bg-layer-1))}
.dsr-btn[disabled]{opacity:.6;cursor:progress}

.dsr-promptCard{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
.dsr-promptHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.dsr-promptLabel{font-size:12px;line-height:16px;font-weight:600;letter-spacing:.01em}
.dsr-promptCount{font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dsr-promptInput{width:100%;box-sizing:border-box;min-height:68px;max-height:220px;padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:19px;resize:vertical}
.dsr-promptInput::placeholder{color:var(--dsw-alias-label-secondary)}
.dsr-promptInput:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;border-color:transparent}
.dsr-promptFoot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.dsr-promptHint{flex:1;min-width:160px;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dsr-promptCaption{display:flex;align-items:baseline;gap:8px;padding:0 2px;min-width:0}
.dsr-promptCaptionLabel{flex:none;font-size:10.5px;line-height:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
.dsr-promptCaptionText{min-width:0;font-size:12px;line-height:17px;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.dsr-section{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.dsr-sectionHead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 14px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dsr-sectionTitle{margin:0;font-size:12.5px;line-height:17px;font-weight:600;letter-spacing:.01em}
.dsr-sectionCount{font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dsr-list{list-style:none;margin:0;padding:4px 6px 6px}
.dsr-row{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:8px;min-width:0}
.dsr-row:hover{background:var(--dsw-alias-bg-layer-2)}
.dsr-rowSelected{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent)}
.dsr-rowPick{display:flex;align-items:center;gap:10px;flex:1;min-width:0;padding:0;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:6px}
.dsr-rowPick:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dsr-rowGlyph{width:14px;flex:none;text-align:center;font-size:10px;color:var(--dsw-alias-label-secondary)}
.dsr-rowName{flex:1;min-width:0;font-size:12.5px;line-height:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsr-rowMeta{flex:none;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.dsr-tag{flex:none;padding:1px 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-secondary)}
.dsr-rowOpen{flex:none;font-size:11.5px;line-height:16px;color:var(--dsw-alias-brand-primary);text-decoration:none}
.dsr-rowOpen:hover{text-decoration:underline}
.dsr-emptyText{margin:0;padding:14px;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dsr-path{margin:0 0 8px;font-size:11px;line-height:15px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}

.dsr-notice{padding:9px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;font-size:12.5px;line-height:18px}
.dsr-noticeError{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 36%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 7%,transparent)}
.dsr-error{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 36%,var(--dsw-alias-border-l1));border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 7%,transparent)}
.dsr-errorTitle{font-size:12.5px;line-height:18px;font-weight:600}
.dsr-errorBody{flex:1;min-width:180px;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dsr-loading{display:flex;align-items:center;gap:10px;padding:18px 2px;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dsr-spinner{width:12px;height:12px;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,transparent);border-top-color:var(--dsw-alias-brand-primary);animation:dsrSpin .8s linear infinite;flex:none}
.dsr-foot{margin:0;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-secondary)}

@keyframes dsrSpin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){
.dsr-spinner{animation-duration:2.4s}
.dsr-progressFill{transition:none}
.dsr-btn{transition:none}
}
@media (max-width:720px){
.dsr-headInner{padding:12px 16px 11px}
.dsr-content{padding:16px 16px 24px}
.dsr-subtitle{display:none}
.dsr-metaRow{align-items:flex-start}
.dsr-actions{width:100%}
.dsr-actions .dsr-btn{flex:1}
.dsr-rowMeta{display:none}
}
`;

    function ensureStyle() {
      if (typeof document === 'undefined') return () => {};
      const prior = document.getElementById(STYLE_ID);
      if (prior !== null && prior.parentNode !== null) prior.parentNode.removeChild(prior);
      const element = document.createElement('style');
      element.id = STYLE_ID;
      element.textContent = CSS;
      document.head.appendChild(element);
      return () => {
        if (element.parentNode !== null) element.parentNode.removeChild(element);
      };
    }

    /* ------------------------------------------------------------------ *
     * Client plugin
     * ------------------------------------------------------------------ */

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(ensureStyle, 'dsh-remotion: styles');
        ctx.effect(() => ctx.locale.register(NS, 'en', en), 'dsh-remotion: English dictionary');
        ctx.effect(() => ctx.locale.register(NS, 'id', id), 'dsh-remotion: Indonesian dictionary');
        ctx.effect(() => ctx.locale.register(NS, 'zh', zh), 'dsh-remotion: Chinese dictionary');

        const boundT = ctx.locale.bind(NS);
        ctx.slots.inject('conversation.view', () =>
          ctx.slots.register(
            {
              name: 'conversation.view',
              id: 'remotion',
              order: 12,
              label: () => boundT('view.title'),
              locale: NS,
            },
            createPage(boundT),
          ),
        );
      },
    };
  },
});
