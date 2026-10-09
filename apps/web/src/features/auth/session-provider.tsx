'use client';

import { hasPermission, type Permission } from '@pm/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { onUnauthorized } from '@/lib/api/client';
import { type Session } from '@/lib/session/types';

interface SessionContextValue {
  session: Session;
  can: (permission: Permission) => boolean;
  signOut: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

const WARN_BEFORE_EXPIRY_MS = 60_000;
const MAX_TIMEOUT_MS = 2_147_483_647; // setTimeout overflows above 2^31-1 ms

/**
 * Client-side session: role-aware rendering plus *proactive* expiry handling. Two paths lead to
 * the same "session expired" flow so the user is never stuck on a broken screen:
 *   1. a timer fires at the token's `exp` (with a one-minute heads-up), and
 *   2. any API call answered with 401 (token revoked, clock skew, server restart with new key).
 */
export function SessionProvider({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const endedRef = React.useRef(false);

  const endSession = React.useCallback(
    async (reason: 'expired' | 'signed-out') => {
      if (endedRef.current) return;
      endedRef.current = true;
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
      queryClient.clear(); // never leave one user's patient data cached for the next
      if (reason === 'expired') {
        toast.warning('Your session has expired', { description: 'Please sign in again.' });
        // Keep the full location (search, sort, page) so re-login lands exactly where they were.
        const next = `${window.location.pathname}${window.location.search}`;
        const params = new URLSearchParams({ reason: 'expired', next });
        router.replace(`/login?${params.toString()}`);
      } else {
        router.replace('/login');
      }
      router.refresh();
    },
    [queryClient, router],
  );

  React.useEffect(() => onUnauthorized(() => void endSession('expired')), [endSession]);

  React.useEffect(() => {
    const remaining = session.expiresAt - session.serverNow; // relative: immune to client clock skew
    const warn = setTimeout(
      () => {
        toast.info('Your session expires in about a minute', {
          description: 'Save your work — you will need to sign in again.',
        });
      },
      Math.min(Math.max(0, remaining - WARN_BEFORE_EXPIRY_MS), MAX_TIMEOUT_MS),
    );
    const expire = setTimeout(
      () => void endSession('expired'),
      Math.min(Math.max(0, remaining), MAX_TIMEOUT_MS),
    );
    return () => {
      clearTimeout(warn);
      clearTimeout(expire);
    };
  }, [endSession, session.expiresAt, session.serverNow]);

  const value = React.useMemo<SessionContextValue>(
    () => ({
      session,
      can: (permission) => hasPermission(session.user.role, permission),
      signOut: () => endSession('signed-out'),
    }),
    [endSession, session],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const context = React.use(SessionContext);
  if (!context) throw new Error('useSession must be used within <SessionProvider>');
  return context;
}

/** Same permission map as the API (from @pm/contracts) — UI gating can never drift from policy. */
export function useCan(permission: Permission): boolean {
  return useSession().can(permission);
}

export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return useCan(permission) ? children : fallback;
}
