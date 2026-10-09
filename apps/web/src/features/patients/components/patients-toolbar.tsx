'use client';

import { type ListPatientsQuery, type PatientSortField, type SortOrder } from '@pm/contracts';
import { Search, X } from 'lucide-react';
import * as React from 'react';

import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { NativeSelect } from '@/components/ui/native-select';

const SEARCH_DEBOUNCE_MS = 300;

const SORT_OPTIONS: { value: `${PatientSortField}:${SortOrder}`; label: string }[] = [
  { value: 'lastName:asc', label: 'Last name (A–Z)' },
  { value: 'lastName:desc', label: 'Last name (Z–A)' },
  { value: 'firstName:asc', label: 'First name (A–Z)' },
  { value: 'dob:desc', label: 'Youngest first' },
  { value: 'dob:asc', label: 'Oldest first' },
  { value: 'createdAt:desc', label: 'Recently added' },
];

interface PatientsToolbarProps {
  query: ListPatientsQuery;
  onSearch: (search: string) => void;
  onSort: (sortBy: PatientSortField, order: SortOrder) => void;
}

export function PatientsToolbar({ query, onSearch, onSort }: PatientsToolbarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = React.useState(query.search ?? '');
  // The last term *we* pushed to the URL. When the URL catches up with it, the input must be
  // left alone: the user may have typed more (or a trailing space) while the update was in flight.
  const [sent, setSent] = React.useState(query.search ?? '');

  // Adopt only *external* URL changes (back button, "Clear search" in the empty state).
  const [observed, setObserved] = React.useState(query.search);
  if (observed !== query.search) {
    setObserved(query.search);
    if ((query.search ?? '') !== sent) {
      setSent(query.search ?? '');
      setValue(query.search ?? '');
    }
  }

  // Debounce keystrokes → URL. Typing never triggers one request per character.
  React.useEffect(() => {
    const term = value.trim();
    if (term === sent) return;
    const timer = setTimeout(() => {
      setSent(term);
      onSearch(term);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, sent, onSearch]);

  // "/" focuses search from anywhere — unless the user is typing, using a shortcut, or a dialog
  // (with its focus trap) is open.
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-sm">
        <Search
          className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          ref={inputRef}
          type="search"
          aria-label="Search patients by name or email"
          placeholder="Search by name or email…"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && value) {
              event.preventDefault();
              setValue('');
            }
          }}
          className="pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden"
          maxLength={100}
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              setValue('');
              inputRef.current?.focus();
            }}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/40 absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 transition-colors focus-visible:outline-none focus-visible:ring-[3px]"
            aria-label="Clear search input"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : (
          <Kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
        )}
      </div>

      {/* Column headers sort on tablet/desktop; phones get an explicit control instead. */}
      <label className="md:hidden">
        <span className="sr-only">Sort patients</span>
        <NativeSelect
          className="w-full"
          value={`${query.sortBy}:${query.order}`}
          onChange={(event) => {
            const [sortBy, order] = event.target.value.split(':') as [PatientSortField, SortOrder];
            onSort(sortBy, order);
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Sort: {option.label}
            </option>
          ))}
        </NativeSelect>
      </label>
    </div>
  );
}
