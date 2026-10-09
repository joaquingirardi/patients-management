import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-muted-foreground border-transparent',
        primary: 'bg-primary/10 text-primary border-primary/20',
        success: 'bg-success-subtle text-success border-success/20',
        warning: 'bg-warning-subtle text-warning-foreground border-warning/30 dark:text-warning',
        destructive: 'bg-destructive-subtle text-destructive border-destructive/20',
        info: 'bg-info-subtle text-info border-info/20',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
