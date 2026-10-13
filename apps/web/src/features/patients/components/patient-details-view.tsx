'use client';

import { ErrorCode } from '@pm/contracts';
import { ArrowLeft, UserX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { isApiError } from '@/lib/api/problem';

import { usePatient } from '../hooks/use-patients';
import { PatientDetails } from './patient-details';

function DetailsBody({
  id,
  inModal,
  onDeleted,
}: {
  id: string;
  inModal: boolean;
  onDeleted: () => void;
}) {
  const { data, error, isPending, refetch, isFetching } = usePatient(id);

  if (isPending) return <DetailsSkeleton />;
  if (
    isApiError(error, ErrorCode.NotFound) ||
    (error && isApiError(error, ErrorCode.ValidationFailed))
  ) {
    return (
      <EmptyState
        icon={<UserX />}
        title="Patient not found"
        description="This patient does not exist or has been deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/patients">Back to patients</Link>
          </Button>
        }
      />
    );
  }
  if (!data)
    return (
      <ErrorState
        error={error}
        title="Couldn't load this patient"
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    );
  return <PatientDetails patient={data} titleAs={inModal ? 'h2' : 'h1'} onDeleted={onDeleted} />;
}

/** Soft navigation from the list: details open in a modal over the list (intercepted route). */
export function PatientDetailsModal({ id }: { id: string }) {
  const router = useRouter();
  // After a delete the row that opened the modal is gone, so Radix cannot return focus to it.
  const deletedRef = React.useRef(false);
  return (
    <Dialog defaultOpen onOpenChange={(open) => !open && router.back()}>
      <DialogContent
        className="sm:max-w-xl"
        // A read-only view has no "first field": focus the dialog itself so screen readers
        // announce it and no control (e.g. a tooltip trigger) is activated by accident.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
        onCloseAutoFocus={(event) => {
          if (!deletedRef.current) return;
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        <DialogTitle className="sr-only">Patient details</DialogTitle>
        <DialogDescription className="sr-only">The full patient record.</DialogDescription>
        <DetailsBody
          id={id}
          inModal
          onDeleted={() => {
            deletedRef.current = true;
            router.back();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Direct visit / reload / shared link: the same details as a full page. */
export function PatientDetailsPage({ id }: { id: string }) {
  const router = useRouter();
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground -ml-2 w-fit">
        <Link href="/patients">
          <ArrowLeft aria-hidden />
          All patients
        </Link>
      </Button>
      <div className="bg-card rounded-xl border p-6 shadow-sm sm:p-8">
        <DetailsBody id={id} inModal={false} onDeleted={() => router.replace('/patients')} />
      </div>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div role="status" aria-label="Loading patient" className="grid gap-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="grid gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}
