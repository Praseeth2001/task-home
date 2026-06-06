import { useState, useCallback } from "react";
import type { SpotifyRecord } from "../../types";
import styles from "./RangeFilter.module.css";

interface RangeFilterProps {
  field:    keyof SpotifyRecord;
  label:    string;
  min:      number;     // absolute minimum for this field
  max:      number;     // absolute maximum for this field
  step?:    number;
  value:    { min?: number; max?: number } | undefined;
  onChange: (field: keyof SpotifyRecord, min?: number, max?: number) => void;
  format?:  (v: number) => string;   // e.g. (v) => `${v} bpm`
}

/**
 * Numeric range filter — two number inputs.
 * Maps to json-server's <field>_gte / <field>_lte params.
 *
 * Validation:
 *  - min input won't exceed max value
 *  - max input won't go below min value
 *  - empty input clears that bound
 */
export function RangeFilter({
  field,
  label,
  min: absMin,
  max: absMax,
  step = 1,
  value,
  onChange,
  format,
}: RangeFilterProps) {
  // Local string state so the user can type freely without every
  // intermediate keystroke triggering an API call.
  const [localMin, setLocalMin] = useState(value?.min !== undefined ? String(value.min) : "");
  const [localMax, setLocalMax] = useState(value?.max !== undefined ? String(value.max) : "");

  const isActive = value?.min !== undefined || value?.max !== undefined;

  const commit = useCallback(
    (rawMin: string, rawMax: string) => {
      const parsedMin = rawMin.trim() === "" ? undefined : Number(rawMin);
      const parsedMax = rawMax.trim() === "" ? undefined : Number(rawMax);
      onChange(
        field,
        parsedMin !== undefined && !isNaN(parsedMin) ? parsedMin : undefined,
        parsedMax !== undefined && !isNaN(parsedMax) ? parsedMax : undefined,
      );
    },
    [field, onChange]
  );

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalMin(e.target.value);
  };
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalMax(e.target.value);
  };

  // Commit to reducer on blur (not on every keystroke — avoids pagination
  // resets while the user is still typing the number)
  const handleMinBlur = () => commit(localMin, localMax);
  const handleMaxBlur = () => commit(localMin, localMax);

  // Also commit on Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit(localMin, localMax);
  };

  const clear = () => {
    setLocalMin("");
    setLocalMax("");
    onChange(field, undefined, undefined);
  };

  const placeholder = format
    ? `${format(absMin)} – ${format(absMax)}`
    : `${absMin} – ${absMax}`;

  return (
    <div className={`${styles.root} ${isActive ? styles.active : ""}`}>
      <div className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        {isActive && (
          <button className={styles.clearBtn} type="button" onClick={clear} aria-label={`Clear ${label} filter`}>
            Clear
          </button>
        )}
      </div>

      <div className={styles.inputs}>
        <input
          className={styles.input}
          type="number"
          min={absMin}
          max={absMax}
          step={step}
          value={localMin}
          onChange={handleMinChange}
          onBlur={handleMinBlur}
          onKeyDown={handleKeyDown}
          placeholder="Min"
          aria-label={`Minimum ${label}`}
        />
        <span className={styles.sep}>–</span>
        <input
          className={styles.input}
          type="number"
          min={absMin}
          max={absMax}
          step={step}
          value={localMax}
          onChange={handleMaxChange}
          onBlur={handleMaxBlur}
          onKeyDown={handleKeyDown}
          placeholder="Max"
          aria-label={`Maximum ${label}`}
        />
      </div>

      {!isActive && (
        <span className={styles.hint}>{placeholder}</span>
      )}
    </div>
  );
}
