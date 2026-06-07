import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchRecord, patchRecord } from "../api/records";
import { recordsToCsv, downloadCsv } from "../utils/csvExport";
import { Spinner } from "../components/ui/Spinner";
import { ErrorState } from "../components/ui/ErrorState";
import type { SpotifyRecord } from "../types";
import styles from "./TrackDetailPage.module.css";

// Fields shown in view + edit mode, with metadata
const FIELD_GROUPS: {
  heading: string;
  fields: {
    key: keyof SpotifyRecord;
    label: string;
    editable?: boolean;
    type?: "text" | "number";
    min?: number;
    max?: number;
  }[];
}[] = [
  {
    heading: "Identity",
    fields: [
      { key: "track_name", label: "Track name", editable: true, type: "text" },
      { key: "track_artist", label: "Artist", editable: true, type: "text" },
      { key: "track_album_name", label: "Album", editable: false },
      {
        key: "track_album_release_date",
        label: "Release date",
        editable: false,
      },
      { key: "playlist_genre", label: "Genre", editable: false },
      { key: "playlist_subgenre", label: "Subgenre", editable: false },
      { key: "track_explicit", label: "Explicit", editable: false },
    ],
  },
  {
    heading: "Metrics",
    fields: [
      {
        key: "track_popularity",
        label: "Popularity",
        editable: true,
        type: "number",
        min: 0,
        max: 100,
      },
      {
        key: "tempo",
        label: "Tempo (BPM)",
        editable: true,
        type: "number",
        min: 0,
        max: 250,
      },
      {
        key: "energy",
        label: "Energy",
        editable: true,
        type: "number",
        min: 0,
        max: 1,
      },
      {
        key: "danceability",
        label: "Danceability",
        editable: true,
        type: "number",
        min: 0,
        max: 1,
      },
      {
        key: "valence",
        label: "Valence",
        editable: true,
        type: "number",
        min: 0,
        max: 1,
      },
      { key: "acousticness", label: "Acousticness", editable: false },
      { key: "instrumentalness", label: "Instrumentalness", editable: false },
      { key: "liveness", label: "Liveness", editable: false },
      { key: "speechiness", label: "Speechiness", editable: false },
      { key: "loudness", label: "Loudness (dB)", editable: false },
      { key: "duration_ms", label: "Duration", editable: false },
    ],
  },
  {
    heading: "Keys",
    fields: [
      { key: "track_id", label: "Track ID", editable: false },
      { key: "playlist_id", label: "Playlist ID", editable: false },
      { key: "playlist_name", label: "Playlist", editable: false },
    ],
  },
];

type Mode = "view" | "edit";

type DraftRecord = { [K in keyof SpotifyRecord]: string };

function toDraft(record: SpotifyRecord): DraftRecord {
  return Object.fromEntries(
    Object.entries(record).map(([k, v]) => [k, String(v ?? "")]),
  ) as DraftRecord;
}

function formatValue(
  key: keyof SpotifyRecord,
  value: SpotifyRecord[keyof SpotifyRecord],
): string {
  if (value === null || value === undefined) return "—";
  if (key === "duration_ms") {
    const s = Math.floor(Number(value) / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  if (key === "track_explicit") return value ? "Yes" : "No";
  if (
    [
      "energy",
      "danceability",
      "valence",
      "acousticness",
      "instrumentalness",
      "liveness",
      "speechiness",
    ].includes(key)
  ) {
    return `${(Number(value) * 100).toFixed(1)}%`;
  }
  if (key === "tempo") return `${Number(value).toFixed(1)} bpm`;
  if (key === "loudness") return `${Number(value).toFixed(1)} dB`;
  return String(value);
}

export function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<SpotifyRecord | null>(null);
  const [draft, setDraft] = useState<DraftRecord | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof SpotifyRecord, string>>
  >({});

  // ── Fetch record on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchRecord(id)
      .then((r) => {
        setRecord(r);
        setDraft(toDraft(r));
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [id]);

  // ── Enter edit mode ───────────────────────────────────────────────────────
  const handleEdit = useCallback(() => {
    if (record) setDraft(toDraft(record));
    setMode("edit");
    setErrors({});
  }, [record]);

  // ── Cancel edit ───────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (record) setDraft(toDraft(record));
    setMode("view");
    setErrors({});
  }, [record]);

  // ── Field change ──────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (key: keyof SpotifyRecord, value: string) => {
      setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
      setErrors((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    },
    [],
  );

  // ── Validate draft ────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Partial<Record<keyof SpotifyRecord, string>> = {};
    FIELD_GROUPS.forEach(({ fields }) => {
      fields
        .filter((f) => f.editable)
        .forEach((f) => {
          const raw = draft?.[f.key] ?? "";
          if (f.type === "text" && raw.trim() === "") {
            errs[f.key] = `${f.label} cannot be empty`;
          }
          if (f.type === "number") {
            const n = Number(raw);
            if (isNaN(n)) errs[f.key] = "Must be a number";
            else if (f.min !== undefined && n < f.min)
              errs[f.key] = `Min ${f.min}`;
            else if (f.max !== undefined && n > f.max)
              errs[f.key] = `Max ${f.max}`;
          }
        });
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!record || !draft || !validate()) return;

    // Build payload of only changed editable fields
    const payload: Partial<SpotifyRecord> = {};
    FIELD_GROUPS.forEach(({ fields }) => {
      fields
        .filter((f) => f.editable)
        .forEach((f) => {
          const newVal =
            f.type === "number" ? Number(draft[f.key]) : draft[f.key];
          if (String(record[f.key]) !== String(newVal)) {
            (payload as Record<string, unknown>)[f.key] = newVal;
          }
        });
    });

    if (Object.keys(payload).length === 0) {
      setMode("view");
      return;
    }

    setSaving(true);
    try {
      const updated = await patchRecord(record.id, payload);
      setRecord(updated);
      setDraft(toDraft(updated));
      setMode("view");
      setSaveMsg("Saved successfully");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: unknown) {
      setSaveMsg(`Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [record, draft]);

  // ── Download single record as CSV ─────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!record) return;
    const cols = Object.keys(record) as (keyof SpotifyRecord)[];
    const csv = recordsToCsv([record], cols);
    downloadCsv(csv, `track-${record.id}.csv`);
  }, [record]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className={styles.centered}>
        <Spinner size="lg" />
      </div>
    );
  if (error || !record)
    return (
      <div className={styles.centered}>
        <ErrorState
          message={error ?? "Track not found"}
          onRetry={() => navigate(-1)}
        />
      </div>
    );

  return (
    <div className={styles.page}>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className={styles.topBar}>
        <Link to="/" className={styles.backBtn}>
          ← Back to table
        </Link>

        <div className={styles.actions}>
          {saveMsg && (
            <span
              className={`${styles.saveMsg} ${saveMsg.startsWith("Save failed") ? styles.saveMsgError : ""}`}
            >
              {saveMsg}
            </span>
          )}

          {mode === "view" ? (
            <>
              <button className={styles.btnSecondary} onClick={handleDownload}>
                ↓ Download CSV
              </button>
              <button className={styles.btnPrimary} onClick={handleEdit}>
                ✎ Edit
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.btnGhost}
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={styles.btnSecondary}
                onClick={handleDownload}
                disabled={saving}
              >
                ↓ Download CSV
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "✓ Save"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Track hero ──────────────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroMeta}>
            <span className={styles.heroGenre}>{record.playlist_genre}</span>
            {record.track_explicit ? (
              <span className={styles.explicitBadge}>E</span>
            ) : null}
            {mode === "edit" && (
              <span className={styles.editingBadge}>Editing</span>
            )}
          </div>
          <h1 className={styles.heroTitle}>
            {mode === "edit" && draft ? (
              <input
                className={`${styles.heroInput} ${errors.track_name ? styles.inputError : ""}`}
                value={draft.track_name}
                onChange={(e) => handleChange("track_name", e.target.value)}
                aria-label="Track name"
              />
            ) : (
              record.track_name
            )}
          </h1>
          <p className={styles.heroArtist}>
            {mode === "edit" && draft ? (
              <input
                className={`${styles.heroInputSm} ${errors.track_artist ? styles.inputError : ""}`}
                value={draft.track_artist}
                onChange={(e) => handleChange("track_artist", e.target.value)}
                aria-label="Artist name"
              />
            ) : (
              `by ${record.track_artist}`
            )}
          </p>
          <p className={styles.heroAlbum}>
            {record.track_album_name} · {record.track_album_release_date}
          </p>
        </div>

        {/* Popularity meter */}
        <div className={styles.popularityMeter}>
          <span className={styles.popularityNum}>
            {record.track_popularity}
          </span>
          <span className={styles.popularityLabel}>popularity</span>
          <div className={styles.popularityTrack}>
            <div
              className={styles.popularityFill}
              style={{ height: `${record.track_popularity}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Field groups ────────────────────────────────────────────────── */}
      <div className={styles.groups}>
        {FIELD_GROUPS.map(({ heading, fields }) => (
          <section key={heading} className={styles.group}>
            <h2 className={styles.groupHeading}>{heading}</h2>
            <div className={styles.fieldGrid}>
              {fields.map(({ key, label, editable, type, min, max }) => {
                const raw = draft?.[key] ?? "";
                const err = errors[key];
                const isEditing = mode === "edit" && editable;

                return (
                  <div
                    key={key}
                    className={`${styles.field} ${isEditing ? styles.fieldEditing : ""}`}
                  >
                    <span className={styles.fieldLabel}>{label}</span>
                    {isEditing ? (
                      <div className={styles.fieldInputWrap}>
                        <input
                          className={`${styles.fieldInput} ${err ? styles.inputError : ""}`}
                          type={type === "number" ? "number" : "text"}
                          min={min}
                          max={max}
                          step={type === "number" && max && max <= 1 ? 0.01 : 1}
                          value={raw}
                          onChange={(e) => handleChange(key, e.target.value)}
                          aria-label={label}
                          aria-invalid={!!err}
                        />
                        {err && (
                          <span className={styles.fieldError}>{err}</span>
                        )}
                      </div>
                    ) : (
                      <span className={styles.fieldValue}>
                        {formatValue(key, record[key])}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
