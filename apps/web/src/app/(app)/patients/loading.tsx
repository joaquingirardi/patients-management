import { Skeleton } from '@/components/ui/skeleton';
import { PatientsSkeleton } from '@/features/patients/components/patients-skeleton';

export default function Loading() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-full sm:max-w-sm" />
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <PatientsSkeleton />
      </div>
    </div>
  );
}
