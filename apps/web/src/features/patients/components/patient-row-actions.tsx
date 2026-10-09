'use client';

import { type Patient, Permission } from '@pm/contracts';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCan } from '@/features/auth/session-provider';

import { fullName } from '../lib/format';
import { usePatientHref } from '../lib/use-patients-search-params';
import { usePatientActions } from './patient-actions-provider';

/**
 * Role-gated row actions. Viewers get "View" only — write actions are not rendered at all
 * rather than shown disabled, which keeps the menu honest and uncluttered.
 */
export function PatientRowActions({ patient, disabled }: { patient: Patient; disabled?: boolean }) {
  const router = useRouter();
  const canWrite = useCan(Permission.PatientsWrite);
  const { openEdit, confirmDelete } = usePatientActions();
  const hrefFor = usePatientHref();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${fullName(patient)}`}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => router.push(hrefFor(patient.id))}>
          <Eye aria-hidden />
          View details
        </DropdownMenuItem>
        {canWrite && (
          <>
            <DropdownMenuItem onSelect={() => openEdit(patient)}>
              <Pencil aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => confirmDelete(patient)}>
              <Trash2 aria-hidden />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
