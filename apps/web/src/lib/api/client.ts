import { type z } from 'zod';

import { ApiError, toApiError } from './problem';

/** All browser → API traffic goes through the same-origin BFF proxy (cookie → Bearer). */
const BASE = '/api/proxy';

type Listener = (error: ApiError) => void;
const unauthorizedListeners = new Set<Listener>();

/** Lets the session layer react to a 401 from *any* request (expired or revoked session). */
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

interface RequestOptions<TSchema extends z.ZodType> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Responses are validated at the boundary: contract drift fails loudly, not subtly. */
  schema: TSchema;
  signal?: AbortSignal;
}

export async function apiRequest<TSchema extends z.ZodType>(
  path: string,
  { method = 'GET', query, body, schema, signal }: RequestOptions<TSchema>,
): Promise<z.output<TSchema>> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const url = `${BASE}/${path}${search.size ? `?${search.toString()}` : ''}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw ApiError.network();
  }

  if (!response.ok) {
    const error = await toApiError(response);
    if (error.status === 401) unauthorizedListeners.forEach((listener) => listener(error));
    throw error;
  }
  return schema.parse(await response.json());
}
