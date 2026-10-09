'use client';

import {
  type ListPatientsQuery,
  type Patient,
  type PatientSortField,
  type SortOrder,
} from '@pm/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { isOptimistic } from '../hooks/use-patient-mutations';
import { usePrefetchPatient } from '../hooks/use-patients';
import { ageOn, formatDob, formatPhone, fullName } from '../lib/format';
import { usePatientHref } from '../lib/use-patients-search-params';
import { PatientAvatar } from './patient-avatar';
import { PatientRowActions } from './patient-row-actions';
import { SortableHeader } from './sortable-header';

interface PatientsTableProps {
  patients: Patient[];
  query: ListPatientsQuery;
  pendingIds: ReadonlySet<string>;
  onSort: (field: PatientSortField, order: SortOrder) => void;
}

const SORT_LABELS: Record<PatientSortField, string> = {
  lastName: 'last name',
  firstName: 'first name',
  dob: 'date of birth',
  createdAt: 'date added',
};

const INTERACTIVE = 'a, button, [role="menuitem"], [role="menu"]';

/**
 * Tablet & desktop view. Columns collapse progressively: phone and email get their own columns
 * from `lg`; on `md` the email folds under the name. Below `md` the card list takes over.
 */
export function PatientsTable({ patients, query, pendingIds, onSort }: PatientsTableProps) {
  const router = useRouter();
  const prefetch = usePrefetchPatient();
  const hrefFor = usePatientHref();

  return (
    <Table>
      <caption className="sr-only">
        Patients, sorted by {SORT_LABELS[query.sortBy]},{' '}
        {query.order === 'asc' ? 'ascending' : 'descending'}
      </caption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <SortableHeader
            field="lastName"
            label="Patient"
            {...query}
            onSort={onSort}
            className="pl-5"
          />
          <TableHead className="hidden lg:table-cell">Email</TableHead>
          <TableHead className="hidden lg:table-cell">Phone</TableHead>
          <SortableHeader field="dob" label="Date of birth" {...query} onSort={onSort} />
          <TableHead className="w-14 pr-5">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {patients.map((patient) => {
          const optimistic = isOptimistic(patient);
          const busy = optimistic || pendingIds.has(patient.id);
          const href = hrefFor(patient.id);
          return (
            <TableRow
              key={patient.id}
              aria-busy={busy || undefined}
              className={cn(
                'group cursor-pointer',
                busy && 'pointer-events-none opacity-60',
                optimistic &&
                  'animate-in fade-in slide-in-from-top-1 bg-primary/[0.03] duration-300',
              )}
              onMouseEnter={() => !optimistic && prefetch(patient.id)}
              onClick={(event) => {
                if (optimistic || (event.target as HTMLElement).closest(INTERACTIVE)) return;
                router.push(href);
              }}
            >
              <TableCell className="pl-5">
                <div className="flex items-center gap-3">
                  <PatientAvatar name={fullName(patient)} />
                  <div className="min-w-0">
                    {optimistic ? (
                      <span className="font-medium">
                        {patient.lastName}, {patient.firstName}
                      </span>
                    ) : (
                      <Link
                        href={href}
                        onFocus={() => prefetch(patient.id)}
                        className="hover:text-primary focus-visible:ring-ring/40 rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px]"
                      >
                        {patient.lastName}, {patient.firstName}
                      </Link>
                    )}
                    <div className="text-muted-foreground truncate text-[13px] lg:hidden">
                      {patient.email}
                    </div>
                  </div>
                  {optimistic && (
                    <Badge variant="primary" className="ml-1">
                      Saving…
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground hidden max-w-64 truncate lg:table-cell">
                {patient.email}
              </TableCell>
              <TableCell className="text-muted-foreground hidden tabular-nums lg:table-cell">
                {formatPhone(patient.phoneNumber)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDob(patient.dob)}
                <span className="text-muted-foreground ml-2 text-[13px]">
                  {ageOn(patient.dob)} y
                </span>
              </TableCell>
              <TableCell className="pr-5 text-right">
                <PatientRowActions patient={patient} disabled={busy} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
