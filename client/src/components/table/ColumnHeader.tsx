import { memo } from "react";
import type { SpotifyRecord, SortState } from "../../types";
import styles from "./ColumnHeader.module.css";

interface ColumnHeaderProps {
  label:    string;
  field:    keyof SpotifyRecord;
  sort:     SortState;
  onSort:   (field: keyof SpotifyRecord) => void;
  width?:   number;
  sortable?: boolean;
}

export const ColumnHeader = memo(function ColumnHeader({
  label,
  field,
  sort,
  onSort,
  width,
  sortable = true,
}: ColumnHeaderProps) {
  const isActive = sort.column === field;
  const arrow    = isActive ? (sort.order === "asc" ? "↑" : "↓") : null;

  function handleClick() {
    if (sortable) onSort(field);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (sortable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onSort(field);
    }
  }

  return (
    <th
      className={`${styles.th} ${isActive ? styles.active : ""} ${sortable ? styles.sortable : ""}`}
      style={width ? { width } : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={sortable ? 0 : undefined}
      aria-sort={
        isActive
          ? sort.order === "asc"
            ? "ascending"
            : "descending"
          : sortable
          ? "none"
          : undefined
      }
      role={sortable ? "columnheader button" : "columnheader"}
    >
      <span className={styles.inner}>
        <span className={styles.label}>{label}</span>
        {sortable && (
          <span className={styles.arrow} aria-hidden>
            {arrow ?? <span className={styles.arrowPlaceholder}>↕</span>}
          </span>
        )}
      </span>
    </th>
  );
});
