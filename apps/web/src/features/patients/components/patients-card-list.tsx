'use client';

import { type Patient } from '@pm/contracts';
import { Cake, Phone } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { isOptimistic } from '../hooks/use-patient-mutations';
import { ageOn, formatDob, formatPhone, fullName } from '../lib/format';
import { usePatientHref } from '../lib/use-patients-search-params';
import { PatientAvatar } from './patient-avatar';
import { PatientRowActions } from './patient-row-actions';

/** Phone view: stacked cards with large touch targets instead of a squeezed table. */
export function PatientsCardList({
  patients,
  pendingIds,
}: {
  patients: Patient[];
  pendingIds: ReadonlySet<string>;
}) {
  const hrefFor = usePatientHref();
  return (
    <ul className="divide-y" aria-label="Patients">
      {patients.map((patient) => {
        const optimistic = isOptimistic(patient);
        const busy = optimistic || pendingIds.has(patient.id);
        return (
          <li
            key={patient.id}
            aria-busy={busy || undefined}
            className={cn(
              'relative flex items-start gap-3 px-4 py-3.5',
              busy && 'opacity-60',
              optimistic && 'animate-in fade-in',
            )}
          >
            <PatientAvatar name={fullName(patient)} />
            <div className="min-w-0 flex-1">
              {optimistic ? (
                <span className="font-medium">{fullName(patient)}</span>
              ) : (
                <Link
                  href={hrefFor(patient.id)}
                  className="focus-visible:after:ring-ring/40 font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:ring-[3px]"
                >
                  {fullName(patient)}
                </Link>
              )}
              <p className="text-muted-foreground truncate text-[13px]">{patient.email}</p>
              <div className="text-muted-foreground mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <Cake className="size-3.5" aria-hidden />
                  <span className="sr-only">Born </span>
                  {formatDob(patient.dob)} · {ageOn(patient.dob)} y
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" aria-hidden />
                  <span className="sr-only">Phone </span>
                  {formatPhone(patient.phoneNumber)}
                </span>
              </div>
            </div>
            {optimistic ? (
              <Badge variant="primary">Saving…</Badge>
            ) : (
              <div className="relative z-10">
                <PatientRowActions patient={patient} disabled={busy} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
