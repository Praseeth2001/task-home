import { useMemo } from "react";
import { useTableState }    from "./hooks/useTableState";
import { useFetchRecords }  from "./hooks/useFetchRecords";
import { useColumnPrefs }   from "./hooks/useColumnPrefs";
import { DataTable, DEFAULT_COLUMNS } from "./components/table/DataTable";
import { TableToolbar }     from "./components/table/TableToolbar";
import { usePagination, PAGE_SIZE_OPTIONS } from "./hooks/usePagination";
import { countActiveFilters } from "./utils/filterUtils";
import styles from "./App.module.css";

const DEFAULT_COLUMN_IDS = DEFAULT_COLUMNS.map((c) => c.id);

export default function App() {
  const { state, actions } = useTableState();

  const { records, totalCount, isLoading, isError, errorMessage, refetch } =
    useFetchRecords({
      pagination: state.pagination,
      sort:       state.sort,
      filters:    state.filters,
    });

  const { visibleColumnIds } = useColumnPrefs(DEFAULT_COLUMN_IDS);

  const visibleColumns = useMemo(
    () => DEFAULT_COLUMNS.filter((c) => visibleColumnIds.includes(c.id)),
    [visibleColumnIds]
  );

  const { totalPages, startRow, endRow, hasPrev, hasNext, pageNumbers } =
    usePagination({
      totalCount,
      page:  state.pagination.page,
      limit: state.pagination.limit,
    });

  const activeFilterCount = useMemo(
    () => countActiveFilters(state.filters),
    [state.filters]
  );

  return (
    <div className={styles.app}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>◆</span>
          <h1 className={styles.title}>Spotify Tracks</h1>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.rowCount}>
            {totalCount.toLocaleString()} tracks
          </span>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className={styles.main}>
        {/* Search + filters toolbar */}
        <TableToolbar
          filters={state.filters}
          actions={actions}
          activeCount={activeFilterCount}
        />

        {/* Virtualized data table */}
        <DataTable
          records={records}
          totalCount={totalCount}
          columns={visibleColumns}
          state={state}
          actions={actions}
          isLoading={isLoading}
          isError={isError}
          errorMessage={errorMessage}
          onRetry={refetch}
        />
      </main>

      {/* ── Pagination footer ────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <span className={styles.showing}>
          {totalCount === 0
            ? "No results"
            : `Showing ${startRow.toLocaleString()}–${endRow.toLocaleString()} of ${totalCount.toLocaleString()}`}
        </span>

        <nav className={styles.pageControls} aria-label="Pagination">
          <button
            className={styles.pageBtn}
            disabled={!hasPrev}
            onClick={() => actions.setPage(state.pagination.page - 1)}
            aria-label="Previous page"
          >
            ‹
          </button>

          {pageNumbers.map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className={styles.ellipsis}>…</span>
            ) : (
              <button
                key={p}
                className={`${styles.pageBtn} ${p === state.pagination.page ? styles.pageBtnActive : ""}`}
                onClick={() => actions.setPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === state.pagination.page ? "page" : undefined}
              >
                {p}
              </button>
            )
          )}

          <button
            className={styles.pageBtn}
            disabled={!hasNext}
            onClick={() => actions.setPage(state.pagination.page + 1)}
            aria-label="Next page"
          >
            ›
          </button>
        </nav>

        <select
          className={styles.limitSelect}
          value={state.pagination.limit}
          onChange={(e) => actions.setLimit(Number(e.target.value))}
          aria-label="Rows per page"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
      </footer>
    </div>
  );
}
