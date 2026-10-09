import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors the real layout row-for-row, so content replaces it without any layout shift. */
export function PatientsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading patients">
      <div className="bg-muted/50 hidden h-10 items-center gap-4 border-b px-5 md:flex">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="ml-auto hidden h-3 w-24 lg:block" />
      </div>
      <ul className="divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-4 py-3.5 md:px-5">
            <Skeleton className="size-9 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton
                className="h-3.5"
                style={{ width: `${String(28 + ((index * 37) % 30))}%` }}
              />
              <Skeleton className="h-3 w-2/5 md:hidden lg:hidden" />
            </div>
            <Skeleton className="hidden h-3.5 w-40 lg:block" />
            <Skeleton className="hidden h-3.5 w-28 lg:block" />
            <Skeleton className="hidden h-3.5 w-28 md:block" />
            <Skeleton className="size-8 rounded-md" />
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading patients…</span>
    </div>
  );
}
