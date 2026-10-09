'use client';

import { type PatientSortField, Permission, type SortOrder, totalPages } from '@pm/contracts';
import { AlertTriangle, Eye, Plus, SearchX, UserPlus, Users } from 'lucide-react';
import * as React from 'react';

import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { Can, useCan } from '@/features/auth/session-provider';
import { cn } from '@/lib/utils';

import { usePendingPatientIds } from '../hooks/use-patient-mutations';
import { usePatientsList } from '../hooks/use-patients';
import { usePatientsSearchParams } from '../lib/use-patients-search-params';
import { usePatientActions } from './patient-actions-provider';
import { PatientsCardList } from './patients-card-list';
import { PatientsPagination } from './patients-pagination';
import { PatientsSkeleton } from './patients-skeleton';
import { PatientsTable } from './patients-table';
import { PatientsToolbar } from './patients-toolbar';

export function PatientsPage() {
  const { query, setQuery } = usePatientsSearchParams();
  const { data, error, isPending, isError, isFetching, isPlaceholderData, refetch } =
    usePatientsList(query);
  const pendingIds = usePendingPatientIds();
  const canWrite = useCan(Permission.PatientsWrite);
  const { openCreate } = usePatientActions();

  const onSearch = React.useCallback(
    (search: string) => setQuery({ search: search || undefined }, { history: 'replace' }),
    [setQuery],
  );
  const onSort = React.useCallback(
    (sortBy: PatientSortField, order: SortOrder) => setQuery({ sortBy, order }),
    [setQuery],
  );

  // A deleted last row can leave us past the final page: step back instead of showing nothing.
  React.useEffect(() => {
    if (data?.data.length === 0 && data.total > 0 && query.page > totalPages(data)) {
      setQuery({ page: totalPages(data) }, { history: 'replace' });
    }
  }, [data, query.page, setQuery]);

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1>Patients</h1>
            {!canWrite && (
              <Tooltip content="Your role can view patients but not change them.">
                <Badge
                  variant="neutral"
                  tabIndex={0}
                  className="focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-[3px]"
                >
                  <Eye aria-hidden /> View only
                </Badge>
              </Tooltip>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Search, review and manage patient records.
          </p>
        </div>
        <Can permission={Permission.PatientsWrite}>
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            New patient
          </Button>
        </Can>
      </header>

      <PatientsToolbar query={query} onSearch={onSearch} onSort={onSort} />

      <section
        aria-label="Patient list"
        aria-busy={isFetching}
        className="bg-card relative overflow-hidden rounded-xl border shadow-sm"
      >
        {/* Indeterminate progress for background work (page change, refetch, retries). */}
        <div
          className={cn(
            'absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden transition-opacity duration-300',
            isFetching && !isPending ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden
        >
          <div className="bg-primary animate-progress h-full w-1/2" />
        </div>

        {isError && data && (
          <div
            role="alert"
            className="bg-warning-subtle text-warning-foreground dark:text-warning flex flex-wrap items-center gap-2 border-b px-4 py-2.5 text-sm md:px-5"
          >
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">Couldn’t refresh — showing the last results we loaded.</span>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}

        {isPending ? (
          <PatientsSkeleton rows={Math.min(query.limit, 10)} />
        ) : isError && !data ? (
          <ErrorState
            error={error}
            title="Couldn’t load patients"
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        ) : data.total === 0 ? (
          query.search ? (
            <EmptyState
              icon={<SearchX />}
              title="No matching patients"
              description={
                <>Nothing matches “{query.search}”. Check the spelling or try fewer words.</>
              }
              action={
                <Button variant="outline" onClick={() => setQuery({ search: undefined })}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Users />}
              title="No patients yet"
              description={
                canWrite
                  ? 'Add your first patient to get started.'
                  : 'Patients added by an administrator will appear here.'
              }
              action={
                canWrite && (
                  <Button onClick={openCreate}>
                    <UserPlus aria-hidden />
                    Add patient
                  </Button>
                )
              }
            />
          )
        ) : (
          <div className={cn('transition-opacity duration-200', isPlaceholderData && 'opacity-60')}>
            <div className="hidden md:block">
              <PatientsTable
                patients={data.data}
                query={query}
                pendingIds={pendingIds}
                onSort={onSort}
              />
            </div>
            <div className="md:hidden">
              <PatientsCardList patients={data.data} pendingIds={pendingIds} />
            </div>
            <PatientsPagination
              page={query.page}
              limit={query.limit}
              total={data.total}
              onPageChange={(page) => setQuery({ page })}
              onLimitChange={(limit) => setQuery({ limit })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
