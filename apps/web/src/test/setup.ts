import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { resetDb } from './msw/handlers';
import { server } from './msw/server';
import { resetNavigation } from './next-navigation';

vi.mock('next/navigation', () => import('./next-navigation'));

// findBy*/waitFor default to 1s. Flows like debounced search (300ms) + fetch + re-render fit
// easily locally but not always on shared CI runners.
configure({ asyncUtilTimeout: 3000 });

// jsdom gaps that Radix primitives and Sonner rely on. The DOM typings claim these always
// exist, hence a runtime `in` check rather than `??=`.
function polyfill(target: object, members: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(members)) {
    if (!(name in target))
      Object.defineProperty(target, name, { value, writable: true, configurable: true });
  }
}
const noop = () => undefined;
const isDom = typeof window !== 'undefined';
// Route handlers and proxy.ts tests run in the `node` environment: no DOM to patch there.
if (isDom) {
  polyfill(window, {
    matchMedia: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: noop,
      removeEventListener: noop,
      addListener: noop,
      removeListener: noop,
      dispatchEvent: () => false,
    }),
  });
  polyfill(Element.prototype, {
    scrollIntoView: noop,
    hasPointerCapture: () => false,
    setPointerCapture: noop,
    releasePointerCapture: noop,
  });
  polyfill(globalThis, {
    ResizeObserver: class {
      observe = noop;
      unobserve = noop;
      disconnect = noop;
    },
  });
}

let nativeFetch: typeof fetch;
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  // Browsers resolve relative URLs against the page; Node's fetch does not. Wrap after
  // MSW has patched fetch so requests still flow through the mock server.
  nativeFetch = globalThis.fetch;
  if (!isDom) return;
  globalThis.fetch = (input, init) =>
    nativeFetch(
      typeof input === 'string' && input.startsWith('/')
        ? new URL(input, window.location.origin)
        : input,
      init,
    );
});

afterEach(() => {
  if (isDom) cleanup();
  // Sonner keeps toasts in a module-level store; without this they leak into the next test.
  toast.dismiss();
  server.resetHandlers();
  resetDb();
  resetNavigation();
});

afterAll(() => {
  globalThis.fetch = nativeFetch;
  server.close();
});
