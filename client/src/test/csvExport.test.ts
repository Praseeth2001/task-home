import { describe, it, expect } from "vitest";
import { recordsToCsv } from "../utils/csvExport";
import type { SpotifyRecord } from "../types";

const baseRecord: SpotifyRecord = {
  id: "1",
  track_id: "abc",
  track_name: "Blank Space",
  track_artist: "Taylor Swift",
  track_album_id: "alb1",
  track_album_name: "1989",
  track_album_release_date: "2014-10-27",
  playlist_name: "Pop Hits",
  playlist_id: "pl1",
  playlist_genre: "pop",
  playlist_subgenre: "dance pop",
  track_popularity: 90,
  track_explicit: 0,
  danceability: 0.8,
  energy: 0.7,
  key: 6,
  loudness: -5.5,
  mode: 1,
  speechiness: 0.04,
  acousticness: 0.1,
  instrumentalness: 0,
  liveness: 0.1,
  valence: 0.6,
  tempo: 96.0,
  duration_ms: 231600,
  time_signature: 4,
};

const COLS: (keyof SpotifyRecord)[] = [
  "id",
  "track_name",
  "track_artist",
  "track_popularity",
];

describe("recordsToCsv", () => {
  it("produces a header row matching the requested columns", () => {
    const csv = recordsToCsv([baseRecord], COLS);
    const [header] = csv.split("\r\n");
    expect(header).toBe("id,track_name,track_artist,track_popularity");
  });

  it("produces one data row per record", () => {
    const csv = recordsToCsv([baseRecord, { ...baseRecord, id: "2" }], COLS);
    const rows = csv.split("\r\n");
    expect(rows).toHaveLength(3); // header + 2 data rows
  });

  it("wraps cells containing commas in double quotes", () => {
    const record = { ...baseRecord, track_name: "Hello, World" };
    const csv = recordsToCsv([record], ["track_name"]);
    expect(csv).toContain('"Hello, World"');
  });

  it("escapes double quotes inside a cell by doubling them (RFC 4180)", () => {
    const record = { ...baseRecord, track_name: 'Say "Hello"' };
    const csv = recordsToCsv([record], ["track_name"]);
    expect(csv).toContain('"Say ""Hello"""');
  });

  it("wraps cells containing newlines in double quotes", () => {
    const record = { ...baseRecord, track_name: "Line1\nLine2" };
    const csv = recordsToCsv([record], ["track_name"]);
    expect(csv).toContain('"Line1\nLine2"');
  });

  it("renders null/undefined as empty string", () => {
    const record = {
      ...baseRecord,
      track_name: undefined as unknown as string,
    };
    const csv = recordsToCsv([record], ["track_name"]);
    const [, dataRow] = csv.split("\r\n");
    expect(dataRow).toBe("");
  });

  it("uses CRLF line endings (RFC 4180)", () => {
    const csv = recordsToCsv([baseRecord], COLS);
    expect(csv).toContain("\r\n");
  });

  it("handles an empty records array (header only)", () => {
    const csv = recordsToCsv([], COLS);
    const rows = csv.split("\r\n");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toBe("id,track_name,track_artist,track_popularity");
  });
});
