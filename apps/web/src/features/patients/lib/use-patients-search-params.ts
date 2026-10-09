'use client';

import { type ListPatientsQuery, ListPatientsQuerySchema } from '@pm/contracts';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

const DEFAULTS = ListPatientsQuerySchema.parse({});
// Explicit list: optional keys (e.g. `search`) are absent from DEFAULTS, so Object.keys() would miss them.
const QUERY_KEYS = Object.keys(ListPatientsQuerySchema.shape) as (keyof ListPatientsQuery)[];

/** Parses the URL leniently: a hand-edited `?page=abc` falls back to defaults instead of erroring. */
export function parseListQuery(params: URLSearchParams): ListPatientsQuery {
  const raw = Object.fromEntries(params.entries());
  const result = ListPatientsQuerySchema.safeParse(raw);
  if (result.success) return result.data;
  // Keep whichever individual fields are valid.
  const query = { ...DEFAULTS };
  for (const key of QUERY_KEYS) {
    const single = ListPatientsQuerySchema.safeParse({ [key]: raw[key] });
    if (single.success) Object.assign(query, { [key]: single.data[key] });
  }
  return query;
}

/**
 * The URL is the single source of truth for list state: search, sort and pagination survive
 * reloads, can be shared as links, and work with the back button. Defaults are omitted from
 * the URL to keep it clean.
 */
export function usePatientsSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = React.useMemo(
    () => parseListQuery(new URLSearchParams(searchParams)),
    [searchParams],
  );

  const setQuery = React.useCallback(
    (
      patch: Partial<ListPatientsQuery>,
      { history = 'push' }: { history?: 'push' | 'replace' } = {},
    ) => {
      // Any change other than paging sends the user back to the first page.
      const next = { ...query, ...patch, ...('page' in patch ? {} : { page: 1 }) };
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) {
        if (value !== undefined && value !== DEFAULTS[key as keyof ListPatientsQuery]) {
          params.set(key, String(value));
        }
      }
      const href = (params.size ? `${pathname}?${params.toString()}` : pathname) as '/patients';
      router[history](href, { scroll: false });
    },
    [pathname, query, router],
  );

  return { query, setQuery };
}

/**
 * Links to a patient carry the current list query along. With the intercepted-route modal the
 * list stays mounted underneath and keeps reading `useSearchParams()`; without the query it would
 * see defaults and reset (refetch page 1, clear the search box) the moment the modal opens.
 */
export function usePatientHref(): (id: string) => `/patients/${string}` {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  return React.useCallback(
    (id: string) => `/patients/${id}${search ? `?${search}` : ''}` as const,
    [search],
  );
}
