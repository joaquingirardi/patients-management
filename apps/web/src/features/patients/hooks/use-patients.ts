'use client';

import { type ListPatientsQuery, type Patient, type PatientList, totalPages } from '@pm/contracts';
import {
  keepPreviousData,
  type QueryClient,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as React from 'react';

import { patientsApi } from '../api/patients-api';
import { patientKeys } from '../api/query-keys';

export function usePatientsList(query: ListPatientsQuery) {
  const queryClient = useQueryClient();
  const result = useQuery({
    queryKey: patientKeys.list(query),
    queryFn: ({ signal }) => patientsApi.list(query, signal),
    // While the next page/sort loads, keep showing the previous rows (dimmed) instead of a
    // skeleton flash — the layout stays put and the interaction feels instant.
    placeholderData: keepPreviousData,
  });

  // Prefetch the next page so "Next" is usually instant.
  const { data } = result;
  React.useEffect(() => {
    if (!data || query.page >= totalPages(data)) return;
    const nextQuery = { ...query, page: query.page + 1 };
    queryClient
      .query({
        queryKey: patientKeys.list(nextQuery),
        queryFn: ({ signal }) => patientsApi.list(nextQuery, signal),
      })
      .catch(noop); // best effort: the real request will surface any error
  }, [data, query, queryClient]);

  return result;
}

export function usePatient(id: string) {
  const queryClient = useQueryClient();
  // Opening a row from the list renders instantly from the list cache. The seed is stamped with
  // the *list's* fetch time, so it is revalidated as soon as it is older than `staleTime`.
  const seed = React.useMemo(() => findInLists(queryClient, id), [queryClient, id]);
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: ({ signal }) => patientsApi.get(id, signal),
    initialData: seed?.patient,
    initialDataUpdatedAt: seed?.updatedAt,
  });
}

/** Warm the detail cache on hover/focus so the details view opens with data already there. */
export function usePrefetchPatient() {
  const queryClient = useQueryClient();
  return React.useCallback(
    (id: string) => {
      queryClient
        .query({
          queryKey: patientKeys.detail(id),
          queryFn: ({ signal }) => patientsApi.get(id, signal),
        })
        .catch(noop);
    },
    [queryClient],
  );
}

function noop(): void {
  // intentionally empty
}

function findInLists(
  queryClient: QueryClient,
  id: string,
): { patient: Patient; updatedAt: number } | undefined {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: patientKeys.lists() })) {
    const patient = (query.state.data as PatientList | undefined)?.data.find(
      (row) => row.id === id,
    );
    if (patient) return { patient, updatedAt: query.state.dataUpdatedAt };
  }
  return undefined;
}
