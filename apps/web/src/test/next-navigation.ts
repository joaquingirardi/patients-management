import * as React from 'react';
import { vi } from 'vitest';

/** Stand-in for `next/navigation` where router.push/replace update what useSearchParams sees. */
let url = new URL('http://localhost/patients');
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function navigate(href: string) {
  url = new URL(href, url);
  listeners.forEach((listener) => listener());
}

export const router = {
  push: vi.fn(navigate),
  replace: vi.fn(navigate),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

export function resetNavigation(href = '/patients'): void {
  url = new URL(href, 'http://localhost');
  Object.values(router).forEach((fn) => fn.mockClear());
}

export const currentUrl = () => url;

export function useRouter() {
  return router;
}

export function usePathname() {
  return React.useSyncExternalStore(subscribe, () => url.pathname);
}

export function useSearchParams() {
  const search = React.useSyncExternalStore(subscribe, () => url.search);
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export function redirect(href: string): never {
  throw new Error(`redirect(${href})`);
}
