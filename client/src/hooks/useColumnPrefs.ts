import { useState, useCallback, useEffect } from "react";
import type { ColumnPreference } from "../types";

const STORAGE_KEY = "spotify-table:column-prefs";

/**
 * Persists column visibility and order to localStorage.
 *
 * On first load, defaults are built from the provided column ids.
 * On subsequent loads, saved prefs are merged with defaults so
 * newly added columns appear visible rather than being hidden.
 */
export function useColumnPrefs(defaultColumnIds: string[]) {
  const [prefs, setPrefs] = useState<ColumnPreference[]>(() =>
    loadPrefs(defaultColumnIds),
  );

  // merge new columns into the saved prefs.
  useEffect(() => {
    setPrefs((current) => mergeWithDefaults(current, defaultColumnIds));
  }, [defaultColumnIds.join(",")]); // stable dep: join won't change unless ids change

  const savePrefs = useCallback((next: ColumnPreference[]) => {
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage can be unavailable in private browsing — fail silently
    }
  }, []);

  const toggleColumn = useCallback(
    (id: string) => {
      setPrefs((current) => {
        const next = current.map((c) =>
          c.id === id ? { ...c, visible: !c.visible } : c,
        );
        savePrefs(next);
        return next;
      });
    },
    [savePrefs],
  );

  const reorderColumns = useCallback(
    (fromId: string, toId: string) => {
      setPrefs((current) => {
        const fromIndex = current.findIndex((c) => c.id === fromId);
        const toIndex = current.findIndex((c) => c.id === toId);
        if (fromIndex === -1 || toIndex === -1) return current;

        const next = [...current];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);

        // Re-assign order values to reflect new positions
        const reordered = next.map((c, i) => ({ ...c, order: i }));
        savePrefs(reordered);
        return reordered;
      });
    },
    [savePrefs],
  );

  const resetPrefs = useCallback(() => {
    const defaults = buildDefaults(defaultColumnIds);
    savePrefs(defaults);
  }, [defaultColumnIds, savePrefs]);

  // Stable derived values
  const visibleColumnIds = prefs
    .filter((c) => c.visible)
    .sort((a, b) => a.order - b.order)
    .map((c) => c.id);

  return {
    prefs,
    visibleColumnIds,
    toggleColumn,
    reorderColumns,
    resetPrefs,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDefaults(ids: string[]): ColumnPreference[] {
  return ids.map((id, i) => ({ id, visible: true, order: i }));
}

function loadPrefs(defaultIds: string[]): ColumnPreference[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaults(defaultIds);
    const saved = JSON.parse(raw) as ColumnPreference[];
    return mergeWithDefaults(saved, defaultIds);
  } catch {
    return buildDefaults(defaultIds);
  }
}

/**
 * Ensures saved prefs and current column list stay in sync.
 * - Columns removed from the app are dropped from saved prefs.
 * - Columns newly added to the app are appended as visible.
 */
function mergeWithDefaults(
  saved: ColumnPreference[],
  defaultIds: string[],
): ColumnPreference[] {
  const savedMap = new Map(saved.map((c) => [c.id, c]));
  const maxOrder = saved.reduce((m, c) => Math.max(m, c.order), -1);

  const merged: ColumnPreference[] = [];

  // Keep saved prefs for columns that still exist
  for (const pref of saved) {
    if (defaultIds.includes(pref.id)) {
      merged.push(pref);
    }
  }

  // Append any new columns not in saved prefs
  defaultIds.forEach((id, i) => {
    if (!savedMap.has(id)) {
      merged.push({ id, visible: true, order: maxOrder + 1 + i });
    }
  });

  return merged.sort((a, b) => a.order - b.order);
}
