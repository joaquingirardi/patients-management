import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';

import { router } from '@/test/next-navigation';

import { SessionProvider } from './session-provider';

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'a@b.test',
  name: 'A',
  role: 'admin' as const,
};

function renderSession(expiresInMs: number) {
  const serverNow = Date.parse('2026-01-01T12:00:00Z');
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionProvider session={{ user, serverNow, expiresAt: serverNow + expiresInMs }}>
        <p>app</p>
      </SessionProvider>
    </QueryClientProvider>,
  );
}

describe('SessionProvider expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
  });
  afterEach(() => vi.useRealTimers());

  it('is immune to a client clock that is hours ahead of the server', async () => {
    vi.setSystemTime(Date.parse('2026-01-01T18:00:00Z')); // 6 h ahead of the server
    renderSession(10 * 60_000);
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('ends the session at expiry and sends the user back with ?reason=expired', async () => {
    renderSession(10 * 60_000);
    await act(() => vi.advanceTimersByTimeAsync(10 * 60_000 + 10));
    expect(router.replace).toHaveBeenCalledWith(
      expect.stringMatching(/^\/login\?reason=expired&next=/),
    );
  });
});
