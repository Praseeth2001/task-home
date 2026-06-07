import { useState, useEffect, useCallback, useRef } from "react";
import type { SpotifyRecord, PaginationState, SortState, FilterState } from "../types";
import { fetchRecords } from "../api/records";
import { useDebounce } from "./useDebounce";

interface UseFetchRecordsParams {
  pagination: PaginationState;
  sort:       SortState;
  filters:    FilterState;
}

export interface UseFetchRecordsReturn {
  records:      SpotifyRecord[];
  setRecords:   React.Dispatch<React.SetStateAction<SpotifyRecord[]>>;
  totalCount:   number;
  isLoading:    boolean;
  isError:      boolean;
  errorMessage: string;
  refetch:      () => void;
}

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
  const [tick,         setTick]         = useState(0);

  const abortRef        = useRef<AbortController | null>(null);
  const debouncedSearch = useDebounce(filters.search, 300);

  const effectiveFilters: FilterState = { ...filters, search: debouncedSearch };

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

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
        if (err.name === "AbortError") return;
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
    debouncedSearch,
    filters.textFilters,
    filters.multiSelect,
    filters.numericRange,
    tick,
  ]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { records, setRecords, totalCount, isLoading, isError, errorMessage, refetch };
}
