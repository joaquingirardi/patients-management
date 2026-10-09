'use client';

import { type Patient, Permission } from '@pm/contracts';
import { Cake, Check, Copy, Mail, Pencil, Phone, Trash2 } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { Can } from '@/features/auth/session-provider';

import {
  ageOn,
  formatDateTime,
  formatDob,
  formatPhone,
  formatRelative,
  fullName,
} from '../lib/format';
import { usePatientActions } from './patient-actions-provider';
import { PatientAvatar } from './patient-avatar';

/** The full record. Shared verbatim by the modal (intercepted route) and the standalone page. */
export function PatientDetails({
  patient,
  titleAs: Title = 'h1',
  onDeleted,
}: {
  patient: Patient;
  titleAs?: React.ElementType;
  onDeleted?: () => void;
}) {
  const { openEdit, confirmDelete } = usePatientActions();
  const age = ageOn(patient.dob);

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-4">
        <PatientAvatar name={fullName(patient)} size="lg" />
        <div className="min-w-0">
          <Title className="truncate text-xl font-semibold tracking-tight">
            {fullName(patient)}
          </Title>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="primary">{age} years old</Badge>
            <span className="text-muted-foreground text-[13px]">
              Updated {formatRelative(patient.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      <dl className="divide-y rounded-lg border">
        <DetailRow icon={<Mail />} label="Email">
          <a
            href={`mailto:${patient.email}`}
            className="text-primary break-all underline-offset-4 hover:underline"
          >
            {patient.email}
          </a>
        </DetailRow>
        <DetailRow icon={<Phone />} label="Phone">
          <a
            href={`tel:${patient.phoneNumber}`}
            className="text-primary tabular-nums underline-offset-4 hover:underline"
          >
            {formatPhone(patient.phoneNumber)}
          </a>
        </DetailRow>
        <DetailRow icon={<Cake />} label="Date of birth">
          <span className="tabular-nums">{formatDob(patient.dob)}</span>
        </DetailRow>
      </dl>

      <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[13px]">
        <dt>Patient ID</dt>
        <dd className="flex min-w-0 items-center gap-1">
          <code className="truncate font-mono text-xs">{patient.id}</code>
          <CopyButton value={patient.id} label="Copy patient ID" />
        </dd>
        <dt>Created</dt>
        <dd>{formatDateTime(patient.createdAt)}</dd>
        <dt>Last updated</dt>
        <dd>{formatDateTime(patient.updatedAt)}</dd>
      </dl>

      <Can permission={Permission.PatientsWrite}>
        <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => confirmDelete(patient, { onDeleted })}
          >
            <Trash2 aria-hidden />
            Delete
          </Button>
          <Button onClick={() => openEdit(patient)}>
            <Pencil aria-hidden />
            Edit patient
          </Button>
        </div>
      </Can>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="text-muted-foreground mt-0.5 [&_svg]:size-4" aria-hidden>
        {icon}
      </span>
      <div className="grid min-w-0 gap-0.5">
        <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
        <dd className="text-sm">{children}</dd>
      </div>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Tooltip content={copied ? 'Copied' : label}>
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-7"
        aria-label={copied ? 'Copied' : label}
        onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true))}
      >
        {copied ? <Check className="text-success" aria-hidden /> : <Copy aria-hidden />}
      </Button>
    </Tooltip>
  );
}
