'use client';

import { type Patient, type PatientInput } from '@pm/contracts';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { fullName } from '../lib/format';
import { PatientForm } from './patient-form';

interface PatientFormDialogProps {
  open: boolean;
  /** Present when editing, absent when creating. */
  patient?: Patient;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PatientInput) => void;
}

export function PatientFormDialog({
  open,
  patient,
  onOpenChange,
  onSubmit,
}: PatientFormDialogProps) {
  const isEdit = Boolean(patient);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit patient' : 'New patient'}</DialogTitle>
          <DialogDescription>
            {patient
              ? `Update ${fullName(patient)}’s details. All fields are required.`
              : 'Add a patient to your organization. All fields are required.'}
          </DialogDescription>
        </DialogHeader>
        {/* Keyed so the form re-initialises when switching between patients. */}
        <PatientForm
          key={patient ? `${patient.id}:${String(patient.version)}` : 'new'}
          defaultValues={
            patient && {
              firstName: patient.firstName,
              lastName: patient.lastName,
              email: patient.email,
              phoneNumber: patient.phoneNumber,
              dob: patient.dob,
            }
          }
          submitLabel={isEdit ? 'Save changes' : 'Create patient'}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
