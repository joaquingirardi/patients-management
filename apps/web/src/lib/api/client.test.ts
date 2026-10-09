import { ErrorCode, PatientSchema } from '@pm/contracts';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/msw/server';

import { apiRequest, onUnauthorized } from './client';
import { ApiError } from './problem';

describe('apiRequest', () => {
  it('turns Problem Details into a typed ApiError with code, request id and Retry-After', async () => {
    server.use(
      http.get('*/api/proxy/patients/x', () =>
        HttpResponse.json(
          {
            type: 'urn:x',
            title: 'Unavailable',
            status: 503,
            code: 'SERVICE_UNAVAILABLE',
            detail: 'Down',
            requestId: 'r-1',
          },
          { status: 503, headers: { 'Retry-After': '2' } },
        ),
      ),
    );
    const error = await apiRequest('patients/x', { schema: PatientSchema }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 503,
      code: ErrorCode.ServiceUnavailable,
      requestId: 'r-1',
      retryAfterSeconds: 2,
      isTransient: true,
      message: 'Down',
    });
  });

  it('copes with non-JSON error bodies (e.g. an HTML 502 from a proxy)', async () => {
    server.use(
      http.get(
        '*/api/proxy/patients/x',
        () => new HttpResponse('<html>Bad gateway</html>', { status: 502 }),
      ),
    );
    await expect(apiRequest('patients/x', { schema: PatientSchema })).rejects.toMatchObject({
      status: 502,
      isTransient: true,
    });
  });

  it('maps network failures to a transient ApiError', async () => {
    server.use(http.get('*/api/proxy/patients/x', () => HttpResponse.error()));
    await expect(apiRequest('patients/x', { schema: PatientSchema })).rejects.toMatchObject({
      status: 0,
      isTransient: true,
    });
  });

  it('notifies unauthorized listeners on 401', async () => {
    server.use(
      http.get('*/api/proxy/patients/x', () =>
        HttpResponse.json(
          { type: 'x', title: 'x', status: 401, code: 'TOKEN_EXPIRED' },
          { status: 401 },
        ),
      ),
    );
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    await apiRequest('patients/x', { schema: PatientSchema }).catch(() => undefined);
    unsubscribe();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ code: ErrorCode.TokenExpired }),
    );
  });

  it('validates successful responses against the contract', async () => {
    server.use(
      http.get('*/api/proxy/patients/x', () => HttpResponse.json({ id: 'not-a-patient' })),
    );
    await expect(apiRequest('patients/x', { schema: PatientSchema })).rejects.toThrow();
  });
});
