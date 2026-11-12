window.__ModuleLoader__.load({
  id: '@local/usrsoda-gif',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'usrsoda-gif';
    const STATES = __STATES_JSON__;

    const DICTS = {
      en: {
        label: 'Agent state GIF from @usrsoda',
        idle: 'Idle',
        idleHint: 'Waiting for your next message',
        working: 'Working',
        workingHint: 'Running your request',
        pending: 'Waiting for you',
        pendingHint: 'A question or approval is open',
        complete: 'Done',
        completeHint: 'Last turn finished',
        media: 'Looping GIF from an X post by @usrsoda',
        credit: '@usrsoda · GIF',
      },
      id: {
        label: 'GIF status agen dari @usrsoda',
        idle: 'Idle',
        idleHint: 'Menunggu pesan berikutnya',
        working: 'Bekerja',
        workingHint: 'Sedang mengerjakan permintaan',
        pending: 'Menunggu jawabanmu',
        pendingHint: 'Ada pertanyaan atau persetujuan terbuka',
        complete: 'Selesai',
        completeHint: 'Turn terakhir sudah selesai',
        media: 'GIF berulang dari unggahan X @usrsoda',
        credit: '@usrsoda · GIF',
      },
      zh: {
        label: '来自 @usrsoda 的代理状态 GIF',
        idle: '空闲',
        idleHint: '等待你的下一条消息',
        working: '工作中',
        workingHint: '正在处理你的请求',
        pending: '等待你回复',
        pendingHint: '有一个问题或审批待处理',
        complete: '完成',
        completeHint: '上一轮已结束',
        media: '来自 @usrsoda 的 X 帖子中的循环 GIF',
        credit: '@usrsoda · GIF',
      },
    };

    const CSS = [
      '.dsw-usrsoda-state{display:inline-flex;align-items:center;gap:10px;max-width:100%;',
      'padding:6px 12px 6px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;',
      'background:var(--dsw-alias-bg-layer-1);color:inherit;text-decoration:none;',
      'transition:border-color .15s ease}',
      '.dsw-usrsoda-state:hover{border-color:var(--dsw-alias-border-l2)}',
      '.dsw-usrsoda-state:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
      '.dsw-usrsoda-state-media{flex:none;display:block;width:84px;height:84px;border-radius:10px;',
      'overflow:hidden;background:var(--dsw-alias-bg-layer-2)}',
      '.dsw-usrsoda-state-media>*{display:block;width:100%;height:100%;object-fit:cover}',
      '.dsw-usrsoda-state-meta{display:flex;flex-direction:column;gap:2px;min-width:0;text-align:left}',
      '.dsw-usrsoda-state-row{display:flex;align-items:center;gap:6px}',
      '.dsw-usrsoda-state-dot{flex:none;width:7px;height:7px;border-radius:99px;',
      'background:var(--dsw-alias-state-idle-primary)}',
      '.dsw-usrsoda-state[data-state=working] .dsw-usrsoda-state-dot{background:var(--dsw-alias-brand-primary);',
      'animation:dsw-usrsoda-pulse 1.4s ease-in-out infinite}',
      '.dsw-usrsoda-state[data-state=pending] .dsw-usrsoda-state-dot{background:var(--dsw-alias-state-warn-primary);',
      'animation:dsw-usrsoda-pulse 1.4s ease-in-out infinite}',
      '.dsw-usrsoda-state[data-state=complete] .dsw-usrsoda-state-dot{background:var(--dsw-alias-state-success-primary)}',
      '.dsw-usrsoda-state-label{font-size:13px;font-weight:600;line-height:1.25;',
      'color:var(--dsw-alias-label-primary)}',
      '.dsw-usrsoda-state-hint{font-size:12px;line-height:1.35;max-width:190px;',
      'color:var(--dsw-alias-label-secondary)}',
      '.dsw-usrsoda-state-credit{font-size:10px;line-height:1.3;letter-spacing:.06em;',
      'text-transform:uppercase;color:var(--dsw-alias-label-secondary);opacity:.8}',
      '@keyframes dsw-usrsoda-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
      '@media (prefers-reduced-motion:reduce){.dsw-usrsoda-state-dot{animation:none!important}}',
    ].join('');

    function useReducedMotion() {
      const [reduced, setReduced] = React.useState(false);
      React.useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return undefined;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
      }, []);
      return reduced;
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const disposers = Object.keys(DICTS).map((locale) => ctx.locale.register(NS, locale, DICTS[locale]));
          return () => disposers.forEach((dispose) => dispose());
        });

        const t = ctx.locale.bind(NS);

        /** How long the "done" GIF stays up after a turn settles, in ms. */
        const DONE_MS = 7000;

        function UsrsodaStateGif({ useSession, useSessionStatus, sessionId, t }) {
          const running = useSession((snapshot) => snapshot.running);
          const pending = useSessionStatus((status) => {
            const entry = status.get(sessionId);
            return entry === undefined ? undefined : entry.pendingInteraction;
          });
          const [celebrating, setCelebrating] = React.useState(false);
          const wasRunning = React.useRef(running);
          React.useEffect(() => {
            const previous = wasRunning.current;
            wasRunning.current = running;
            if (previous && !running) {
              setCelebrating(true);
              const timer = window.setTimeout(() => setCelebrating(false), DONE_MS);
              return () => window.clearTimeout(timer);
            }
            if (running) setCelebrating(false);
            return undefined;
          }, [running]);
          const state = pending ? 'pending' : running ? 'working' : celebrating ? 'complete' : 'idle';
          const item = STATES[state];
          const reduced = useReducedMotion();
          const media = reduced
            ? h('img', { key: state, src: item.poster, alt: t('media'), draggable: false })
            : h('video', {
                key: state,
                src: item.video,
                poster: item.poster,
                autoPlay: true,
                loop: true,
                muted: true,
                playsInline: true,
                preload: 'auto',
                'aria-label': t('media'),
              });
          return h(
            React.Fragment,
            null,
            h('style', { key: 'usrsoda-gif-style' }, CSS),
            h(
              'a',
              {
                className: 'dsw-usrsoda-state',
                'data-state': state,
                href: item.post,
                target: '_blank',
                rel: 'noreferrer noopener',
                title: t('label'),
                'aria-label': t('label') + ': ' + t(state),
              },
              h('span', { className: 'dsw-usrsoda-state-media' }, media),
              h(
                'span',
                { className: 'dsw-usrsoda-state-meta' },
                h(
                  'span',
                  { className: 'dsw-usrsoda-state-row' },
                  h('span', { className: 'dsw-usrsoda-state-dot' }),
                  h('span', { className: 'dsw-usrsoda-state-label' }, t(state)),
                ),
                h('span', { className: 'dsw-usrsoda-state-hint' }, t(state + 'Hint')),
                h('span', { className: 'dsw-usrsoda-state-credit' }, t('credit')),
              ),
            ),
          );
        }

        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            {
              name: 'conversation.composer.dock',
              id: 'usrsoda-gif',
              order: 5,
              locale: NS,
              label: () => t('label'),
            },
            UsrsodaStateGif,
          ),
        );
      },
    };
  },
});
