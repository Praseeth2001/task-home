import type { SpotifyRecord } from "../types";

/** RFC 4180 cell escaping */
function escapeCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (!str.includes(",") && !str.includes('"') && !str.includes("\n"))
    return str;
  return `"${str.replace(/"/g, '""')}"`;
}

export function recordsToCsv(
  records: SpotifyRecord[],
  columns: (keyof SpotifyRecord)[],
): string {
  const header = columns.map(escapeCell).join(",");
  const rows = records.map((r) =>
    columns.map((col) => escapeCell(r[col])).join(","),
  );
  return [header, ...rows].join("\r\n");
}

export function downloadCsv(
  csv: string,
  filename = "spotify-export.csv",
): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
