import { memo } from "react";
import { SearchBar } from "../filters/SearchBar";
import { TextFilter } from "../filters/TextFilter";
import { MultiSelectFilter } from "../filters/MultiSelectFilter";
import { RangeFilter } from "../filters/RangeFilter";
import type { FilterState } from "../../types";
import type { TableStateActions as Actions } from "../../hooks";
import styles from "./TableToolbar.module.css";

export const GENRE_OPTIONS = ["edm", "latin", "pop", "r&b", "rap", "rock"];

export const SUBGENRE_OPTIONS = [
  "big room",
  "dance pop",
  "electro house",
  "hip hop",
  "indie pop",
  "latin hip hop",
  "latin pop",
  "neo soul",
  "new jack swing",
  "permanent wave",
  "pop",
  "post-teen pop",
  "progressive electro house",
  "reggaeton",
  "southern hip hop",
  "trap",
  "urban contemporary",
];

interface TableToolbarProps {
  filters: FilterState;
  actions: Actions;
  activeCount: number;
}

/**
 * Toolbar containing search + all filter controls.
 *
 * Layout:
 *   [Search ————————————] [Artist] [Genre ▾] [Popularity ——] [Tempo ——] [Clear]
 *
 * The toolbar scrolls horizontally on tablet — all filters remain accessible.
 */
export const TableToolbar = memo(function TableToolbar({
  filters,
  actions,
  activeCount,
}: TableToolbarProps) {
  const hasAnyFilter =
    filters.search.trim() ||
    Object.values(filters.textFilters).some((v) => v?.trim()) ||
    Object.values(filters.multiSelect).some(
      (v) => (v as string[])?.length > 0,
    ) ||
    Object.values(filters.numericRange).some(
      (v) => v?.min !== undefined || v?.max !== undefined,
    );

  return (
    <div className={styles.toolbar} role="search" aria-label="Table filters">
      {/* Global search — always visible and prominent */}
      <SearchBar value={filters.search} onChange={actions.setSearch} />

      <div className={styles.divider} aria-hidden />

      {/* ── Column-specific filters ──────────────────────────────────────── */}
      <div className={styles.filters}>
        {/* Text filter: Artist */}
        <TextFilter
          field="track_artist"
          label="Artist"
          value={filters.textFilters.track_artist ?? ""}
          onChange={actions.setTextFilter}
          placeholder="e.g. Taylor Swift"
        />

        {/* Multi-select: Genre */}
        <MultiSelectFilter
          field="playlist_genre"
          label="Genre"
          options={GENRE_OPTIONS}
          selected={filters.multiSelect.playlist_genre ?? []}
          onChange={actions.setMultiSelect}
        />

        {/* Multi-select: Subgenre */}
        <MultiSelectFilter
          field="playlist_subgenre"
          label="Subgenre"
          options={SUBGENRE_OPTIONS}
          selected={filters.multiSelect.playlist_subgenre ?? []}
          onChange={actions.setMultiSelect}
        />

        {/* Range filter: Popularity (0–100) */}
        <RangeFilter
          field="track_popularity"
          label="Popularity"
          min={0}
          max={100}
          step={1}
          value={filters.numericRange.track_popularity}
          onChange={actions.setNumericRange}
        />

        {/* Range filter: Tempo (BPM) */}
        <RangeFilter
          field="tempo"
          label="Tempo"
          min={0}
          max={220}
          step={1}
          value={filters.numericRange.tempo}
          onChange={actions.setNumericRange}
          format={(v) => `${v} bpm`}
        />

        {/* Range filter: Energy (0–1 scaled to 0–100 for UX) */}
        <RangeFilter
          field="energy"
          label="Energy"
          min={0}
          max={1}
          step={0.01}
          value={filters.numericRange.energy}
          onChange={actions.setNumericRange}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </div>

      {/* Clear all — only shown when at least one filter is active */}
      {hasAnyFilter && (
        <button
          className={styles.clearAll}
          type="button"
          onClick={actions.clearFilters}
          aria-label="Clear all filters"
        >
          {activeCount > 0 && (
            <span className={styles.badge}>{activeCount}</span>
          )}
          Clear all
        </button>
      )}
    </div>
  );
});
