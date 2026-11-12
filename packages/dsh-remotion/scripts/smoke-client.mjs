/**
 * Developer smoke test for the Client half: executes the factory, applies it to
 * a stub Cordis context, and server-renders the page once. Catches syntax,
 * registration, and first-render crashes without a browser.
 */
import { createRequire } from 'node:module';
import { renderToString } from 'react-dom/server';

const require = createRequire(import.meta.url);
const loaded = [];
globalThis.window = { __ModuleLoader__: { load: (definition) => loaded.push(definition) } };
globalThis.document = undefined;

await import('../client.js');
const definition = loaded[0];
if (definition === undefined) throw new Error('client.js never called __ModuleLoader__.load');

const exported = definition.factory(require);
const registrations = [];
const ctx = {
  effect(factory) {
    const dispose = factory();
    return typeof dispose === 'function' ? dispose : () => {};
  },
  locale: {
    register: () => () => {},
    bind: () => (key) => key,
  },
  slots: {
    inject: (_key, callback) => callback(),
    register: (options, component) => {
      registrations.push({ options, component });
      return () => {};
    },
  },
};

exported.apply(ctx);
if (registrations.length !== 1) throw new Error(`expected one slot registration, got ${registrations.length}`);
const { options, component } = registrations[0];
if (options.name !== 'conversation.view' || options.id !== 'remotion') throw new Error('unexpected slot registration');

const html = renderToString(component({ sessionId: 'test', t: (key) => key }));
if (!html.includes('dsr-page')) throw new Error('page did not render its root');
console.log('ok: slot', options.name, options.id, 'order', options.order, 'html', html.length, 'bytes');
