'use client';

import { type Patient, Permission } from '@pm/contracts';
import dynamic from 'next/dynamic';
import * as React from 'react';

import { useCan } from '@/features/auth/session-provider';

import {
  useCreatePatient,
  useDeletePatient,
  useUpdatePatient,
} from '../hooks/use-patient-mutations';
import { usePatientsSearchParams } from '../lib/use-patients-search-params';

/*
 * Write-only UI is code-split: the form dialog (react-hook-form, the resolver, the form itself) and
 * the delete confirmation load as separate chunks after first paint, and only for users who can
 * write.
 */
const PatientFormDialog = dynamic(
  () => import('./patient-form-dialog').then((m) => m.PatientFormDialog),
  {
    ssr: false,
  },
);
const DeletePatientDialog = dynamic(
  () => import('./delete-patient-dialog').then((m) => m.DeletePatientDialog),
  { ssr: false },
);

type FormState = { open: false; patient?: Patient } | { open: true; patient?: Patient };

interface PatientActions {
  openCreate: () => void;
  openEdit: (patient: Patient) => void;
  confirmDelete: (patient: Patient, options?: { onDeleted?: () => void }) => void;
}

const PatientActionsContext = React.createContext<PatientActions | null>(null);

/**
 * Owns the create/edit/delete dialogs and their mutations, so the table row, mobile card,
 * details modal and details page all trigger the same flow. Dialogs close immediately on
 * submit because the optimistic cache update already shows the result.
 */
export function PatientActionsProvider({ children }: { children: React.ReactNode }) {
  const { query } = usePatientsSearchParams();
  const [form, setForm] = React.useState<FormState>({ open: false });
  const [pendingDelete, setPendingDelete] = React.useState<{
    patient: Patient;
    onDeleted?: () => void;
  }>();

  const canWrite = useCan(Permission.PatientsWrite);
  const openEdit = React.useCallback((patient: Patient) => setForm({ open: true, patient }), []);
  const create = useCreatePatient(query);
  const update = useUpdatePatient({ onConflict: openEdit });
  const remove = useDeletePatient();

  const actions = React.useMemo<PatientActions>(
    () => ({
      openCreate: () => setForm({ open: true }),
      openEdit,
      confirmDelete: (patient, options) => setPendingDelete({ patient, ...options }),
    }),
    [openEdit],
  );

  return (
    <PatientActionsContext value={actions}>
      {children}
      {canWrite && (
        <>
          <PatientFormDialog
            open={form.open}
            patient={form.patient}
            // Keep `patient` while closing so the exit animation does not flash the "create" title.
            onOpenChange={(open) => setForm((state) => ({ ...state, open }))}
            onSubmit={(values) => {
              const { patient } = form;
              if (patient)
                update.mutate({
                  id: patient.id,
                  input: { ...values, version: patient.version },
                  previous: patient,
                });
              else create.mutate(values);
              setForm((state) => ({ ...state, open: false }));
            }}
          />
          <DeletePatientDialog
            patient={pendingDelete?.patient}
            onOpenChange={(open) => !open && setPendingDelete(undefined)}
            onConfirm={(patient) => {
              remove.mutate(patient);
              pendingDelete?.onDeleted?.();
              setPendingDelete(undefined);
            }}
          />
        </>
      )}
    </PatientActionsContext>
  );
}

export function usePatientActions(): PatientActions {
  const context = React.use(PatientActionsContext);
  if (!context) throw new Error('usePatientActions must be used within <PatientActionsProvider>');
  return context;
}
