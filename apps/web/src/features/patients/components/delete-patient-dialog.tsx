'use client';

import { type Patient } from '@pm/contracts';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { fullName } from '../lib/format';

export function DeletePatientDialog({
  patient,
  onOpenChange,
  onConfirm,
}: {
  patient: Patient | undefined;
  onOpenChange: (open: boolean) => void;
  onConfirm: (patient: Patient) => void;
}) {
  return (
    <AlertDialog open={Boolean(patient)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {patient ? fullName(patient) : 'patient'}?</AlertDialogTitle>
          <AlertDialogDescription>
            The patient will no longer appear in your organization’s records. For compliance, the
            underlying record is archived rather than permanently erased.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => patient && onConfirm(patient)}>
            Delete patient
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
