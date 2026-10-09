import { redirect } from 'next/navigation';
import type * as React from 'react';

import { AppHeader } from '@/components/layout/app-header';
import { SkipLink } from '@/components/layout/skip-link';
import { SessionProvider } from '@/features/auth/session-provider';
import { getSession } from '@/lib/session/get-session';

/** Authenticated shell. `proxy.ts` already gates these routes; this is defence in depth. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <SessionProvider session={session}>
      <SkipLink />
      <AppHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-6 outline-none sm:px-6 sm:py-8"
      >
        {children}
      </main>
    </SessionProvider>
  );
}
