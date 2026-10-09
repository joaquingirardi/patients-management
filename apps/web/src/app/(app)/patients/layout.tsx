import type * as React from 'react';

import { PatientActionsProvider } from '@/features/patients/components/patient-actions-provider';

/**
 * `modal` is a parallel route slot. Navigating from the list to /patients/:id is intercepted
 * and renders the details in a dialog *over* the list (list state is preserved underneath);
 * a reload or shared link renders the full page instead. Both share one actions provider.
 */
export default function PatientsLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <PatientActionsProvider>
      {children}
      {modal}
    </PatientActionsProvider>
  );
}
