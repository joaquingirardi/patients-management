import type * as React from 'react';

import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'animate-in fade-in flex flex-col items-center px-6 py-16 text-center duration-300',
        className,
      )}
    >
      <div className="bg-primary/10 text-primary ring-primary/5 mb-4 flex size-12 items-center justify-center rounded-full ring-8 [&_svg]:size-5">
        {icon}
      </div>
      <h2 className="text-base">{title}</h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
