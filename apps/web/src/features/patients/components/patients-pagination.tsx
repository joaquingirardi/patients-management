'use client';

import { PAGE_SIZE_OPTIONS, totalPages } from '@pm/contracts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';

interface PatientsPaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function PatientsPagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
}: PatientsPaginationProps) {
  const pages = totalPages({ total, limit });
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col-reverse items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row md:px-5"
    >
      <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
        {total === 0 ? 'No patients' : `${String(from)}–${String(to)} of ${String(total)}`}
      </p>
      <div className="flex items-center gap-4">
        <label className="text-muted-foreground hidden items-center gap-2 text-sm sm:flex">
          Rows
          <NativeSelect
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </NativeSelect>
        </label>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft aria-hidden />
          </Button>
          <span className="min-w-20 text-center text-sm tabular-nums">
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            aria-label="Next page"
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
    </nav>
  );
}
