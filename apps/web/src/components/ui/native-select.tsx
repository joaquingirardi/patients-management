import { ChevronDown } from 'lucide-react';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/** Styled native <select>: better screen-reader, mobile and keyboard support than a custom listbox. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <select
        data-slot="native-select"
        className={cn(
          'border-input bg-card shadow-xs h-9 w-full appearance-none rounded-md border py-1 pl-3 pr-8 text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/30 transition-[box-shadow,border-color] focus-visible:outline-none focus-visible:ring-[3px]',
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2"
        aria-hidden
      />
    </div>
  );
}
