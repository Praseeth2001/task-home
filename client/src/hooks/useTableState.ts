import { useReducer, useCallback } from "react";
import type {
  TableState,
  SortState,
  PaginationState,
  FilterState,
  EditingCell,
  SpotifyRecord,
  BulkSelectionState,
} from "../types";

// ─── Action types ─────────────────────────────────────────────────────────────

type TableAction =
  // Sorting
  | { type: "SET_SORT"; column: keyof SpotifyRecord }

  // Pagination
  | { type: "SET_PAGE"; page: number }
  | { type: "SET_LIMIT"; limit: number }

  // Filters
  | { type: "SET_SEARCH"; search: string }
  | { type: "SET_TEXT_FILTER"; field: keyof SpotifyRecord; value: string }
  | { type: "SET_MULTI_SELECT"; field: keyof SpotifyRecord; values: string[] }
  | { type: "SET_NUMERIC_RANGE"; field: keyof SpotifyRecord; min?: number; max?: number }
  | { type: "CLEAR_FILTERS" }

  // Inline editing
  | { type: "START_EDIT"; rowId: string; column: keyof SpotifyRecord; originalValue: SpotifyRecord[keyof SpotifyRecord] }
  | { type: "CANCEL_EDIT" }
  | { type: "COMMIT_EDIT" }

  // Bulk selection
  | { type: "TOGGLE_ROW"; id: string }
  | { type: "SELECT_PAGE"; ids: string[] }
  | { type: "SELECT_ALL" }
  | { type: "CLEAR_SELECTION" };

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_FILTERS: FilterState = {
  search:       "",
  textFilters:  {},
  multiSelect:  {},
  numericRange: {},
};

export const INITIAL_TABLE_STATE: TableState = {
  sort: {
    column: null,
    order:  "asc",
  },
  pagination: {
    page:  1,
    limit: 50,
  },
  filters: INITIAL_FILTERS,
  editing:   null,
  selection: {
    selectedIds: new Set(),
    scope:       null,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Any filter/search/sort change resets to page 1 */
function resetPage(state: TableState): TableState {
  return { ...state, pagination: { ...state.pagination, page: 1 } };
}

/** Any filter/search/sort change clears the selection (stale IDs) */
function clearSelection(state: TableState): TableState {
  return {
    ...state,
    selection: { selectedIds: new Set(), scope: null },
  };
}

function toggleSortOrder(
  state: TableState,
  column: keyof SpotifyRecord
): SortState {
  if (state.sort.column !== column) {
    return { column, order: "asc" };
  }
  return {
    column,
    order: state.sort.order === "asc" ? "desc" : "asc",
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {

    // ── Sorting ──────────────────────────────────────────────────────────────
    case "SET_SORT": {
      const sort = toggleSortOrder(state, action.column);
      return clearSelection(resetPage({ ...state, sort }));
    }

    // ── Pagination ───────────────────────────────────────────────────────────
    case "SET_PAGE": {
      // Clear selection when page changes (selected IDs may not be visible)
      return clearSelection({
        ...state,
        pagination: { ...state.pagination, page: action.page },
      });
    }

    case "SET_LIMIT": {
      return clearSelection(resetPage({
        ...state,
        pagination: { page: 1, limit: action.limit },
      }));
    }

    // ── Filters ──────────────────────────────────────────────────────────────
    case "SET_SEARCH": {
      return clearSelection(resetPage({
        ...state,
        filters: { ...state.filters, search: action.search },
      }));
    }

    case "SET_TEXT_FILTER": {
      const textFilters = {
        ...state.filters.textFilters,
        [action.field]: action.value,
      };
      return clearSelection(resetPage({
        ...state,
        filters: { ...state.filters, textFilters },
      }));
    }

    case "SET_MULTI_SELECT": {
      const multiSelect = {
        ...state.filters.multiSelect,
        [action.field]: action.values,
      };
      return clearSelection(resetPage({
        ...state,
        filters: { ...state.filters, multiSelect },
      }));
    }

    case "SET_NUMERIC_RANGE": {
      const numericRange = {
        ...state.filters.numericRange,
        [action.field]: { min: action.min, max: action.max },
      };
      return clearSelection(resetPage({
        ...state,
        filters: { ...state.filters, numericRange },
      }));
    }

    case "CLEAR_FILTERS": {
      return clearSelection(resetPage({
        ...state,
        filters: INITIAL_FILTERS,
      }));
    }

    // ── Inline editing ───────────────────────────────────────────────────────
    case "START_EDIT": {
      const editing: EditingCell = {
        rowId:         action.rowId,
        column:        action.column,
        originalValue: action.originalValue,
      };
      return { ...state, editing };
    }

    case "CANCEL_EDIT":
    case "COMMIT_EDIT": {
      return { ...state, editing: null };
    }

    // ── Bulk selection ───────────────────────────────────────────────────────
    case "TOGGLE_ROW": {
      const next = new Set(state.selection.selectedIds);
      if (next.has(action.id)) {
        next.delete(action.id);
      } else {
        next.add(action.id);
      }
      return {
        ...state,
        selection: { selectedIds: next, scope: null },
      };
    }

    case "SELECT_PAGE": {
      // If all page IDs are already selected, deselect them (toggle behaviour)
      const allSelected = action.ids.every((id) =>
        state.selection.selectedIds.has(id)
      );
      const next = new Set(state.selection.selectedIds);
      if (allSelected) {
        action.ids.forEach((id) => next.delete(id));
      } else {
        action.ids.forEach((id) => next.add(id));
      }
      return {
        ...state,
        selection: { selectedIds: next, scope: "page" },
      };
    }

    case "SELECT_ALL": {
      // "Select all" is a scope marker — the actual IDs are resolved
      // at the API level during bulk operations (e.g. export).
      return {
        ...state,
        selection: { selectedIds: new Set(), scope: "all" },
      };
    }

    case "CLEAR_SELECTION": {
      return {
        ...state,
        selection: { selectedIds: new Set(), scope: null },
      };
    }

    default:
      return state;
  }
}

// ─── Public hook ──────────────────────────────────────────────────────────────

export interface TableStateActions {
  // Sorting
  setSort:         (column: keyof SpotifyRecord) => void;

  // Pagination
  setPage:         (page: number) => void;
  setLimit:        (limit: number) => void;

  // Filters
  setSearch:       (search: string) => void;
  setTextFilter:   (field: keyof SpotifyRecord, value: string) => void;
  setMultiSelect:  (field: keyof SpotifyRecord, values: string[]) => void;
  setNumericRange: (field: keyof SpotifyRecord, min?: number, max?: number) => void;
  clearFilters:    () => void;

  // Inline editing
  startEdit:       (rowId: string, column: keyof SpotifyRecord, originalValue: SpotifyRecord[keyof SpotifyRecord]) => void;
  cancelEdit:      () => void;
  commitEdit:      () => void;

  // Bulk selection
  toggleRow:       (id: string) => void;
  selectPage:      (ids: string[]) => void;
  selectAll:       () => void;
  clearSelection:  () => void;
}

export interface UseTableStateReturn {
  state:   TableState;
  actions: TableStateActions;
}

export function useTableState(): UseTableStateReturn {
  const [state, dispatch] = useReducer(tableReducer, INITIAL_TABLE_STATE);

  const actions: TableStateActions = {
    // Sorting
    setSort: useCallback(
      (column) => dispatch({ type: "SET_SORT", column }),
      []
    ),

    // Pagination
    setPage: useCallback(
      (page) => dispatch({ type: "SET_PAGE", page }),
      []
    ),
    setLimit: useCallback(
      (limit) => dispatch({ type: "SET_LIMIT", limit }),
      []
    ),

    // Filters
    setSearch: useCallback(
      (search) => dispatch({ type: "SET_SEARCH", search }),
      []
    ),
    setTextFilter: useCallback(
      (field, value) => dispatch({ type: "SET_TEXT_FILTER", field, value }),
      []
    ),
    setMultiSelect: useCallback(
      (field, values) => dispatch({ type: "SET_MULTI_SELECT", field, values }),
      []
    ),
    setNumericRange: useCallback(
      (field, min, max) => dispatch({ type: "SET_NUMERIC_RANGE", field, min, max }),
      []
    ),
    clearFilters: useCallback(
      () => dispatch({ type: "CLEAR_FILTERS" }),
      []
    ),

    // Inline editing
    startEdit: useCallback(
      (rowId, column, originalValue) =>
        dispatch({ type: "START_EDIT", rowId, column, originalValue }),
      []
    ),
    cancelEdit: useCallback(
      () => dispatch({ type: "CANCEL_EDIT" }),
      []
    ),
    commitEdit: useCallback(
      () => dispatch({ type: "COMMIT_EDIT" }),
      []
    ),

    // Bulk selection
    toggleRow: useCallback(
      (id) => dispatch({ type: "TOGGLE_ROW", id }),
      []
    ),
    selectPage: useCallback(
      (ids) => dispatch({ type: "SELECT_PAGE", ids }),
      []
    ),
    selectAll: useCallback(
      () => dispatch({ type: "SELECT_ALL" }),
      []
    ),
    clearSelection: useCallback(
      () => dispatch({ type: "CLEAR_SELECTION" }),
      []
    ),
  };

  return { state, actions };
}
