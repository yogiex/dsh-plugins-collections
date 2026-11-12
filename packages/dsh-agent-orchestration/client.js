window.__ModuleLoader__.load({
  id: '@local/dsh-agent-orchestration',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'agent-orchestration';
    const STYLE_ID = 'dsh-agent-orchestration-style';
    const EMPTY_ENTRIES = [];

    /* ------------------------------------------------------------------ *
     * Dictionaries (en, zh, id)
     * ------------------------------------------------------------------ */

    const zh = {
      'view.title': '编排',
      'view.subtitle': '本会话委派的子智能体',
      'view.live': '{running} 个运行中',
      'view.settled': '全部已结束',
      'view.loading': '加载中',
      'view.unavailable': '不可用',
      'view.none': '暂无委派',
      'deck.label': '编排者',
      'deck.directing': '正在指挥 {total} 个中的 {running} 个',
      'deck.settled': '{total} 个委派已结束',
      'deck.thisSession': '本会话',
      'stats.running': '运行中',
      'stats.agents': '已委派',
      'stats.tokens': '令牌',
      'stats.time': '智能体用时',
      'section.agents': '已委派的智能体',
      'loading.title': '正在加载委派…',
      'migration.title': '需要迁移',
      'migration.body': '本会话的委派记录需要先打开，然后才能显示。',
      'error.title': '无法加载委派列表',
      'error.body': '本会话的委派列表未能加载，请重试。',
      'error.retry': '重试',
      'error.crashTitle': '编排视图出错',
      'error.crashBody': '切换标签页后重新打开即可重试。',
      'empty.title': '暂无委派',
      'empty.body': '当本会话把任务交给子智能体后，它们会连同状态显示在这里。',
      'status.running': '运行中',
      'status.completed': '已完成',
      'status.stopped': '已停止',
      'status.idle': '空闲',
      'status.external': '外部任务',
      'mode.continuable': '可继续',
      'mode.oneShot': '一次性',
      'mode.external': '外部任务',
      'mode.unknown': '模式未知',
      'agent.unnamed': '子智能体',
      'agent.openAria': '打开与 {name} 的会话',
      'agent.readOnly': '只读的委派记录',
      'metric.tokens': '{value} 个 token',
      'duration.seconds': '{seconds} 秒',
      'duration.minutes': '{minutes} 分 {seconds} 秒',
      'duration.hours': '{hours} 小时 {minutes} 分',
      'tokens.thousand': '{value}K',
      'tokens.million': '{value}M',
      'foot.hint': '选择智能体可打开它的会话。',
      'foot.static': '这些是只读的委派记录。',
    };

    const en = {
      'view.title': 'Orchestration',
      'view.subtitle': 'Subagents this session has delegated to',
      'view.live': '{running} running',
      'view.settled': 'All settled',
      'view.loading': 'Loading',
      'view.unavailable': 'Unavailable',
      'view.none': 'No delegations',
      'deck.label': 'Orchestrator',
      'deck.directing': 'Directing {running} of {total}',
      'deck.settled': '{total} delegations settled',
      'deck.thisSession': 'This session',
      'stats.running': 'Running',
      'stats.agents': 'Delegated',
      'stats.tokens': 'Tokens',
      'stats.time': 'Agent time',
      'section.agents': 'Delegated agents',
      'loading.title': 'Loading delegations…',
      'migration.title': 'Migration required',
      'migration.body': 'This session’s delegation history needs to be opened before it can be shown.',
      'error.title': 'Could not load delegations',
      'error.body': 'This session’s delegation list did not load. Try again.',
      'error.retry': 'Try again',
      'error.crashTitle': 'The orchestration view hit an error',
      'error.crashBody': 'Switch tabs and open it again to retry.',
      'empty.title': 'No delegations yet',
      'empty.body': 'When this session hands work to subagents, each one appears here with its status.',
      'status.running': 'running',
      'status.completed': 'completed',
      'status.stopped': 'stopped',
      'status.idle': 'idle',
      'status.external': 'external',
      'mode.continuable': 'continuable',
      'mode.oneShot': 'one-shot',
      'mode.external': 'external',
      'mode.unknown': 'unknown mode',
      'agent.unnamed': 'Subagent',
      'agent.openAria': 'Open conversation with {name}',
      'agent.readOnly': 'Read-only delegation record',
      'metric.tokens': '{value} tokens',
      'duration.seconds': '{seconds}s',
      'duration.minutes': '{minutes}m {seconds}s',
      'duration.hours': '{hours}h {minutes}m',
      'tokens.thousand': '{value}K',
      'tokens.million': '{value}M',
      'foot.hint': 'Select an agent to open its conversation.',
      'foot.static': 'These are read-only delegation records.',
    };

    const id = {
      'view.title': 'Orkestrasi',
      'view.subtitle': 'Subagen yang didelegasikan oleh sesi ini',
      'view.live': '{running} berjalan',
      'view.settled': 'Semua selesai',
      'view.loading': 'Memuat',
      'view.unavailable': 'Tidak tersedia',
      'view.none': 'Belum ada delegasi',
      'deck.label': 'Orkestrator',
      'deck.directing': 'Mengarahkan {running} dari {total}',
      'deck.settled': '{total} delegasi selesai',
      'deck.thisSession': 'Sesi ini',
      'stats.running': 'Berjalan',
      'stats.agents': 'Didelegasikan',
      'stats.tokens': 'Token',
      'stats.time': 'Waktu agen',
      'section.agents': 'Agen yang didelegasikan',
      'loading.title': 'Memuat delegasi…',
      'migration.title': 'Perlu migrasi',
      'migration.body': 'Riwayat delegasi sesi ini perlu dibuka sebelum bisa ditampilkan.',
      'error.title': 'Tidak dapat memuat delegasi',
      'error.body': 'Daftar delegasi sesi ini gagal dimuat. Coba lagi.',
      'error.retry': 'Coba lagi',
      'error.crashTitle': 'Tampilan orkestrasi mengalami error',
      'error.crashBody': 'Pindah tab lalu buka lagi untuk mencoba ulang.',
      'empty.title': 'Belum ada delegasi',
      'empty.body': 'Saat sesi ini menyerahkan pekerjaan ke subagen, masing-masing muncul di sini beserta statusnya.',
      'status.running': 'berjalan',
      'status.completed': 'selesai',
      'status.stopped': 'berhenti',
      'status.idle': 'menganggur',
      'status.external': 'eksternal',
      'mode.continuable': 'dapat dilanjutkan',
      'mode.oneShot': 'sekali jalan',
      'mode.external': 'eksternal',
      'mode.unknown': 'mode tidak diketahui',
      'agent.unnamed': 'Subagen',
      'agent.openAria': 'Buka percakapan dengan {name}',
      'agent.readOnly': 'Catatan delegasi hanya-baca',
      'metric.tokens': '{value} token',
      'duration.seconds': '{seconds} dtk',
      'duration.minutes': '{minutes} mnt {seconds} dtk',
      'duration.hours': '{hours} jam {minutes} mnt',
      'tokens.thousand': '{value}K',
      'tokens.million': '{value}Jt',
      'foot.hint': 'Pilih agen untuk membuka percakapannya.',
      'foot.static': 'Ini catatan delegasi hanya-baca.',
    };

    /* ------------------------------------------------------------------ *
     * Formatting and numeric guards
     * ------------------------------------------------------------------ */

    function finite(value) {
      return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    }

    function nonNegative(value) {
      const next = finite(value);
      return next !== undefined && next >= 0 ? next : undefined;
    }

    function shortId(value) {
      return typeof value === 'string' && value.length > 0 ? value.slice(0, 6) : '';
    }

    function tokenTotal(usage) {
      if (usage === undefined || usage === null) return undefined;
      const buckets = [usage.uncachedInputTokens, usage.outputTokens, usage.cacheReadTokens, usage.cacheWriteTokens];
      let total = 0;
      let seen = false;
      for (const bucket of buckets) {
        const next = nonNegative(bucket);
        if (next !== undefined) {
          total += next;
          seen = true;
        }
      }
      return seen ? total : undefined;
    }

    function formatTokens(value, t) {
      const next = nonNegative(value);
      if (next === undefined) return '';
      if (next < 1000) return String(Math.round(next));
      const scaled = (input) => (input >= 100 ? String(Math.round(input)) : String(Math.round(input * 10) / 10));
      if (next < 1e6) return t('tokens.thousand', { value: scaled(next / 1e3) });
      return t('tokens.million', { value: scaled(next / 1e6) });
    }

    function formatDuration(ms, t) {
      const value = nonNegative(ms);
      if (value === undefined) return '';
      const totalSeconds = Math.floor(value / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      if (hours > 0) return t('duration.hours', { hours, minutes: String(minutes).padStart(2, '0') });
      if (minutes > 0) return t('duration.minutes', { minutes, seconds });
      return t('duration.seconds', { seconds });
    }

    function durationOf(timing, running, now) {
      if (timing === undefined || timing === null) return undefined;
      const settled = nonNegative(timing.settledMs) ?? 0;
      if (timing.active === undefined || timing.active === null) return settled;
      const since = finite(timing.active.since);
      if (since === undefined) return settled;
      const through = finite(timing.active.through);
      const end = running ? Math.max(finite(now) ?? since, through ?? since) : through ?? since;
      return settled + Math.max(0, end - since);
    }

    /* ------------------------------------------------------------------ *
     * Data
     * ------------------------------------------------------------------ */

    function modeLabel(mode, t) {
      if (mode === 'continuable') return t('mode.continuable');
      if (mode === 'one-shot') return t('mode.oneShot');
      if (mode === 'external') return t('mode.external');
      return t('mode.unknown');
    }

    function statusOf(entry, summary, running) {
      if (entry.mode === 'external') return { key: 'status.external', tone: 'muted' };
      if (running) return { key: 'status.running', tone: 'running' };
      const timing = summary?.projectionValues?.subagentTiming;
      if (timing !== undefined && timing !== null) {
        if (timing.lastTurnCompleted === true) return { key: 'status.completed', tone: 'completed' };
        return { key: 'status.stopped', tone: 'muted' };
      }
      return { key: 'status.idle', tone: 'muted' };
    }

    /** Deduplicate catalog entries and drop entries without a usable id. */
    function usableEntries(catalog) {
      if (!Array.isArray(catalog)) return EMPTY_ENTRIES;
      const seen = new Set();
      const entries = [];
      for (const entry of catalog) {
        if (entry === undefined || entry === null || typeof entry !== 'object') continue;
        if (typeof entry.id !== 'string' || entry.id.length === 0) continue;
        if (seen.has(entry.id)) continue;
        seen.add(entry.id);
        entries.push(entry);
      }
      return entries;
    }

    /* ------------------------------------------------------------------ *
     * Artwork
     * ------------------------------------------------------------------ */

    function OrchestrationGlyph({ size }) {
      return h(
        'svg',
        { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', 'aria-hidden': true, focusable: 'false', style: { display: 'block' } },
        h('path', {
          d: 'M12 7.4v3.1M12 10.5 6.3 16.4M12 10.5l5.7 5.9',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
        }),
        h('circle', { cx: 12, cy: 5.6, r: 2.5, fill: 'currentColor' }),
        h('circle', { cx: 5.2, cy: 18, r: 2.1, fill: 'currentColor', opacity: 0.82 }),
        h('circle', { cx: 18.8, cy: 18, r: 2.1, fill: 'currentColor', opacity: 0.82 }),
      );
    }

    function EmptyArt() {
      return h(
        'svg',
        { className: 'dso-emptyArt', viewBox: '0 0 128 64', width: 128, height: 64, fill: 'none', 'aria-hidden': true, focusable: 'false' },
        h('path', {
          d: 'M64 20v8M64 28 34 48M64 28l30 20',
          stroke: 'var(--dsw-alias-border-l2)',
          strokeWidth: 1.2,
          strokeDasharray: '3 4',
          strokeLinecap: 'round',
        }),
        h('circle', { cx: 64, cy: 16, r: 8, fill: 'var(--dsw-alias-brand-primary)', opacity: 0.22 }),
        h('circle', { cx: 64, cy: 16, r: 3.2, fill: 'var(--dsw-alias-brand-primary)' }),
        h('circle', { cx: 32, cy: 50, r: 5, stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1.4 }),
        h('circle', { cx: 96, cy: 50, r: 5, stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1.4 }),
        h('circle', { cx: 46, cy: 42, r: 2.4, stroke: 'var(--dsw-alias-border-l1)', strokeWidth: 1.2 }),
        h('circle', { cx: 82, cy: 42, r: 2.4, stroke: 'var(--dsw-alias-border-l1)', strokeWidth: 1.2 }),
      );
    }

    function StatusGlyph({ state }) {
      if (state === 'running') return h('span', { className: 'dso-spinner', 'aria-hidden': true });
      if (state === 'completed') {
        return h(
          'svg',
          { className: 'dso-doneIcon', viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': true, focusable: 'false' },
          h('path', {
            d: 'M2.4 6.3 4.8 8.7 9.6 3.6',
            stroke: 'currentColor',
            strokeWidth: 1.6,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }),
        );
      }
      if (state === 'external') return h('span', { className: 'dso-externalMark', 'aria-hidden': true }, '◇');
      return h('span', { className: state === 'stopped' ? 'dso-stoppedDot' : 'dso-idleDot', 'aria-hidden': true });
    }

    function RootFact({ label, value }) {
      return h(
        'span',
        { className: 'dso-rootFact' },
        h('span', { className: 'dso-rootFactValue' }, value),
        h('span', { className: 'dso-rootFactLabel' }, label),
      );
    }

    /* ------------------------------------------------------------------ *
     * Row clock (one interval per running row, paused while hidden)
     * ------------------------------------------------------------------ */

    function useRowNow(running) {
      const [now, setNow] = React.useState(() => Date.now());
      React.useEffect(() => {
        if (!running) return undefined;
        setNow(Date.now());
        let timer = null;
        const start = () => {
          if (timer !== null) return;
          timer = setInterval(() => setNow(Date.now()), 1000);
        };
        const stop = () => {
          if (timer !== null) { clearInterval(timer); timer = null; }
        };
        const onVisibility = () => {
          if (typeof document === 'undefined') return;
          if (document.visibilityState === 'visible') { setNow(Date.now()); start(); }
          else stop();
        };
        if (typeof document === 'undefined' || document.visibilityState === 'visible') start();
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
        return () => {
          stop();
          if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
        };
      }, [running]);
      return now;
    }

    /* ------------------------------------------------------------------ *
     * Agent row
     * ------------------------------------------------------------------ */

    const AgentRow = React.memo(function AgentRow(props) {
      const { entry, sessionId, t, openAgent, useSessions, useSessionStatus } = props;
      const summary = useSessions((state) => (state.byId === undefined ? undefined : state.byId[entry.id]));
      const statusRunning = useSessionStatus((value) => {
        if (value === undefined || value === null || typeof value.get !== 'function') return undefined;
        const status = value.get(entry.id);
        return status === undefined || status === null ? undefined : status.running;
      });
      const running = (statusRunning === undefined ? summary?.running : statusRunning) === true;
      const now = useRowNow(running && entry.mode !== 'external');
      const external = entry.mode === 'external';
      const status = statusOf(entry, summary, running);
      const timing = summary?.projectionValues?.subagentTiming;
      const tokens = tokenTotal(summary?.projectionValues?.tokenUsage);
      const duration = external ? undefined : durationOf(timing, running, now);
      const name =
        (typeof entry.label === 'string' && entry.label.length > 0 ? entry.label : undefined) ||
        (typeof summary?.title === 'string' && summary.title.length > 0 ? summary.title : undefined) ||
        shortId(entry.id) ||
        t('agent.unnamed');
      const mode = modeLabel(entry.mode, t);
      const statusText = t(status.key);
      const tokenText = tokens === undefined ? '' : t('metric.tokens', { value: formatTokens(tokens, t) });
      const durationText = duration === undefined ? '' : formatDuration(duration, t);

      const cardContent = [
        h(
          'span',
          { className: 'dso-childHead', key: 'head' },
          h('span', { className: 'dso-node' }, h(StatusGlyph, { state: status.key === 'status.running' ? 'running' : status.key === 'status.completed' ? 'completed' : status.key === 'status.stopped' ? 'stopped' : external ? 'external' : 'idle' })),
          h('span', { className: 'dso-childName', title: name }, name),
        ),
        h('span', { className: `dso-childStatus dso-status-${status.tone}`, key: 'status' }, statusText),
        h('span', { className: 'dso-childMetrics', key: 'metrics' }, `${tokenText || '—'} · ${durationText || '—'}`),
      ];

      const isCompleted = status.key === 'status.completed';
      if (external) {
        return h(
          'div',
          { className: 'dso-child dso-childExternal', role: 'listitem' },
          h(
            'div',
            { className: 'dso-childBtn dso-childStatic' },
            cardContent,
            h('span', { className: 'dso-srOnly' }, t('agent.readOnly')),
          ),
        );
      }

      return h(
        'div',
        { className: isCompleted ? 'dso-child dso-childCompleted' : 'dso-child', role: 'listitem' },
        h(
          'button',
          {
            type: 'button',
            className: 'dso-childBtn',
            'aria-label': t('agent.openAria', { name: `${name}, ${statusText}, ${mode}` }),
            onClick: () =>
              openAgent({
                parentSessionId: sessionId,
                childSessionId: entry.id,
                mode: entry.mode === 'one-shot' || entry.mode === 'continuable' ? entry.mode : 'unknown',
              }),
          },
          cardContent,
        ),
      );
    });

    /* ------------------------------------------------------------------ *
     * Page states
     * ------------------------------------------------------------------ */

    function ErrorCard({ t, title, body, onRetry }) {
      return h(
        'div',
        { className: 'dso-errorCard', role: 'alert' },
        h('span', { className: 'dso-errorTitle' }, title),
        h('span', { className: 'dso-errorBody' }, body),
        h('button', { type: 'button', className: 'dso-retry', onClick: onRetry }, t('error.retry')),
      );
    }

    function LoadingBlock({ t }) {
      return h(
        'div',
        { className: 'dso-loading', role: 'status', 'aria-live': 'polite' },
        h('span', { className: 'dso-loadingText' }, t('loading.title')),
        h(
          'div',
          { className: 'dso-skeleton', 'aria-hidden': true },
          h('span', { className: 'dso-skeletonRow' }),
          h('span', { className: 'dso-skeletonRow' }),
          h('span', { className: 'dso-skeletonRow' }),
        ),
      );
    }

    function EmptyBlock({ t }) {
      return h(
        'div',
        { className: 'dso-emptyCard' },
        h(EmptyArt),
        h('div', { className: 'dso-emptyTitle' }, t('empty.title')),
        h('div', { className: 'dso-emptyBody' }, t('empty.body')),
      );
    }

    function TreeRoot({ t, rootTitle, total, running, tokens, duration }) {
      return h(
        'div',
        { className: 'dso-root' },
        h('span', { className: 'dso-rootAvatar', 'aria-hidden': true }, h(OrchestrationGlyph, { size: 18 })),
        h(
          'div',
          { className: 'dso-rootText' },
          h('span', { className: 'dso-rootRole' }, t('deck.label')),
          h('h3', { className: 'dso-rootName', title: rootTitle }, rootTitle),
          h(
            'span',
            { className: 'dso-rootMeta' },
            running > 0 ? t('deck.directing', { running, total }) : t('deck.settled', { total }),
          ),
        ),
        h(
          'div',
          { className: 'dso-rootFacts' },
          h(RootFact, { label: t('stats.running'), value: String(running) }),
          h(RootFact, { label: t('stats.agents'), value: String(total) }),
          h(RootFact, { label: t('stats.tokens'), value: tokens === undefined ? '—' : formatTokens(tokens, t) }),
          h(RootFact, { label: t('stats.time'), value: duration === undefined ? '—' : formatDuration(duration, t) }),
        ),
      );
    }

    /* ------------------------------------------------------------------ *
     * Page
     * ------------------------------------------------------------------ */

    function createPage(openAgent, retry, boundT) {
      function OrchestrationPage(props) {
        const { sessionId, useSessions, useSessionStatus } = props;
        const t = typeof props.t === 'function' ? props.t : boundT;

        const snapshot = useSessions((state) =>
          state.projectionsBySession === undefined ? undefined : state.projectionsBySession[sessionId],
        );
        const summaries = useSessions((state) => state.byId);
        const statuses = useSessionStatus((value) => value);
        const catalog = snapshot?.values?.subagentCatalog;
        const entries = usableEntries(catalog);
        const error = snapshot?.state === 'error';
        const migration = snapshot?.state === 'migration-required' && catalog === undefined;
        const loading =
          !error && !migration && (snapshot === undefined || snapshot.state === 'loading' || (snapshot.state === 'idle' && catalog === undefined));

        const rootSummary = summaries?.[sessionId];
        const rootTitle =
          typeof rootSummary?.title === 'string' && rootSummary.title.length > 0 ? rootSummary.title : t('deck.thisSession');

        let running = 0;
        let hasTokens = false;
        let totalTokens = 0;
        let hasDuration = false;
        let totalDuration = 0;
        const now = Date.now();
        for (const entry of entries) {
          const summary = summaries?.[entry.id];
          const status = statuses !== undefined && statuses !== null && typeof statuses.get === 'function' ? statuses.get(entry.id) : undefined;
          const isRunning = (status === undefined ? summary?.running : status?.running) === true;
          if (isRunning && entry.mode !== 'external') running += 1;
          if (entry.mode === 'external') continue;
          const tokens = tokenTotal(summary?.projectionValues?.tokenUsage);
          if (tokens !== undefined) {
            totalTokens += tokens;
            hasTokens = true;
          }
          const duration = durationOf(summary?.projectionValues?.subagentTiming, isRunning, now);
          if (duration !== undefined) {
            totalDuration += duration;
            hasDuration = true;
          }
        }

        let pillKey = 'view.none';
        if (error) pillKey = 'view.unavailable';
        else if (loading || migration) pillKey = 'view.loading';
        else if (running > 0) pillKey = 'view.live';
        else if (entries.length > 0) pillKey = 'view.settled';
        const pillText = running > 0 && !loading && !error && !migration ? t(pillKey, { running }) : t(pillKey);

        let body;
        if (error) {
          body = h(ErrorCard, { t, title: t('error.title'), body: t('error.body'), onRetry: () => retry(sessionId) });
        } else if (migration) {
          body = h(ErrorCard, {
            t,
            title: t('migration.title'),
            body: t('migration.body'),
            onRetry: () => retry(sessionId),
          });
        } else if (loading) {
          body = h(LoadingBlock, { t });
        } else if (entries.length === 0) {
          body = h(EmptyBlock, { t });
        } else {
          const useTree = entries.length <= 6;
          const sortedEntries = useTree
            ? entries
            : [...entries].sort((a, b) => {
                const rank = (e) => {
                  if (e.mode === 'external') return 4;
                  const s = statuses !== undefined && statuses !== null && typeof statuses.get === 'function' ? statuses.get(e.id) : undefined;
                  const summary = summaries?.[e.id];
                  const isRunning = (s === undefined ? summary?.running : s?.running) === true;
                  if (isRunning) return 0;
                  const timing = summary?.projectionValues?.subagentTiming;
                  if (timing !== undefined && timing !== null && timing.lastTurnCompleted === true) return 2;
                  if (timing !== undefined && timing !== null) return 1;
                  return 3;
                };
                return rank(a) - rank(b);
              });
          const activeCount = entries.filter((e) => {
            if (e.mode === 'external') return false;
            const s = statuses !== undefined && statuses !== null && typeof statuses.get === 'function' ? statuses.get(e.id) : undefined;
            const summary = summaries?.[e.id];
            return (s === undefined ? summary?.running : s?.running) === true;
          }).length;
          const stoppedCount = entries.filter((e) => {
            if (e.mode === 'external') return false;
            const s = statuses !== undefined && statuses !== null && typeof statuses.get === 'function' ? statuses.get(e.id) : undefined;
            const summary = summaries?.[e.id];
            const isRunning = (s === undefined ? summary?.running : s?.running) === true;
            if (isRunning) return false;
            const timing = summary?.projectionValues?.subagentTiming;
            return timing !== undefined && timing !== null && timing.lastTurnCompleted !== true;
          }).length;
          body = [
            h(
              'div',
              { className: useTree ? (entries.length <= 1 ? 'dso-tree dso-treeSingle' : 'dso-tree') : 'dso-tree dso-treeCompact', key: 'tree' },
              h(TreeRoot, {
                t,
                rootTitle,
                total: entries.length,
                running,
                tokens: hasTokens ? totalTokens : undefined,
                duration: hasDuration ? totalDuration : undefined,
              }),
              useTree && entries.length > 1
                ? h('div', { className: 'dso-trunk', key: 'trunk', 'aria-hidden': true })
                : null,
              !useTree
                ? h(
                    'div',
                    { className: 'dso-compactSummary', key: 'summary', role: 'status', 'aria-live': 'polite' },
                    t('view.live', { running: activeCount }) + ' · ' +
                    t('status.stopped') + ' ' + stoppedCount + ' · ' +
                    t('status.completed') + ' ' + (entries.length - activeCount - stoppedCount - entries.filter((e) => e.mode === 'external').length) + ' · ' +
                    t('status.external') + ' ' + entries.filter((e) => e.mode === 'external').length,
                  )
                : null,
              h(
                'div',
                {
                  className: useTree ? 'dso-children' : 'dso-compactGrid',
                  key: 'children',
                  style: useTree ? { '--n': entries.length } : undefined,
                  'aria-label': t('section.agents'),
                  role: 'list',
                },
                sortedEntries.map((entry) =>
                  h(AgentRow, {
                    key: entry.id,
                    entry,
                    sessionId,
                    t,
                    openAgent,
                    useSessions,
                    useSessionStatus,
                  }),
                ),
              ),
            ),
            h(
              'p',
              { className: 'dso-foot', key: 'foot' },
              entries.some((entry) => entry.mode !== 'external') ? t('foot.hint') : t('foot.static'),
            ),
          ];
        }

        return h(
          'div',
          { className: 'dso-page' },
          h(
            'header',
            { className: 'dso-head' },
            h(
              'div',
              { className: 'dso-headInner' },
              h('h2', { className: 'dso-title' }, t('view.title')),
              h('span', { className: 'dso-subtitle' }, t('view.subtitle')),
              h(
                'span',
                {
                  className: running > 0 && !loading && !error && !migration ? 'dso-livePill dso-livePillOn' : 'dso-livePill',
                  role: 'status',
                  'aria-atomic': 'true',
                },
                running > 0 && !loading && !error && !migration ? h('span', { className: 'dso-liveDot', 'aria-hidden': true }) : null,
                pillText,
              ),
            ),
          ),
          h('div', { className: 'dso-content' }, body),
        );
      }

      /** Keep a malformed child summary from blanking the whole conversation view. */
      class PageBoundary extends React.Component {
        constructor(properties) {
          super(properties);
          this.state = { failed: false };
        }

        static getDerivedStateFromError() {
          return { failed: true };
        }

        componentDidCatch(failure) {
          console.error('agent-orchestration: view crashed', failure);
        }

        render() {
          if (this.state.failed) {
            return h(
              'div',
              { className: 'dso-page' },
              h(
                'div',
                { className: 'dso-content' },
                h(ErrorCard, {
                  t: this.props.t,
                  title: this.props.t('error.crashTitle'),
                  body: this.props.t('error.crashBody'),
                  onRetry: () => {
                    this.setState({ failed: false });
                    this.props.retry(this.props.sessionId);
                  },
                }),
              ),
            );
          }
          return this.props.children;
        }
      }

      function BoundedPage(pageProps) {
        const t = typeof pageProps.t === 'function' ? pageProps.t : boundT;
        return h(
          PageBoundary,
          { t, retry, sessionId: pageProps.sessionId },
          h(OrchestrationPage, pageProps),
        );
      }

      return BoundedPage;
    }

    /* ------------------------------------------------------------------ *
     * Styles
     * ------------------------------------------------------------------ */

    const CSS = `
.dso-page{display:block;color:var(--dsw-alias-label-primary)}
.dso-head{display:block;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dso-headInner{display:flex;align-items:baseline;gap:10px;width:100%;max-width:var(--dsh-chat-content-width,920px);margin:0 auto;padding:13px 24px 12px;box-sizing:border-box;min-width:0}
.dso-title{margin:0;flex:none;font-size:15px;line-height:20px;font-weight:600;letter-spacing:-0.01em}
.dso-subtitle{flex:1;min-width:0;font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dso-livePill{display:inline-flex;align-items:center;gap:6px;flex:none;margin-inline-start:auto;padding:3px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:16px;white-space:nowrap;font-variant-numeric:tabular-nums}
.dso-livePillOn{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 32%, var(--dsw-alias-border-l1));color:var(--dsw-alias-brand-primary)}
.dso-liveDot{width:6px;height:6px;border-radius:50%;background:currentColor}

.dso-content{display:flex;flex-direction:column;gap:12px;width:100%;max-width:var(--dsh-chat-content-width,920px);margin:0 auto;padding:20px 24px 32px;box-sizing:border-box}

.dso-tree{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;display:flex;flex-direction:column;align-items:center;padding:18px 16px 20px;gap:0}
.dso-treeSingle .dso-trunk,.dso-treeSingle .dso-children::before,.dso-treeSingle .dso-child::before{display:none}

.dso-root{position:relative;display:flex;align-items:center;gap:12px;flex-wrap:nowrap;width:100%;max-width:420px;padding:14px 16px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2)}
.dso-rootAvatar{display:grid;place-items:center;width:32px;height:32px;flex:none;border-radius:9px;background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);color:var(--dsw-alias-brand-primary)}
.dso-rootText{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1 1 200px}
.dso-rootRole{font-size:10px;line-height:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
.dso-rootName{margin:0;font-size:14.5px;line-height:20px;font-weight:600;letter-spacing:-0.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dso-rootMeta{font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dso-rootFacts{display:flex;align-items:baseline;flex:none;flex-wrap:wrap;gap:0}
.dso-rootFact{display:inline-flex;align-items:baseline;gap:4px;padding-inline:11px;border-inline-start:1px solid var(--dsw-alias-border-l1);white-space:nowrap}
.dso-rootFact:first-child{padding-inline-start:0;border-inline-start:0}
.dso-rootFactValue{font-size:13px;line-height:18px;font-weight:600;font-variant-numeric:tabular-nums}
.dso-rootFactLabel{font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary)}

.dso-trunk{width:1px;height:20px;background:var(--dsw-alias-border-l2);margin:0 auto}

.dso-children{position:relative;display:flex;flex-wrap:nowrap;justify-content:center;gap:8px;width:100%;padding-top:20px;margin-top:0}
.dso-children::before{content:"";position:absolute;top:0;left:calc(100% / (2 * var(--n,1)));width:calc(100% * (var(--n,1) - 1) / var(--n,1));height:1px;background:var(--dsw-alias-border-l2)}

.dso-child{flex:1 1 0;min-width:90px;max-width:200px;position:relative;contain:layout style paint}
.dso-compactGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;width:100%;padding-top:0}
.dso-compactGrid .dso-child{max-width:none;min-width:0}
.dso-compactSummary{display:flex;flex-wrap:wrap;gap:6px 14px;padding:8px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;margin-bottom:4px}
.dso-child.dso-childCompleted{opacity:.7}
.dso-child.dso-childCompleted .dso-childBtn{background:var(--dsw-alias-bg-layer-1)}
.dso-child::before{content:"";position:absolute;top:-20px;left:50%;transform:translateX(-50%);width:1px;height:20px;background:var(--dsw-alias-border-l2)}

.dso-childBtn{display:flex;flex-direction:column;gap:4px;width:100%;box-sizing:border-box;padding:10px 10px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:inherit;font:inherit;text-align:start;cursor:pointer;touch-action:manipulation;transition:background .12s ease-out,border-color .12s ease-out,box-shadow .12s ease-out}
.dso-childBtn:hover{background:var(--dsw-alias-bg-layer-1);border-color:var(--dsw-alias-border-l2);box-shadow:0 1px 3px color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}
.dso-childBtn:active{transform:scale(0.985);transition-duration:.08s}
.dso-childBtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.dso-childStatic{cursor:default}
.dso-childStatic:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1)}

.dso-childHead{display:flex;align-items:center;gap:6px;min-width:0}
.dso-node{display:grid;place-items:center;width:16px;height:16px;flex:none}
.dso-childName{min-width:0;flex:1;font-size:12.5px;line-height:17px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.dso-childStatus{font-size:11px;line-height:15px;font-weight:500;transition:color .2s ease-out}
.dso-status-running{color:var(--dsw-alias-brand-primary)}
.dso-status-completed,.dso-status-muted{color:var(--dsw-alias-label-secondary)}

.dso-childMetrics{font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.dso-externalMark{font-size:12px;line-height:1;color:var(--dsw-alias-label-secondary)}

.dso-spinner{width:11px;height:11px;border-radius:50%;border:1.5px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent);border-top-color:var(--dsw-alias-brand-primary);animation:dsoSpin .8s linear infinite}
.dso-doneIcon{width:12px;height:12px;color:var(--dsw-alias-state-success-primary);animation:dsoCheckPop .2s ease-out}
.dso-idleDot{width:7px;height:7px;border-radius:50%;border:1.5px solid var(--dsw-alias-state-idle-primary);box-sizing:border-box}
.dso-stoppedDot{width:7px;height:7px;border-radius:2px;background:var(--dsw-alias-state-warn-primary);opacity:.8}

.dso-srOnly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

.dso-foot{margin:0;padding:0 2px;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary)}

.dso-emptyCard{display:flex;flex-direction:column;align-items:center;gap:2px;padding:30px 24px 32px;border:1px dashed var(--dsw-alias-border-l2);border-radius:12px;text-align:center;background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 55%, transparent)}
.dso-emptyArt{margin-bottom:10px}
.dso-emptyTitle{font-size:13.5px;line-height:19px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dso-emptyBody{font-size:12.5px;line-height:19px;color:var(--dsw-alias-label-secondary);max-width:460px}

.dso-loading{display:flex;flex-direction:column;gap:12px;padding:8px 0}
.dso-loadingText{font-size:12.5px;line-height:17px;color:var(--dsw-alias-label-secondary)}
.dso-skeleton{display:flex;flex-direction:column;gap:8px}
.dso-skeletonRow{display:block;height:46px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);position:relative;overflow:hidden}
.dso-skeletonRow::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--dsw-alias-bg-layer-2) 60%,transparent),transparent);transform:translateX(-100%);animation:dsoSkeleton 2.0s cubic-bezier(.36,0,.64,1) infinite}

.dso-errorCard{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:12px 14px;border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 36%, var(--dsw-alias-border-l1));border-radius:12px;background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, transparent)}
.dso-errorTitle{font-size:12.5px;line-height:18px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dso-errorBody{font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary);flex:1;min-width:180px}
.dso-retry{min-height:32px;padding:6px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;transition:background .12s ease-out,border-color .12s ease-out}
.dso-retry:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.dso-retry:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}

@keyframes dsoSpin{to{transform:rotate(360deg)}}
@keyframes dsoLivePulse{0%,100%{opacity:1}50%{opacity:.6}}
@media (prefers-reduced-motion: no-preference){.dso-liveDot{animation:dsoLivePulse 2.0s ease-in-out infinite}}
@keyframes dsoSkeleton{to{transform:translateX(100%)}}

@media (max-width: 720px){
.dso-headInner{padding:12px 16px 11px}
.dso-content{padding:16px 16px 24px}
.dso-subtitle{display:none}
.dso-tree{padding:14px 12px 16px}
.dso-root{max-width:none;flex-direction:column;align-items:flex-start;gap:8px}
.dso-rootFacts{border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px;width:100%}
.dso-rootFact{padding-inline:10px}
.dso-children{flex-wrap:wrap}
.dso-child{min-width:120px;max-width:none;flex:1 1 140px}
.dso-childBtn{padding:9px 9px 8px}
.dso-compactGrid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}
}
@media (max-width: 480px){
.dso-children{flex-wrap:wrap;gap:6px}
.dso-child{min-width:0;flex:1 1 100%}
.dso-compactGrid{grid-template-columns:1fr}
.dso-compactSummary{font-size:11px;gap:4px 10px}
}
@media (prefers-reduced-motion: reduce){
.dso-spinner{animation-duration:2.4s}
.dso-liveDot{animation:none}
.dso-skeletonRow::after{animation:none;display:none}
.dso-skeletonRow{background:var(--dsw-alias-bg-layer-1)}
.dso-childBtn,.dso-retry,.dso-childStatic{transition:none;transform:none}
}
@keyframes dsoCheckPop{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
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
      inject: ['slots', 'locale', 'sessions', 'uiWorkspace'],
      apply(ctx) {
        ctx.effect(ensureStyle, 'agent-orchestration: styles');
        ctx.effect(() => ctx.locale.register(NS, 'en', en), 'agent-orchestration: English dictionary');
        ctx.effect(() => ctx.locale.register(NS, 'zh', zh), 'agent-orchestration: Chinese dictionary');
        // Registered but not offered as an app-wide language: adding a locale would
        // switch the whole Harness UI while shipped namespaces have no Indonesian.
        ctx.effect(() => ctx.locale.register(NS, 'id', id), 'agent-orchestration: Indonesian dictionary');

        const boundT = ctx.locale.bind(NS);
        const openAgent = (address) => {
          try {
            const pending = ctx.uiWorkspace.openSession(address);
            if (pending !== undefined && pending !== null && typeof pending.catch === 'function') {
              pending.catch((failure) => console.error('agent-orchestration: could not open the child conversation', failure));
            }
          } catch (failure) {
            console.error('agent-orchestration: could not open the child conversation', failure);
          }
        };
        const retry = (sessionId) => {
          try {
            const pending = ctx.sessions.refreshProjections(sessionId);
            if (pending !== undefined && pending !== null && typeof pending.catch === 'function') {
              pending.catch((failure) => console.error('agent-orchestration: projection refresh failed', failure));
            }
          } catch (failure) {
            console.error('agent-orchestration: projection refresh failed', failure);
          }
        };

        ctx.slots.inject('conversation.view', () =>
          ctx.slots.register(
            {
              name: 'conversation.view',
              id: 'orchestration',
              order: 11,
              label: () => boundT('view.title'),
              locale: NS,
            },
            createPage(openAgent, retry, boundT),
          ),
        );
      },
    };
  },
});
