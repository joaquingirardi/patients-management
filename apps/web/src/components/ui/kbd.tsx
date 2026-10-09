import type * as React from 'react';

import { cn } from '@/lib/utils';

export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'bg-muted text-muted-foreground pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded border px-1 font-mono text-[11px] font-medium',
        className,
      )}
      {...props}
    />
  );
}
