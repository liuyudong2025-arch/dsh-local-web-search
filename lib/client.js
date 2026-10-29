window.__ModuleLoader__.load({
  id: 'dsh-local-web-search',
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const React = require('react');
    const jsx = require('react/jsx-runtime');
    const { ConfigField } = require('@deepseek-ai/dsh-client-ui-primitives');

    const NS = 'dshLocalWebSearch';
    const ROW_KEY = 'dsh-local-web-search#local-web-search';
    const fields = [
      { key: 'provider', choices: ['bing', 'duckduckgo', 'searxng'], numeric: false },
      { key: 'searxngUrl', choices: [], numeric: false },
      { key: 'timeoutMs', choices: [], numeric: true },
      { key: 'maxFetchBytes', choices: [], numeric: true },
      { key: 'maxResults', choices: [], numeric: true },
    ];

    const en = {
      summary: 'Free local web search and page fetching; no DeepSeek Search/Fetch request fee.',
      provider: 'Search provider', providerHint: 'Bing RSS needs no key. DuckDuckGo is an alternative. SearXNG uses your own instance.',
      searxngUrl: 'SearXNG URL', searxngUrlHint: 'Used only when the provider is searxng.',
      timeoutMs: 'Request timeout (ms)', timeoutMsHint: 'Maximum time for one search or page request.',
      maxFetchBytes: 'Maximum fetched page size (bytes)', maxFetchBytesHint: 'Stops downloads that exceed this limit.',
      maxResults: 'Maximum search results', maxResultsHint: 'Upper limit enforced for each local_web_search call.',
      save: 'Save', saving: 'Saving...', saved: 'Saved. New tool calls use these settings.',
      failed: 'Harness did not accept these values.', unavailable: 'This plugin is not currently available.',
      readOnly: 'This configuration is read-only.', reset: 'Reset to default', inherited: 'Use default', invalid: 'Enter a valid value.',
    };
    const zh = {
      summary: '免费本地联网搜索与网页抓取，不产生 DeepSeek Search/Fetch 接口费。',
      provider: '搜索源', providerHint: 'Bing RSS 无需密钥；DuckDuckGo 可作备用；SearXNG 使用你自己的实例。',
      searxngUrl: 'SearXNG 地址', searxngUrlHint: '仅在搜索源选择 searxng 时使用。',
      timeoutMs: '请求超时（毫秒）', timeoutMsHint: '单次搜索或网页抓取允许的最长时间。',
      maxFetchBytes: '网页抓取上限（字节）', maxFetchBytesHint: '网页下载超过此大小时停止。',
      maxResults: '最大搜索结果数', maxResultsHint: '每次 local_web_search 调用允许返回的最大数量。',
      save: '保存', saving: '保存中…', saved: '已保存，后续工具调用将使用新参数。',
      failed: 'Harness 没有接受这些参数，请检查后重试。', unavailable: '插件当前未加载，暂时无法配置。',
      readOnly: '当前配置为只读。', reset: '恢复默认值', inherited: '使用默认值', invalid: '请输入有效值。',
    };

    function own(object, key) {
      return object !== null && typeof object === 'object' && Object.prototype.hasOwnProperty.call(object, key);
    }
    function textValue(value) {
      return value === undefined || value === null ? '' : String(value);
    }

    function ConfigPage({ t, form }) {
      const snapshot = form.state;
      const [draft, setDraft] = React.useState(() => Object.fromEntries(fields.map(({ key }) => [key, textValue(snapshot.value[key])])));
      const [resets, setResets] = React.useState(() => new Set());
      const [saving, setSaving] = React.useState(false);
      const [message, setMessage] = React.useState('');

      React.useEffect(() => {
        setDraft(Object.fromEntries(fields.map(({ key }) => [key, textValue(snapshot.value[key])])));
        setResets(new Set());
        setMessage('');
      }, [snapshot.revision]);

      const invalid = {};
      for (const field of fields) {
        const value = draft[field.key].trim();
        invalid[field.key] = !resets.has(field.key) && (field.numeric
          ? (!Number.isSafeInteger(Number(value)) || Number(value) <= 0)
          : (field.key === 'provider' && !field.choices.includes(value)) || (field.key === 'searxngUrl' && value.length === 0));
      }
      const hasInvalid = Object.values(invalid).some(Boolean);
      const disabled = saving || !snapshot.writable;

      const change = (key, value) => {
        setDraft(current => ({ ...current, [key]: value }));
        setResets(current => { const next = new Set(current); next.delete(key); return next; });
        setMessage('');
      };
      const reset = (key) => {
        const base = snapshot.base && typeof snapshot.base === 'object' ? snapshot.base[key] : snapshot.value[key];
        setDraft(current => ({ ...current, [key]: textValue(base) }));
        setResets(current => new Set(current).add(key));
        setMessage('');
      };
      const save = async (event) => {
        event.preventDefault();
        if (hasInvalid || disabled) return;
        const ops = [];
        for (const field of fields) {
          if (resets.has(field.key)) ops.push({ op: 'unset', path: [field.key] });
          else {
            const value = field.numeric ? Number(draft[field.key].trim()) : draft[field.key].trim();
            if (value !== snapshot.value[field.key]) ops.push({ op: 'set', path: [field.key], value });
          }
        }
        if (!ops.length) return;
        setSaving(true);
        setMessage('');
        try {
          const accepted = await form.mutate(ops, snapshot.revision);
          setMessage(accepted ? 'saved' : 'failed');
        } catch {
          setMessage('failed');
        } finally {
          setSaving(false);
        }
      };

      return jsx.jsxs('form', { onSubmit: save, style: { display: 'grid', gap: '20px', maxWidth: '840px' }, children: [
        ...fields.map(field => jsx.jsxs('div', { children: [
          jsx.jsx(ConfigField, {
            label: t(field.key), value: draft[field.key], secret: false, choices: field.choices,
            disabled, overridden: !resets.has(field.key) && own(snapshot.user, field.key), invalid: invalid[field.key],
            labels: { reset: t('reset'), inherited: t('inherited'), invalid: t('invalid') },
            onChange: value => change(field.key, value), onReset: () => reset(field.key),
          }),
          jsx.jsx('p', { style: { margin: '6px 0 0', color: 'var(--text-secondary, #667085)', fontSize: '13px' }, children: t(`${field.key}Hint`) }),
        ] }, field.key)),
        !snapshot.writable ? jsx.jsx('p', { children: t('readOnly') }) : null,
        message ? jsx.jsx('p', { role: 'status', children: t(message) }) : null,
        jsx.jsx('div', { children: jsx.jsx('button', { type: 'submit', disabled: disabled || hasInvalid, style: { padding: '9px 20px', borderRadius: '8px', cursor: 'pointer' }, children: saving ? t('saving') : t('save') }) }),
      ] });
    }

    function LocalWebSearchConfig({ t, form, view }) {
      if (view === 'summary') return t('summary');
      if (!form || form.state.status !== 'ready' || !form.state.value) return jsx.jsx('p', { children: t('unavailable') });
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
