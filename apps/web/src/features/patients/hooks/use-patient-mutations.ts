'use client';

import {
  ErrorCode,
  type ListPatientsQuery,
  type Patient,
  type PatientInput,
  type PatientList,
  type UpdatePatientInput,
} from '@pm/contracts';
import {
  type QueryClient,
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';

import { isApiError } from '@/lib/api/problem';

import { patientsApi } from '../api/patients-api';
import { patientKeys, patientMutationKeys } from '../api/query-keys';
import { fullName } from '../lib/format';

/** Rows created optimistically carry a temporary id until the server assigns the real one. */
export const OPTIMISTIC_ID_PREFIX = 'optimistic-';
export const isOptimistic = (patient: Pick<Patient, 'id'>) =>
  patient.id.startsWith(OPTIMISTIC_ID_PREFIX);

/*
 * Cache helpers. Rollbacks undo the change on the affected row only, rather than restoring the
 * whole cache from a snapshot: with several mutations in flight (delete A, then delete B),
 * restoring A's snapshot would resurrect B while B's delete is still pending.
 */
function updateLists(queryClient: QueryClient, update: (list: PatientList) => PatientList): void {
  queryClient.setQueriesData<PatientList>({ queryKey: patientKeys.lists() }, (list) =>
    list ? update(list) : list,
  );
}

function replaceRow(queryClient: QueryClient, patient: Patient, matchId = patient.id): void {
  updateLists(queryClient, (list) => ({
    ...list,
    data: list.data.map((row) => (row.id === matchId ? patient : row)),
  }));
}

function removeRow(queryClient: QueryClient, id: string): void {
  updateLists(queryClient, (list) => {
    const data = list.data.filter((row) => row.id !== id);
    return { ...list, data, total: list.total - (list.data.length - data.length) };
  });
}

/** Where a row sat in each cached list, so a failed delete can put it back exactly there. */
type RowPositions = Map<string, number>;

function positionsOf(queryClient: QueryClient, id: string): RowPositions {
  const positions: RowPositions = new Map();
  for (const [key, list] of queryClient.getQueriesData<PatientList>({
    queryKey: patientKeys.lists(),
  })) {
    const index = list?.data.findIndex((row) => row.id === id) ?? -1;
    if (index >= 0) positions.set(JSON.stringify(key), index);
  }
  return positions;
}

function reinsertRow(queryClient: QueryClient, patient: Patient, positions: RowPositions): void {
  for (const [key, list] of queryClient.getQueriesData<PatientList>({
    queryKey: patientKeys.lists(),
  })) {
    const index = positions.get(JSON.stringify(key));
    if (!list || index === undefined || list.data.some((row) => row.id === patient.id)) continue;
    const data = [...list.data];
    data.splice(index, 0, patient);
    queryClient.setQueryData<PatientList>(key, { ...list, data, total: list.total + 1 });
  }
}

/**
 * A write whose outcome is unknown (connection lost mid-flight) must not be blindly retried,
 * since it may already have been applied. Refetch and tell the user instead.
 */
function handleOutcomeUnknown(queryClient: QueryClient, error: unknown): boolean {
  if (!isApiError(error, ErrorCode.OutcomeUnknown)) return false;
  void queryClient.invalidateQueries({ queryKey: patientKeys.all });
  toast.warning("We couldn't confirm that change", {
    description:
      'The connection dropped while saving. The list has been refreshed, so check it before trying again.',
  });
  return true;
}

/**
 * Revalidate only when the last in-flight patients mutation settles. Refetching earlier would
 * pull server state that does not yet include the other pending changes, briefly undoing their
 * optimistic updates (e.g. a row whose delete is still in flight would reappear).
 */
function revalidateWhenIdle(
  queryClient: QueryClient,
  ...keys: (readonly unknown[])[]
): Promise<unknown> {
  if (queryClient.isMutating({ mutationKey: patientKeys.all }) > 1) return Promise.resolve();
  return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

const describe = (error: unknown) =>
  isApiError(error) ? error.message : 'Something went wrong. Please try again.';

// Toast actions are created in earlier renders; this keeps "Retry" pointing at the current `mutate`.
function useLatest<T>(value: T) {
  const ref = React.useRef(value);
  React.useEffect(() => {
    ref.current = value;
  });
  return ref;
}

export function useCreatePatient(listQuery: ListPatientsQuery) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: patientMutationKeys.create,
    mutationFn: (input: PatientInput) => patientsApi.create(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: patientKeys.lists() });
      const now = new Date().toISOString();
      const optimistic: Patient = {
        ...input,
        id: `${OPTIMISTIC_ID_PREFIX}${crypto.randomUUID()}`,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      queryClient.setQueryData<PatientList>(patientKeys.list(listQuery), (list) =>
        list
          ? {
              ...list,
              data: [optimistic, ...list.data].slice(0, list.limit),
              total: list.total + 1,
            }
          : list,
      );
      return { optimisticId: optimistic.id };
    },
    onSuccess: (patient, _input, context) => {
      queryClient.setQueryData(patientKeys.detail(patient.id), patient);
      replaceRow(queryClient, patient, context.optimisticId);
      toast.success(`${fullName(patient)} was added`);
    },
    onError: (error, input, context) => {
      if (context) removeRow(queryClient, context.optimisticId);
      if (handleOutcomeUnknown(queryClient, error)) return;
      toast.error(`Couldn't add ${fullName(input)}`, {
        description: describe(error),
        action: { label: 'Retry', onClick: () => latest.current(input) },
      });
    },
    onSettled: () => revalidateWhenIdle(queryClient, patientKeys.lists()),
  });
  const latest = useLatest(mutation.mutate);
  return mutation;
}

/**
 * Optimistic update with optimistic concurrency: the edit shows immediately. If someone else
 * saved first the server answers 409, so we revert the row, fetch the latest version and let the
 * user review it rather than overwrite their colleague's change.
 */
export function useUpdatePatient({ onConflict }: { onConflict?: (latest: Patient) => void } = {}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: patientMutationKeys.update,
    mutationFn: ({ id, input }: { id: string; input: UpdatePatientInput; previous: Patient }) =>
      patientsApi.update(id, input),
    onMutate: async ({ id, input, previous }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: patientKeys.lists() }),
        queryClient.cancelQueries({ queryKey: patientKeys.detail(id) }),
      ]);
      const { version: _version, ...fields } = input;
      const optimistic: Patient = { ...previous, ...fields };
      replaceRow(queryClient, optimistic);
      queryClient.setQueryData(patientKeys.detail(id), optimistic);
    },
    onSuccess: (patient) => {
      queryClient.setQueryData(patientKeys.detail(patient.id), patient);
      replaceRow(queryClient, patient);
      toast.success('Changes saved');
    },
    onError: async (error, variables) => {
      replaceRow(queryClient, variables.previous);
      queryClient.setQueryData(patientKeys.detail(variables.id), variables.previous);
      if (handleOutcomeUnknown(queryClient, error)) return;

      if (isApiError(error, ErrorCode.VersionConflict)) {
        // Bypass the cache: the cached detail is the stale version that caused the conflict.
        const latest = await patientsApi.get(variables.id).catch(() => undefined);
        if (latest) {
          queryClient.setQueryData(patientKeys.detail(latest.id), latest);
          replaceRow(queryClient, latest);
        }
        toast.warning('Someone else updated this patient', {
          description:
            'Your changes were not saved. Review the latest version and apply them again.',
          ...(latest && onConflict
            ? { action: { label: 'Review', onClick: () => onConflict(latest) } }
            : {}),
        });
        return;
      }
      if (isApiError(error, ErrorCode.NotFound)) {
        toast.error('This patient no longer exists', {
          description: 'It may have been deleted by someone else.',
        });
        return;
      }
      toast.error("Couldn't save changes", {
        description: describe(error),
        action: { label: 'Retry', onClick: () => latest.current(variables) },
      });
    },
    onSettled: (_data, _error, { id }) =>
      revalidateWhenIdle(queryClient, patientKeys.lists(), patientKeys.detail(id)),
  });
  const latest = useLatest(mutation.mutate);
  return mutation;
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: patientMutationKeys.remove,
    mutationFn: (patient: Patient) => patientsApi.remove(patient.id),
    onMutate: async (patient) => {
      await queryClient.cancelQueries({ queryKey: patientKeys.lists() });
      const positions = positionsOf(queryClient, patient.id);
      removeRow(queryClient, patient.id);
      return { positions };
    },
    onSuccess: (_result, patient) => {
      queryClient.removeQueries({ queryKey: patientKeys.detail(patient.id) });
      toast.success(`${fullName(patient)} was deleted`);
    },
    onError: (error, patient, context) => {
      // Already deleted elsewhere, which is what the user wanted, so don't roll back.
      if (isApiError(error, ErrorCode.NotFound)) {
        toast.info(`${fullName(patient)} was already deleted`);
        return;
      }
      if (handleOutcomeUnknown(queryClient, error)) return;
      if (context) reinsertRow(queryClient, patient, context.positions);
      toast.error(`Couldn't delete ${fullName(patient)}`, {
        description: describe(error),
        action: { label: 'Retry', onClick: () => latest.current(patient) },
      });
    },
    onSettled: () => revalidateWhenIdle(queryClient, patientKeys.lists()),
  });
  const latest = useLatest(mutation.mutate);
  return mutation;
}

export function usePendingPatientIds(): ReadonlySet<string> {
  const updating = useMutationState({
    filters: { mutationKey: patientMutationKeys.update, status: 'pending' },
    select: (mutation) => (mutation.state.variables as { id: string } | undefined)?.id,
  });
  const removing = useMutationState({
    filters: { mutationKey: patientMutationKeys.remove, status: 'pending' },
    select: (mutation) => (mutation.state.variables as Patient | undefined)?.id,
  });
  return React.useMemo(
    () => new Set([...updating, ...removing].filter((id): id is string => Boolean(id))),
    [updating, removing],
  );
}
