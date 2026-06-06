import { describe, it, expect } from "vitest";
import { tableReducer, INITIAL_TABLE_STATE } from "../hooks/useTableState";

// We test the reducer directly — pure function, no hooks needed.
// Re-export the reducer for testing (we'll add `export` to it below).

describe("tableReducer — sorting", () => {
  it("sets sort column and defaults to asc on first click", () => {
    const state = tableReducer(INITIAL_TABLE_STATE, {
      type: "SET_SORT",
      column: "track_popularity",
    });
    expect(state.sort.column).toBe("track_popularity");
    expect(state.sort.order).toBe("asc");
  });

  it("toggles to desc on second click of the same column", () => {
    const after1 = tableReducer(INITIAL_TABLE_STATE, {
      type: "SET_SORT",
      column: "track_popularity",
    });
    const after2 = tableReducer(after1, {
      type: "SET_SORT",
      column: "track_popularity",
    });
    expect(after2.sort.order).toBe("desc");
  });

  it("resets to asc when switching to a different column", () => {
    const after1 = tableReducer(INITIAL_TABLE_STATE, {
      type: "SET_SORT",
      column: "track_popularity",
    });
    const after2 = tableReducer(
      { ...after1, sort: { column: "track_popularity", order: "desc" } },
      { type: "SET_SORT", column: "tempo" }
    );
    expect(after2.sort.column).toBe("tempo");
    expect(after2.sort.order).toBe("asc");
  });

  it("resets page to 1 when sort changes", () => {
    const withPage3 = {
      ...INITIAL_TABLE_STATE,
      pagination: { page: 3, limit: 50 },
    };
    const state = tableReducer(withPage3, {
      type: "SET_SORT",
      column: "tempo",
    });
    expect(state.pagination.page).toBe(1);
  });

  it("clears selection when sort changes", () => {
    const withSelection = {
      ...INITIAL_TABLE_STATE,
      selection: {
        selectedIds: new Set(["1", "2"]),
        scope: null as null,
      },
    };
    const state = tableReducer(withSelection, {
      type: "SET_SORT",
      column: "tempo",
    });
    expect(state.selection.selectedIds.size).toBe(0);
  });
});

describe("tableReducer — filtering", () => {
  it("sets search and resets page", () => {
    const withPage5 = {
      ...INITIAL_TABLE_STATE,
      pagination: { page: 5, limit: 50 },
    };
    const state = tableReducer(withPage5, {
      type: "SET_SEARCH",
      search: "taylor",
    });
    expect(state.filters.search).toBe("taylor");
    expect(state.pagination.page).toBe(1);
  });

  it("sets text filter for a field", () => {
    const state = tableReducer(INITIAL_TABLE_STATE, {
      type: "SET_TEXT_FILTER",
      field: "track_artist",
      value: "swift",
    });
    expect(state.filters.textFilters.track_artist).toBe("swift");
  });

  it("sets multi-select filter", () => {
    const state = tableReducer(INITIAL_TABLE_STATE, {
      type: "SET_MULTI_SELECT",
      field: "playlist_genre",
      values: ["pop", "rock"],
    });
    expect(state.filters.multiSelect.playlist_genre).toEqual(["pop", "rock"]);
  });

  it("sets numeric range filter", () => {
    const state = tableReducer(INITIAL_TABLE_STATE, {
      type: "SET_NUMERIC_RANGE",
      field: "tempo",
      min: 100,
      max: 140,
    });
    expect(state.filters.numericRange.tempo).toEqual({ min: 100, max: 140 });
  });

  it("CLEAR_FILTERS restores initial filter state", () => {
    const dirty = tableReducer(INITIAL_TABLE_STATE, {
      type: "SET_SEARCH",
      search: "adele",
    });
    const cleared = tableReducer(dirty, { type: "CLEAR_FILTERS" });
    expect(cleared.filters).toEqual({
      search:       "",
      textFilters:  {},
      multiSelect:  {},
      numericRange: {},
    });
  });
});

describe("tableReducer — pagination", () => {
  it("SET_PAGE updates page", () => {
    const state = tableReducer(INITIAL_TABLE_STATE, {
      type: "SET_PAGE",
      page: 4,
    });
    expect(state.pagination.page).toBe(4);
  });

  it("SET_LIMIT resets page to 1", () => {
    const withPage3 = {
      ...INITIAL_TABLE_STATE,
      pagination: { page: 3, limit: 50 },
    };
    const state = tableReducer(withPage3, { type: "SET_LIMIT", limit: 100 });
    expect(state.pagination.limit).toBe(100);
    expect(state.pagination.page).toBe(1);
  });
});

describe("tableReducer — inline editing", () => {
  it("START_EDIT sets editing cell", () => {
    const state = tableReducer(INITIAL_TABLE_STATE, {
      type: "START_EDIT",
      rowId: "42",
      column: "track_name",
      originalValue: "Old Name",
    });
    expect(state.editing).toEqual({
      rowId: "42",
      column: "track_name",
      originalValue: "Old Name",
    });
  });

  it("CANCEL_EDIT clears editing", () => {
    const editing = tableReducer(INITIAL_TABLE_STATE, {
      type: "START_EDIT",
      rowId: "42",
      column: "track_name",
      originalValue: "Old Name",
    });
    const cancelled = tableReducer(editing, { type: "CANCEL_EDIT" });
    expect(cancelled.editing).toBeNull();
  });
});

describe("tableReducer — bulk selection", () => {
  it("TOGGLE_ROW adds an id", () => {
    const state = tableReducer(INITIAL_TABLE_STATE, {
      type: "TOGGLE_ROW",
      id: "5",
    });
    expect(state.selection.selectedIds.has("5")).toBe(true);
  });

  it("TOGGLE_ROW removes an already-selected id", () => {
    const selected = tableReducer(INITIAL_TABLE_STATE, {
      type: "TOGGLE_ROW",
      id: "5",
    });
    const deselected = tableReducer(selected, { type: "TOGGLE_ROW", id: "5" });
    expect(deselected.selection.selectedIds.has("5")).toBe(false);
  });

  it("SELECT_ALL sets scope to 'all'", () => {
    const state = tableReducer(INITIAL_TABLE_STATE, { type: "SELECT_ALL" });
    expect(state.selection.scope).toBe("all");
  });

  it("CLEAR_SELECTION empties ids and scope", () => {
    const selected = tableReducer(INITIAL_TABLE_STATE, { type: "SELECT_ALL" });
    const cleared  = tableReducer(selected, { type: "CLEAR_SELECTION" });
    expect(cleared.selection.selectedIds.size).toBe(0);
    expect(cleared.selection.scope).toBeNull();
  });
});
