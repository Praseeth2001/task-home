/**
 * Converts Spotify Kaggle CSV → server/db.json for json-server.
 * Usage: node scripts/csvToJson.js
 */
const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "../data/spotify_songs.csv");
const OUTPUT = path.join(__dirname, "../server/db.json");

if (!fs.existsSync(INPUT)) {
  console.error("❌  data/spotify.csv not found.");
  console.error(
    "    Download: https://www.kaggle.com/datasets/joebeachcapital/30000-spotify-songs",
  );
  process.exit(1);
}

function splitLine(line) {
  const result = [];
  let cur = "",
    inQuote = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (ch === "," && !inQuote) {
      result.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  result.push(cur);
  return result;
}

function parseCSV(raw) {
  const lines = raw.split("\n").filter(Boolean);
  const headers = splitLine(lines[0]);
  return lines.slice(1).map((line, idx) => {
    const values = splitLine(line);
    const row = { id: String(idx + 1) };
    headers.forEach((h, i) => {
      const key = h.trim().replace(/^"|"$/g, "");
      const val = (values[i] ?? "").trim().replace(/^"|"$/g, "");
      row[key] = isNaN(val) || val === "" ? val : Number(val);
    });
    return row;
  });
}

console.log("📖  Reading CSV…");
const records = parseCSV(fs.readFileSync(INPUT, "utf8"));
console.log(`✅  Parsed ${records.length.toLocaleString()} rows`);
fs.writeFileSync(OUTPUT, JSON.stringify({ records }, null, 0));
console.log(
  `✅  server/db.json written (${(fs.statSync(OUTPUT).size / 1_048_576).toFixed(1)} MB)`,
);
