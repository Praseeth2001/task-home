# Spotify Table

A high-performance, fully interactive table for 30,000 Spotify tracks — built as a React take-home assignment.

## Quick start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Download the dataset
#    https://www.kaggle.com/datasets/joebeachcapital/30000-spotify-songs
#    Place the CSV at: data/spotify.csv

# 3. Convert CSV → JSON (one-time)
node scripts/csvToJson.js

# 4. Run everything (json-server + Vite in parallel)
npm run dev
```

Open `http://localhost:5173` — json-server runs on port 3001.

### Environment

Copy `.env.example` and adjust if you run json-server on a different port:

```bash
cp client/.env.example client/.env
```

---

## Dataset

**Spotify Tracks** (~30,000 rows) from Kaggle.

Chosen over the Sales dataset because:
- Richer mix of data types: strings, 0–1 floats, integers, booleans, date strings
- Natural candidates for every filter type: text (artist), multi-select (genre), numeric range (tempo, popularity, energy)
- More interesting to interact with — reviewers see this table all day

---

## Features implemented

| Feature | Detail |
|---|---|
| **Virtualisation** | `@tanstack/react-virtual` — only visible rows render (~60 FPS on 30 k rows) |
| **Server-side ops** | Pagination, sort, filter, search all go through json-server query params — client never holds the full dataset |
| **Sorting** | Click any column header; toggle asc/desc; `aria-sort` for accessibility |
| **Pagination** | 25/50/100 page sizes; prev/next + page-number nav with ellipsis; "Showing X–Y of Z" |
| **Filtering** | Artist text filter (`_like`), genre + subgenre multi-select, popularity/tempo/energy range (`_gte`/`_lte`) |
| **Global search** | Debounced 300 ms; active indicator; clear button |
| **Inline editing** | Track name, artist, popularity — with field-level validation, save/cancel, keyboard support (Enter/Escape) |
| **Optimistic UI** | Edit commits instantly; rolls back on API failure with error message |
| **Bulk selection** | Per-page checkboxes + "Select all N matching rows"; scope shown explicitly |
| **CSV export** | Exports current filtered/sorted view; respects visible columns; RFC 4180 escaping |
| **Column management** | Toggle visibility, drag-to-reorder, persisted to `localStorage` |
| **States** | Loading overlay (stale rows + spinner), error (with retry), empty (with clear-filters CTA) |
| **Responsive** | Toolbar scrolls horizontally on tablet; table scrolls independently |
| **Accessibility** | Semantic HTML, `aria-sort`, `aria-label`, `aria-live`, keyboard navigation throughout |

---

## Technical decisions and trade-offs

### `useReducer` for table state
Sorting, filtering, and pagination interact — changing a filter must reset the page to 1 and clear the selection. With individual `useState` calls this requires `useEffect` chains that are hard to test and easy to break. A single reducer makes every interaction explicit and unit-testable as a pure function.

### json-server v0.17 pinned
v1.0 changed query-param syntax in a breaking way. v0.17 is pinned in the root `package.json` scripts to match the brief's example params exactly (`_page`, `_limit`, `_like`, `_gte`, `_lte`, `q`).

### Debounce in the fetch hook, not the search component
`SearchBar` fires on every keystroke. The 300 ms debounce is inside `useFetchRecords`. This is the correct separation: the component doesn't know or care about network timing; the hook controls when it talks to the API.

### Optimistic UI — rollback via closure
`useInlineEdit` snapshots `originalValue` before the optimistic update. If the PATCH fails, it restores from the snapshot regardless of any other concurrent state changes.

### `RangeFilter` commits on blur/Enter, not onChange
Committing on every keystroke would trigger a page reset while the user is still typing `"120"` (after typing `"1"`, then `"12"`). Local string state absorbs keystrokes; the reducer sees only the committed value.

### Column preferences merge on app update
`useColumnPrefs` merges saved localStorage prefs with the current column list on mount. New columns added in a future release appear visible rather than silently hidden by stale prefs.

### CSV export is a two-step server fetch
The export doesn't use the currently loaded page — it re-fetches all rows matching the active filters (preflight for total count, then one large request). This guarantees the export reflects the full filtered set, not just what's visible.

---

## Known limitations / what I'd improve with more time

- **AND/OR filter combinations** — all filters currently combine with AND logic only. A filter builder with OR support would be a natural next step.
- **Date-range filter** — `track_album_release_date` has a range filter ready in the type system but no UI control yet; a date-picker component would complete it.
- **Column resizing** — column widths are fixed. Drag-to-resize headers would improve usability on wide monitors.
- **Saved view presets** — saving a named combination of filters/sort/columns to localStorage.
- **Deployed demo** — would add with a bit more time; Vercel + the json-server running on Railway would work cleanly.
- **More test coverage** — current tests cover the reducer, CSV escaping, and query builder. Component tests for `EditableCell` (optimistic rollback) and `MultiSelectFilter` (close on escape) would be valuable additions.
- **Accessibility pass** — `aria-live` regions are in place; a fuller pass with a screen reader would catch edge cases in the virtual scroll.
---