import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const SortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof SortOrderSchema>;

/** `{ data, page, limit, total }` — exactly the list envelope required by the API contract. */
export function paginated<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    page: z.int().positive(),
    limit: z.int().positive(),
    total: z.int().nonnegative(),
  });
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export function totalPages({ total, limit }: Pick<Paginated<unknown>, 'total' | 'limit'>): number {
  return Math.max(1, Math.ceil(total / limit));
}
