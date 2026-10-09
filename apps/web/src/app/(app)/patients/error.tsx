'use client';

import { ErrorState } from '@/components/feedback/error-state';

/** Render-time failures inside the patients area are contained here; the shell keeps working. */
export default function PatientsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <ErrorState error={error} onRetry={reset} />
    </div>
  );
}
