import { useState, useRef, useEffect, useCallback } from "react";
import type { SpotifyRecord } from "../../types";
import styles from "./EditableCell.module.css";

// Fields the user is allowed to edit + their validation rules
export const EDITABLE_FIELDS: Partial<
  Record<keyof SpotifyRecord, EditableFieldConfig>
> = {
  track_name: {
    type: "text",
    validate: (v) =>
      String(v).trim().length > 0 ? null : "Track name cannot be empty",
    placeholder: "Track name",
  },
  track_artist: {
    type: "text",
    validate: (v) =>
      String(v).trim().length > 0 ? null : "Artist cannot be empty",
    placeholder: "Artist name",
  },
  track_popularity: {
    type: "number",
    min: 0,
    max: 100,
    validate: (v) => {
      const n = Number(v);
      if (isNaN(n)) return "Must be a number";
      if (n < 0 || n > 100) return "Must be 0–100";
      return null;
    },
    placeholder: "0–100",
  },
};

export interface EditableFieldConfig {
  type: "text" | "number";
  validate: (value: string | number) => string | null;
  placeholder?: string;
  min?: number;
  max?: number;
}

interface EditableCellProps {
  rowId: string;
  field: keyof SpotifyRecord;
  value: SpotifyRecord[keyof SpotifyRecord];
  isEditing: boolean;
  onStartEdit: (
    rowId: string,
    field: keyof SpotifyRecord,
    originalValue: SpotifyRecord[keyof SpotifyRecord],
  ) => void;
  onSave: (
    rowId: string,
    field: keyof SpotifyRecord,
    newValue: string | number,
  ) => Promise<void>;
  onCancel: () => void;
}

export function EditableCell({
  rowId,
  field,
  value,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
}: EditableCellProps) {
  const config = EDITABLE_FIELDS[field];
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(String(value ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Focus input when editing starts; reset draft to current value
  useEffect(() => {
    if (isEditing) {
      setDraft(String(value ?? ""));
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 10);
    }
  }, [isEditing, value]);

  const handleSave = useCallback(async () => {
    if (!config) return;
    const trimmed = draft.trim();
    const parsedVal = config.type === "number" ? Number(trimmed) : trimmed;
    const validation = config.validate(parsedVal);

    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    try {
      await onSave(rowId, field, parsedVal);
    } catch {
      setError("Save failed — changes rolled back");
    } finally {
      setSaving(false);
    }
  }, [config, draft, field, onSave, rowId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [handleSave, onCancel],
  );

  // ── View mode ─────────────────────────────────────────────────────────────
  if (!isEditing) {
    if (!config) {
      return <span className={styles.plain}>{String(value ?? "")}</span>;
    }

    return (
      <button
        className={styles.trigger}
        onClick={() => onStartEdit(rowId, field, value)}
        title={`Click to edit ${field.replace(/_/g, " ")}`}
        aria-label={`Edit ${field.replace(/_/g, " ")}: ${value}`}
      >
        <span className={styles.triggerText}>
          {String(value ?? "")}
          {field === "track_popularity" ? "%" : ""}
        </span>
      </button>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  return (
    <div className={`${styles.editor} ${error ? styles.hasError : ""}`}>
      <input
        ref={inputRef}
        className={styles.input}
        type={config?.type === "number" ? "number" : "text"}
        min={config?.min}
        max={config?.max}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        placeholder={config?.placeholder}
        disabled={saving}
        aria-invalid={!!error}
        aria-describedby={error ? `edit-error-${rowId}` : undefined}
      />

      {error && (
        <span
          id={`edit-error-${rowId}`}
          className={styles.errorMsg}
          role="alert"
        >
          {error}
        </span>
      )}

      <div className={styles.actions}>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
          aria-label="Save"
          title="Save (Enter)"
        >
          {saving ? "…" : "✓"}
        </button>
        <button
          className={styles.cancelBtn}
          onClick={onCancel}
          disabled={saving}
          aria-label="Cancel"
          title="Cancel (Escape)"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
