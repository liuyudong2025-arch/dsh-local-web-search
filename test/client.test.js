import assert from 'node:assert/strict';
import test from 'node:test';

test('browser client registers the Harness row configuration page', async () => {
  let client;
  globalThis.window = {
    __ModuleLoader__: {
      load(definition) {
        assert.equal(definition.id, 'dsh-local-web-search');
        client = definition.factory((id) => {
          if (id === 'react') return {};
          if (id === 'react/jsx-runtime') return {};
          if (id === '@deepseek-ai/dsh-client-ui-primitives') return { ConfigField() {} };
          throw new Error(`Unexpected client dependency: ${id}`);
        });
      },
    },
  };

  await import(`../lib/client.js?test=${Date.now()}`);
  assert.deepEqual(client.inject, ['slots', 'locale']);

  let registration;
  const ctx = {
    effect(callback) { callback(); },
    locale: { register() { return () => {}; } },
    slots: {
      inject(name, callback) {
        assert.equal(name, 'plugins.row.config');
        callback();
        return () => {};
      },
      register(spec, component) {
        registration = { spec, component };
        return () => {};
      },
    },
  };
  client.apply(ctx);
  assert.equal(registration.spec.key, 'dsh-local-web-search#local-web-search');
  assert.equal(registration.spec.locale, 'dshLocalWebSearch');
  assert.equal(typeof registration.component, 'function');

  delete globalThis.window;
});
