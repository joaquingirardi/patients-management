import { type ListPatientsQuery } from '@pm/contracts';

/** Invalidating `patientKeys.lists()` refreshes every page/sort/search but leaves details alone. */
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (query: ListPatientsQuery) => [...patientKeys.lists(), query] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

export const patientMutationKeys = {
  create: [...patientKeys.all, 'create'] as const,
  update: [...patientKeys.all, 'update'] as const,
  remove: [...patientKeys.all, 'remove'] as const,
};
