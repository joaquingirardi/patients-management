const FALLBACK = '/patients';
const SENTINEL_ORIGIN = 'http://safe-redirect.invalid';

/**
 * Only same-origin paths are allowed as post-login destinations. Rather than pattern-matching
 * strings (which browsers normalise in surprising ways: tabs and newlines are stripped, so
 * "/\t/evil.test" becomes "//evil.test"), the value is parsed exactly as the browser would and
 * rejected unless it stays on our origin. Only the path, query and hash are kept.
 */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next?.startsWith('/')) return FALLBACK;
  let url: URL;
  try {
    url = new URL(next, SENTINEL_ORIGIN);
  } catch {
    return FALLBACK;
  }
  if (url.origin !== SENTINEL_ORIGIN) return FALLBACK;
  if (url.pathname.startsWith('/login') || url.pathname.startsWith('/api')) return FALLBACK;
  return `${url.pathname}${url.search}${url.hash}`;
}
