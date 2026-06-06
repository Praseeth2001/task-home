import { useState, useEffect, useCallback, useRef } from "react";
import type { SpotifyRecord, PaginationState, SortState, FilterState } from "../types";
import { fetchRecords } from "../api/records";
import { useDebounce } from "./useDebounce";

interface UseFetchRecordsParams {
  pagination: PaginationState;
  sort:       SortState;
  filters:    FilterState;
}

interface UseFetchRecordsReturn {
  records:      SpotifyRecord[];
  totalCount:   number;
  isLoading:    boolean;
  isError:      boolean;
  errorMessage: string;
  refetch:      () => void;
}

/**
 * Fetches records from json-server, driven entirely by the table state.
 *
 * Key behaviours:
 * - Debounces the search field (300 ms) — other params fire immediately
 * - Cancels in-flight requests via AbortController when params change
 * - Shows stale rows (isLoading=true) during refetch rather than blanking
 * - Exposes refetch() so error states can offer a "Try again" button
 */
export function useFetchRecords({
  pagination,
  sort,
  filters,
}: UseFetchRecordsParams): UseFetchRecordsReturn {
  const [records,      setRecords]      = useState<SpotifyRecord[]>([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isError,      setIsError]      = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [tick,         setTick]         = useState(0); // bumped by refetch()

  const abortRef = useRef<AbortController | null>(null);

  // Only debounce the search string — all other params are already settled
  // (they change on discrete user actions, not on every keystroke).
  const debouncedSearch = useDebounce(filters.search, 300);

  const effectiveFilters: FilterState = {
    ...filters,
    search: debouncedSearch,
  };

  useEffect(() => {
    // Cancel the previous request before starting a new one
    abortRef.current?.abort();
    const controller     = new AbortController();
    abortRef.current     = controller;

    setIsLoading(true);
    setIsError(false);

    fetchRecords(pagination, sort, effectiveFilters, controller.signal)
      .then(({ data, totalCount }) => {
        if (controller.signal.aborted) return;
        setRecords(data);
        setTotalCount(totalCount);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return; // expected — ignore
        setIsError(true);
        setErrorMessage(err.message);
        setIsLoading(false);
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.page,
    pagination.limit,
    sort.column,
    sort.order,
    debouncedSearch,              // ← debounced
    filters.textFilters,          // reference stable — comes from useReducer state
    filters.multiSelect,
    filters.numericRange,
    tick,
  ]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { records, totalCount, isLoading, isError, errorMessage, refetch };
}
