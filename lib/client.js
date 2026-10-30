window.__ModuleLoader__.load({
  id: 'dsh-local-web-search',
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const React = require('react');
    const jsx = require('react/jsx-runtime');
    // Only the components the published primitives module actually exports.
    // A settings page shares the Harness form frame so its styling, save
    // control, and staged-edit behaviour match the built-in pages.
    const { SettingsForm, SettingsValueField } = require('@deepseek-ai/dsh-client-ui-primitives');

    const NS = 'dshLocalWebSearch';
    // The row key is `<package name>#<row id>` for the row the bundle's patch declares.
    const ROW_KEY = 'dsh-local-web-search#local-web-search';

    const PROVIDERS = ['bing', 'duckduckgo', 'searxng'];
    const FIELDS = [
      { key: 'provider', numeric: false },
      { key: 'searxngUrl', numeric: false },
      { key: 'timeoutMs', numeric: true },
      { key: 'maxFetchBytes', numeric: true },
      { key: 'maxResults', numeric: true },
    ];

    const en = {
      summary: 'Free local web search and page fetching; no DeepSeek Search/Fetch request fee.',
      provider: 'Search provider',
      providerHint: 'One of bing, duckduckgo, or searxng. Bing needs no key; searxng uses your own instance.',
      searxngUrl: 'SearXNG URL',
      searxngUrlHint: 'Used only when the search provider is searxng.',
      timeoutMs: 'Request timeout (ms)',
      timeoutMsHint: 'Longest time allowed for one search or page request.',
      maxFetchBytes: 'Maximum fetched page size (bytes)',
      maxFetchBytesHint: 'Stops downloads larger than this.',
      maxResults: 'Maximum search results',
      maxResultsHint: 'Upper limit enforced for each local_web_search call.',
      save: 'Save',
      saving: 'Saving...',
      saveFailed: 'Harness did not accept these values; they were left for you to correct.',
      unavailable: 'This plugin is not loaded, so it cannot be configured right now.',
      readOnly: 'This configuration is read-only.',
      overridden: 'Overridden',
      reset: 'Reset to default',
      invalid: 'Enter a valid value.',
    };
    const zh = {
      summary: '免费本地联网搜索与网页抓取，不产生 DeepSeek Search/Fetch 接口费。',
      provider: '搜索源',
      providerHint: '填写 bing、duckduckgo 或 searxng。Bing 无需密钥；searxng 使用你自己的实例。',
      searxngUrl: 'SearXNG 地址',
      searxngUrlHint: '仅在搜索源填写 searxng 时使用。',
      timeoutMs: '请求超时（毫秒）',
      timeoutMsHint: '单次搜索或网页抓取允许的最长时间。',
      maxFetchBytes: '网页抓取上限（字节）',
      maxFetchBytesHint: '网页下载超过此大小时停止。',
      maxResults: '最大搜索结果数',
      maxResultsHint: '每次 local_web_search 调用允许返回的最大数量。',
      save: '保存',
      saving: '保存中…',
      saveFailed: 'Harness 没有接受这些参数，已保留供你修改。',
      unavailable: '插件当前未加载，暂时无法配置。',
      readOnly: '当前配置为只读。',
      overridden: '已覆盖',
      reset: '恢复默认值',
      invalid: '请输入有效值。',
    };

    function own(object, key) {
      return object !== null && typeof object === 'object' && Object.prototype.hasOwnProperty.call(object, key);
    }
    function textValue(value) {
      return value === undefined || value === null ? '' : String(value);
    }
    function draftOf(snapshot) {
      const value = snapshot.value ?? {};
      return Object.fromEntries(FIELDS.map(({ key }) => [key, textValue(value[key])]));
    }

    function ConfigPage({ t, form }) {
      const snapshot = form.state;
      const [draft, setDraft] = React.useState(() => draftOf(snapshot));
      const [cleared, setCleared] = React.useState(() => new Set());
      const [saving, setSaving] = React.useState(false);
      const [failed, setFailed] = React.useState(false);

      // A save or an outside write replaces the revision; re-seed so the
      // controls show what the Host now holds rather than stale drafts.
      React.useEffect(() => {
        setDraft(draftOf(snapshot));
        setCleared(new Set());
        setFailed(false);
      }, [snapshot.revision]);

      const invalid = {};
      const pending = [];
      for (const { key, numeric } of FIELDS) {
        if (cleared.has(key)) {
          // A cleared field re-inherits the composition layer, so it is valid.
          invalid[key] = false;
          pending.push({ op: 'unset', path: [key] });
          continue;
        }
        const raw = draft[key].trim();
        if (numeric) {
          const number = Number(raw);
          invalid[key] = !(Number.isSafeInteger(number) && number > 0);
          if (number !== snapshot.value?.[key]) pending.push({ op: 'set', path: [key], value: number });
        } else if (key === 'provider') {
          invalid[key] = !PROVIDERS.includes(raw);
          if (raw !== snapshot.value?.[key]) pending.push({ op: 'set', path: [key], value: raw });
        } else {
          invalid[key] = raw.length === 0;
          if (raw !== snapshot.value?.[key]) pending.push({ op: 'set', path: [key], value: raw });
        }
      }
      const hasInvalid = Object.values(invalid).some(Boolean);

      const save = async () => {
        if (!pending.length || hasInvalid || saving || !snapshot.writable) return;
        setSaving(true);
        setFailed(false);
        try {
          const accepted = await form.mutate(pending, snapshot.revision);
          setFailed(!accepted);
        } catch {
          setFailed(true);
        } finally {
          setSaving(false);
        }
      };

      const discard = () => {
        setDraft(draftOf(snapshot));
        setCleared(new Set());
        setFailed(false);
      };

      const edit = (key, value) => {
        setDraft(current => ({ ...current, [key]: value }));
        setCleared(current => {
          if (!current.has(key)) return current;
          const next = new Set(current);
          next.delete(key);
          return next;
        });
        setFailed(false);
      };

      const resetField = (key) => {
        const base = snapshot.base !== null && typeof snapshot.base === 'object'
          ? snapshot.base[key]
          : snapshot.value?.[key];
        setDraft(current => ({ ...current, [key]: textValue(base) }));
        setCleared(current => new Set(current).add(key));
        setFailed(false);
      };

      return jsx.jsx(SettingsForm, {
        labels: {
          unavailable: t('unavailable'),
          readOnly: t('readOnly'),
          saveFailed: t('saveFailed'),
          save: t('save'),
          saving: t('saving'),
        },
        state: {
          available: true,
          writable: snapshot.writable,
          dirty: pending.length > 0,
          invalid: hasInvalid,
          saving,
          failed,
        },
        onSave: save,
        onDiscard: discard,
        children: FIELDS.map(({ key, numeric }) => jsx.jsx(SettingsValueField, {
          id: `dsh-local-web-search-${key}`,
          label: t(key),
          hint: t(`${key}Hint`),
          text: draft[key],
          overridden: !cleared.has(key) && own(snapshot.user, key),
          invalid: invalid[key],
          overriddenLabel: t('overridden'),
          resetLabel: t('reset'),
          invalidLabel: t('invalid'),
          disabled: saving || !snapshot.writable,
          numeric,
          onEdit: value => edit(key, value),
          onReset: () => resetField(key),
        }, key)),
      });
    }

    function LocalWebSearchConfig(props) {
      const { t, view, form } = props;
      if (view !== 'page') return t('summary');
      if (!form || !form.state || form.state.status !== 'ready' || !form.state.value) {
        return jsx.jsx('p', { children: t('unavailable') });
      }
      return jsx.jsx(ConfigPage, { t, form });
    }

    const inject = ['slots', 'locale'];
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-local-web-search: dictionaries');
      ctx.effect(() => ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
        name: 'plugins.row.config', key: ROW_KEY, locale: NS,
      }, LocalWebSearchConfig)), 'dsh-local-web-search: config page');
    }

    exports.NS = NS;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
