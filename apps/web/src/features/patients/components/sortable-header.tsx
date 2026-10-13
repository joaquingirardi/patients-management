'use client';

import { type PatientSortField, type SortOrder } from '@pm/contracts';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface SortableHeaderProps {
  field: PatientSortField;
  label: string;
  sortBy: PatientSortField;
  order: SortOrder;
  onSort: (field: PatientSortField, order: SortOrder) => void;
  className?: string;
}

/** `aria-sort` on the header plus a real button inside, so screen readers announce the sort. */
export function SortableHeader({
  field,
  label,
  sortBy,
  order,
  onSort,
  className,
}: SortableHeaderProps) {
  const active = sortBy === field;
  const nextOrder: SortOrder = active && order === 'asc' ? 'desc' : 'asc';
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;

  return (
    <TableHead
      aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(field, nextOrder)}
        className={cn(
          'hover:text-foreground focus-visible:ring-ring/40 -mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-[3px]',
          active && 'text-foreground',
        )}
      >
        {label}
        <Icon className={cn('size-3.5', !active && 'opacity-50')} aria-hidden />
        <span className="sr-only">, sort {nextOrder === 'asc' ? 'ascending' : 'descending'}</span>
      </button>
    </TableHead>
  );
}
