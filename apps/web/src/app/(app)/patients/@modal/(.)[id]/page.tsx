import { PatientDetailsModal } from '@/features/patients/components/patient-details-view';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientDetailsModal id={id} />;
}
