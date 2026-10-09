import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PatientsPage } from '@/features/patients/components/patients-page';
import { PatientsSkeleton } from '@/features/patients/components/patients-skeleton';

export const metadata: Metadata = { title: { absolute: 'Patients' } };

export default function Page() {
  return (
    <Suspense fallback={<PatientsSkeleton />}>
      <PatientsPage />
    </Suspense>
  );
}
