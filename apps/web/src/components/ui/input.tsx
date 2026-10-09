import type * as React from 'react';

import { cn } from '@/lib/utils';

export function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input bg-card shadow-xs h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base md:text-sm',
        'placeholder:text-muted-foreground/80 transition-[color,box-shadow,border-color] duration-150',
        'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:outline-none focus-visible:ring-[3px]',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        '[&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100',
        className,
      )}
      {...props}
    />
  );
}
