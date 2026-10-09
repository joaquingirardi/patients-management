import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';

import { isExpired, readClaims, SESSION_COOKIE } from './claims';
import { type Session } from './types';

/** Request-scoped (memoised per render) session lookup for Server Components. */
export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const claims = readClaims(store.get(SESSION_COOKIE)?.value);
  if (!claims || isExpired(claims)) return null;
  return {
    user: { id: claims.sub, email: claims.email, name: claims.name, role: claims.role },
    expiresAt: claims.exp * 1000,
    serverNow: Date.now(),
  };
});

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
