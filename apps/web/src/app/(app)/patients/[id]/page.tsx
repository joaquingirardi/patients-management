import type { Metadata } from 'next';

import { PatientDetailsPage } from '@/features/patients/components/patient-details-view';

export const metadata: Metadata = { title: 'Patient details' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientDetailsPage id={id} />;
}
