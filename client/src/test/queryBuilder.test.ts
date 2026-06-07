import { describe, it, expect } from "vitest";
import { buildQueryParams } from "../utils/queryBuilder";
import type { PaginationState, SortState, FilterState } from "../types";

const BASE_PAGINATION: PaginationState = { page: 1, limit: 50 };
const NO_SORT: SortState = { column: null, order: "asc" };
const NO_FILTERS: FilterState = {
  search: "",
  textFilters: {},
  multiSelect: {},
  numericRange: {},
};

describe("buildQueryParams", () => {
  it("always includes _page and _limit", () => {
    const p = buildQueryParams(BASE_PAGINATION, NO_SORT, NO_FILTERS);
    expect(p.get("_page")).toBe("1");
    expect(p.get("_limit")).toBe("50");
  });

  it("omits _sort/_order when no sort column", () => {
    const p = buildQueryParams(BASE_PAGINATION, NO_SORT, NO_FILTERS);
    expect(p.has("_sort")).toBe(false);
    expect(p.has("_order")).toBe(false);
  });

  it("includes _sort and _order when sort column is set", () => {
    const sort: SortState = { column: "tempo", order: "desc" };
    const p = buildQueryParams(BASE_PAGINATION, sort, NO_FILTERS);
    expect(p.get("_sort")).toBe("tempo");
    expect(p.get("_order")).toBe("desc");
  });

  it("includes q param for global search", () => {
    const filters = { ...NO_FILTERS, search: "adele" };
    const p = buildQueryParams(BASE_PAGINATION, NO_SORT, filters);
    expect(p.get("q")).toBe("adele");
  });

  it("omits q param when search is empty", () => {
    const p = buildQueryParams(BASE_PAGINATION, NO_SORT, NO_FILTERS);
    expect(p.has("q")).toBe(false);
  });

  it("adds _like suffix for text filters", () => {
    const filters = {
      ...NO_FILTERS,
      textFilters: { track_artist: "swift" },
    };
    const p = buildQueryParams(BASE_PAGINATION, NO_SORT, filters);
    expect(p.get("track_artist_like")).toBe("swift");
  });

  it("appends multiple values for multi-select (same key)", () => {
    const filters = {
      ...NO_FILTERS,
      multiSelect: { playlist_genre: ["pop", "rock"] },
    };
    const p = buildQueryParams(BASE_PAGINATION, NO_SORT, filters);
    expect(p.getAll("playlist_genre")).toEqual(["pop", "rock"]);
  });

  it("adds _gte and _lte for numeric range", () => {
    const filters = {
      ...NO_FILTERS,
      numericRange: { tempo: { min: 100, max: 140 } },
    };
    const p = buildQueryParams(BASE_PAGINATION, NO_SORT, filters);
    expect(p.get("tempo_gte")).toBe("100");
    expect(p.get("tempo_lte")).toBe("140");
  });

  it("omits _gte when min is undefined", () => {
    const filters = {
      ...NO_FILTERS,
      numericRange: { tempo: { max: 140 } },
    };
    const p = buildQueryParams(BASE_PAGINATION, NO_SORT, filters);
    expect(p.has("tempo_gte")).toBe(false);
    expect(p.get("tempo_lte")).toBe("140");
  });

  it("combines multiple filter types simultaneously", () => {
    const filters: FilterState = {
      search: "top hits",
      textFilters: { track_artist: "swift" },
      multiSelect: { playlist_genre: ["pop"] },
      numericRange: { track_popularity: { min: 70 } },
    };
    const p = buildQueryParams(
      { page: 2, limit: 25 },
      { column: "tempo", order: "asc" },
      filters,
    );
    expect(p.get("q")).toBe("top hits");
    expect(p.get("track_artist_like")).toBe("swift");
    expect(p.getAll("playlist_genre")).toEqual(["pop"]);
    expect(p.get("track_popularity_gte")).toBe("70");
    expect(p.get("_page")).toBe("2");
    expect(p.get("_sort")).toBe("tempo");
  });
});
