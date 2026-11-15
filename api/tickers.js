import { tickerDirectory } from "../src/ticker-directory.js";
import { databaseReady, searchTickerRecords } from "./db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const query = String(req.query?.q || "").trim().slice(0, 48);
  try {
    if (databaseReady()) {
      const data = await searchTickerRecords(query, 15);
      return res.status(200).json({ data, source: "database" });
    }
  } catch {
    // A local symbol index keeps suggestions available if the database is not
    // configured yet or is temporarily unreachable.
  }
  const normalized = query.toLowerCase();
  const data = tickerDirectory
    .filter((row) => !normalized || row.ticker.toLowerCase().includes(normalized) || row.name.toLowerCase().includes(normalized))
    .slice(0, 15);
  return res.status(200).json({ data, source: "bundled", databaseConfigured: databaseReady() });
}
