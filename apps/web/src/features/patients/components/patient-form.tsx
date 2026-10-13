'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  MIN_DOB,
  type PatientFormValues,
  type PatientInput,
  PatientInputSchema,
} from '@pm/contracts';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

import { localToday } from '../lib/format';

const EMPTY: PatientFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  dob: '',
};

interface PatientFormProps {
  defaultValues?: PatientFormValues;
  submitLabel: string;
  onSubmit: (values: PatientInput) => void;
  onCancel: () => void;
}

/** Validates with the same Zod schema as the API. Errors show once a field is touched. */
export function PatientForm({
  defaultValues = EMPTY,
  submitLabel,
  onSubmit,
  onCancel,
}: PatientFormProps) {
  const form = useForm<PatientFormValues, unknown, PatientInput>({
    resolver: zodResolver(PatientInputSchema),
    defaultValues,
    mode: 'onTouched',
  });
  const { errors, isDirty, isSubmitting } = form.formState;
  const isEdit = defaultValues !== EMPTY;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First name" error={errors.firstName?.message}>
          {/* No autoFocus: Radix Dialog moves focus to the first field on open. */}
          {(field) => <Input {...field} {...form.register('firstName')} autoComplete="off" />}
        </FormField>
        <FormField label="Last name" error={errors.lastName?.message}>
          {(field) => <Input {...field} {...form.register('lastName')} autoComplete="off" />}
        </FormField>
      </div>

      <FormField label="Email" error={errors.email?.message}>
        {(field) => (
          <Input
            {...field}
            {...form.register('email')}
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="name@example.com"
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Phone number"
          description="Include the country code."
          error={errors.phoneNumber?.message}
        >
          {(field) => (
            <Input
              {...field}
              {...form.register('phoneNumber')}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="+1 415 555 0132"
            />
          )}
        </FormField>
        <FormField label="Date of birth" error={errors.dob?.message}>
          {(field) => (
            <Input
              {...field}
              {...form.register('dob')}
              type="date"
              min={MIN_DOB}
              max={localToday()}
            />
          )}
        </FormField>
      </div>

      <DialogFooter className="pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={isEdit && !isDirty}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
