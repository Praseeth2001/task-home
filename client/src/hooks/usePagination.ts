import { useMemo } from "react";

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

interface UsePaginationParams {
  totalCount: number;
  page: number;
  limit: number;
}

export interface UsePaginationReturn {
  totalPages: number;
  startRow: number;
  endRow: number;
  hasPrev: boolean;
  hasNext: boolean;
  pageNumbers: (number | "…")[];
}

/**
 * Pure derived pagination data — no state, no side effects.
 * All values are computed from the three inputs so the UI stays
 * in sync automatically whenever any of them changes.
 */
export function usePagination({
  totalCount,
  page,
  limit,
}: UsePaginationParams): UsePaginationReturn {
  return useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const startRow = totalCount === 0 ? 0 : (page - 1) * limit + 1;
    const endRow = Math.min(page * limit, totalCount);

    return {
      totalPages,
      startRow,
      endRow,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      pageNumbers: buildPageNumbers(page, totalPages),
    };
  }, [totalCount, page, limit]);
}

/**
 * Builds a compact page-number list with ellipsis, e.g.:
 *   [1, 2, 3, "…", 10]       when on page 1
 *   [1, "…", 4, 5, 6, "…", 10]  when in the middle
 *   [1, "…", 8, 9, 10]       when near the end
 */
function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "…")[] = [];
  const WING = 1;

  const showLeft = current - WING;
  const showRight = current + WING;

  // Always show first page
  pages.push(1);

  if (showLeft > 2) pages.push("…");

  for (
    let p = Math.max(2, showLeft);
    p <= Math.min(total - 1, showRight);
    p++
  ) {
    pages.push(p);
  }

  if (showRight < total - 1) pages.push("…");

  // Always show last page
  pages.push(total);

  return pages;
}
