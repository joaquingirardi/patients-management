'use client';

import { AlertCircle } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { Label } from './label';

interface FormFieldProps {
  label: string;
  /** Helper text, announced together with the label. */
  description?: string;
  error?: string;
  className?: string;
  /** Receives the ARIA wiring for the control: id, aria-invalid, aria-describedby. */
  children: (control: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => React.ReactNode;
}

/** Label, control, description and error with the ARIA relationships wired up. */
export function FormField({ label, description, error, className, children }: FormFieldProps) {
  const id = React.useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
      })}
      {description && !error && (
        <p id={descriptionId} className="text-muted-foreground text-xs leading-relaxed">
          {description}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-destructive animate-in fade-in slide-in-from-top-1 flex items-start gap-1.5 text-xs leading-relaxed duration-150"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
