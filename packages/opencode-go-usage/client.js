window.__ModuleLoader__.load({
  id: '@local/opencode-go-usage',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const CSS = [
      '.dsw-ogu{position:relative;display:inline-flex;align-items:center;width:auto}',
      '.dsw-ogu-btn{display:inline-flex;align-items:center;gap:5px;width:auto;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);border-radius:999px;padding:1px 8px;font-size:11px;line-height:16px;cursor:pointer;text-align:left}',
      '.dsw-ogu-btn:hover{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}',
      '.dsw-ogu-dot{width:6px;height:6px;border-radius:99px;background:var(--dsw-alias-brand-primary);flex:none}',
      '.dsw-ogu-spacer{flex:1}',
      '.dsw-ogu-chev{font-size:9px;opacity:.6}',
      '.dsw-ogu-panel{position:absolute;bottom:calc(100% + 6px);left:0;right:auto;width:min(420px,86vw);max-height:62vh;overflow:auto;background:var(--dsw-specific-menu,var(--dsw-alias-bg-layer-1));border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:14px;box-shadow:0 12px 32px rgba(0,0,0,.24);z-index:1000}',
      '.dsw-ogu-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.dsw-ogu-card{background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l1);border-radius:12px;padding:12px 14px;min-width:0}',
      '.dsw-ogu-card h3{margin:0;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.dsw-ogu-sub{font-size:11px;color:var(--dsw-alias-label-tertiary);margin:2px 0 4px}',
      '.dsw-ogu-row{margin:13px 0 0}',
      '.dsw-ogu-rowhead{display:flex;align-items:baseline;gap:6px;font-size:12px;color:var(--dsw-alias-label-primary);white-space:nowrap}',
      '.dsw-ogu-rowhead b{font-weight:600}',
      '.dsw-ogu-reset{color:var(--dsw-alias-label-tertiary);font-size:11px;overflow:hidden;text-overflow:ellipsis}',
      '.dsw-ogu-pct{margin-left:auto;font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.dsw-ogu-bar{height:6px;border-radius:99px;background:var(--dsw-alias-bg-layer-2,#333);overflow:hidden;margin-top:5px}',
      '.dsw-ogu-fill{height:100%;border-radius:99px;background:var(--dsw-alias-state-success-primary,#3fb950);transition:width .2s ease}',
      '.dsw-ogu-model{display:flex;align-items:center;gap:8px;margin:11px 0 0;font-size:12px;color:var(--dsw-alias-label-primary)}',
      '.dsw-ogu-icon{width:20px;height:20px;border-radius:6px;background:var(--dsw-alias-bg-layer-2,#2a2a2a);display:grid;place-items:center;font-size:9px;font-weight:700;color:var(--dsw-alias-label-secondary);flex:none}',
      '.dsw-ogu-mname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsw-ogu-share{font-size:11px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}',
      '.dsw-ogu-totals{display:flex;gap:18px;margin-top:12px;padding-top:10px;border-top:.5px solid var(--dsw-alias-border-l1);font-size:11px;color:var(--dsw-alias-label-secondary)}',
      '.dsw-ogu-totals b{color:var(--dsw-alias-label-primary);font-weight:600}',
      '.dsw-ogu-foot{margin-top:10px;font-size:10px;color:var(--dsw-alias-label-tertiary);display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.dsw-ogu-link{color:var(--dsw-alias-brand-primary);text-decoration:none}',
      '.dsw-ogu-empty{font-size:12px;color:var(--dsw-alias-label-tertiary)}',
    ].join('');

    const initials = (label) =>
      String(label)
        .split(/[\s.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');

    function formatResets(ms) {
      if (ms === null || ms === undefined || !isFinite(ms)) return 'no usage yet';
      const mins = Math.max(0, Math.round(ms / 60000));
      const d = Math.floor(mins / 1440);
      const hrs = Math.floor((mins % 1440) / 60);
      const m = mins % 60;
      if (d > 0) return 'Resets in ' + d + 'd ' + hrs + 'h';
      if (hrs > 0) return 'Resets in ' + hrs + 'h ' + String(m).padStart(2, '0') + 'm';
      return 'Resets in ' + m + 'm';
    }

    function formatPct(value) {
      if (!isFinite(value)) return '—';
      if (value > 0 && value < 1) return '<1%';
      return Math.round(value) + '%';
    }

    function formatTokens(value) {
      if (!value) return '0';
      if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
      if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
      if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
      return String(Math.round(value));
    }

    function UsagePanel() {
      const [open, setOpen] = React.useState(false);
      const [data, setData] = React.useState(null);
      const [error, setError] = React.useState(null);

      const load = React.useCallback(async () => {
        try {
          const res = await fetch('/api/opencode-go-usage', { credentials: 'same-origin' });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          setData(await res.json());
          setError(null);
        } catch (e) {
          setError(String(e && e.message ? e.message : e));
        }
      }, []);

      React.useEffect(() => {
        load();
        const id = setInterval(load, 30000);
        return () => clearInterval(id);
      }, [load]);

      const limits = (data && data.limits) || [];
      const models = (data && data.models) || [];
      const monthly = limits.find((entry) => entry.key === 'monthly');

      return h(
        'div',
        { className: 'dsw-ogu' },
        h('style', null, CSS),
        h(
          'button',
          {
            className: 'dsw-ogu-btn',
            type: 'button',
            onClick: () => setOpen((v) => !v),
            title: monthly ? 'OpenCode Go · monthly ' + formatPct(monthly.percentage) + ' used' : 'OpenCode Go usage',
            'aria-label': 'OpenCode Go usage',
          },
          h('span', { className: 'dsw-ogu-dot' }),
          h('span', null, 'OpenCode Go limits'),
          h('span', { className: 'dsw-ogu-chev' }, open ? '▾' : '▴'),
        ),
        open
          ? h(
              'div',
              { className: 'dsw-ogu-panel' },
              error ? h('div', { className: 'dsw-ogu-empty' }, 'Gagal memuat: ' + error) : null,
              h(
                'div',
                { className: 'dsw-ogu-grid' },
                h(
                  'div',
                  { className: 'dsw-ogu-card' },
                  h('h3', null, 'Limits'),
                  h('div', { className: 'dsw-ogu-sub' }, 'When your Go usage resets'),
                  limits.length === 0
                    ? h('div', { className: 'dsw-ogu-empty' }, 'Belum ada data.')
                    : limits.map((limit) =>
                        h(
                          'div',
                          { className: 'dsw-ogu-row', key: limit.key },
                          h(
                            'div',
                            { className: 'dsw-ogu-rowhead' },
                            h('b', null, limit.label),
                            h('span', { className: 'dsw-ogu-reset' }, formatResets(limit.resetInMs)),
                            h('span', { className: 'dsw-ogu-pct' }, formatPct(limit.percentage) + ' used'),
                          ),
                          h(
                            'div',
                            { className: 'dsw-ogu-bar' },
                            h('div', {
                              className: 'dsw-ogu-fill',
                              style: { width: Math.min(100, Math.max(0, limit.percentage)) + '%' },
                            }),
                          ),
                        ),
                      ),
                ),
                h(
                  'div',
                  { className: 'dsw-ogu-card' },
                  h('h3', null, 'Models'),
                  h('div', { className: 'dsw-ogu-sub' }, 'Most used in the last 30 days'),
                  models.length === 0
                    ? h('div', { className: 'dsw-ogu-empty' }, 'Belum ada request tercatat.')
                    : models.slice(0, 6).map((model) =>
                        h(
                          'div',
                          { className: 'dsw-ogu-model', key: model.model },
                          h('span', { className: 'dsw-ogu-icon' }, initials(model.name)),
                          h('span', { className: 'dsw-ogu-mname' }, model.name),
                          h('span', { className: 'dsw-ogu-share' }, formatPct(model.share)),
                        ),
                      ),
                ),
              ),
              h(
                'div',
                { className: 'dsw-ogu-totals' },
                h('span', null, 'Requests ', h('b', null, data ? data.requests : 0)),
                h('span', null, 'Tokens ', h('b', null, formatTokens(data ? data.tokens : 0))),
                h('span', null, 'Est. cost ', h('b', null, '$' + (data ? (data.cost || 0).toFixed(2) : '0.00'))),
              ),
              h(
                'div',
                { className: 'dsw-ogu-foot' },
                h('span', null, 'Local estimate from DSH session logs.'),
                h(
                  'a',
                  {
                    className: 'dsw-ogu-link',
                    href: 'https://opencode.ai/console',
                    target: '_blank',
                    rel: 'noreferrer noopener',
                  },
                  'Open Console',
                ),
                h('span', { style: { marginLeft: 'auto' } }, '30-day window'),
              ),
            )
          : null,
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            {
              name: 'conversation.composer.dock',
              id: 'opencode-go-usage',
              order: 6,
              label: () => 'OpenCode Go usage',
            },
            UsagePanel,
          ),
        );
      },
    };
  },
});
