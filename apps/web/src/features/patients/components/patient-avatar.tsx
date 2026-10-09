import { cn } from '@/lib/utils';

import { initials } from '../lib/format';

/** Decorative initials avatar; a few token-based tints, picked deterministically per name. */
const TINTS = [
  'bg-primary/12 text-primary',
  'bg-info-subtle text-info',
  'bg-success-subtle text-success',
  'bg-warning-subtle text-warning-foreground dark:text-warning',
];

function tintFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length] ?? TINTS[0] ?? '';
}

export function PatientAvatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        size === 'md' ? 'size-9 text-xs' : 'size-14 text-lg',
        tintFor(name),
      )}
    >
      {initials(name)}
    </span>
  );
}
