import { type Role } from '@pm/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as React from 'react';
import { Toaster } from 'sonner';

import { TooltipProvider } from '@/components/ui/tooltip';
import { SessionProvider } from '@/features/auth/session-provider';
import { PatientActionsProvider } from '@/features/patients/components/patient-actions-provider';

export function renderWithProviders(
  ui: React.ReactElement,
  { role = 'admin' }: { role?: Role } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const session = {
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: `${role}@test.dev`,
      name: 'Test User',
      role,
    },
    expiresAt: Date.now() + 30 * 60_000,
    serverNow: Date.now(),
  };

  return {
    user: userEvent.setup(),
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SessionProvider session={session}>
            <PatientActionsProvider>{ui}</PatientActionsProvider>
          </SessionProvider>
        </TooltipProvider>
        <Toaster />
      </QueryClientProvider>,
    ),
  };
}
