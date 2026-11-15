export const portfolioSymbols = [
  "TRENT.NS",
  "TITAN.NS",
  "DIXON.NS",
  "UNOMINDA.NS",
  "RELIANCE.NS",
];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const page = Math.max(1, Number(req.query?.page || 1));
  const pageSize = 4;
  const requestedSymbols = String(req.query?.symbols || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
    .map((value) =>
      value.endsWith(".NS") || value.endsWith(".BO") ? value : `${value}.NS`,
    )
    .filter((value) => /^[A-Z0-9^.&-]{1,24}$/.test(value));
  const symbols = requestedSymbols.length
    ? [...new Set(requestedSymbols)].slice(0, 100)
    : portfolioSymbols;
  const slice = symbols.slice((page - 1) * pageSize, page * pageSize);
  const data = await Promise.all(
    slice.map(async (symbol) => {
      try {
        let response;
        let lastError;
        for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
          try {
            response = await fetch(
              `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`,
              { headers: { accept: "application/json", "user-agent": "FINN portfolio demo/1.0" }, signal: AbortSignal.timeout(5000) },
            );
            if (response.ok) break;
            lastError = new Error(`Yahoo ${host} returned HTTP ${response.status}`);
          } catch (error) {
            lastError = error;
          }
        }
        if (!response?.ok) throw lastError || new Error("Yahoo unavailable");
        const json = await response.json();
        const result = json.chart.result?.[0];
        const meta = result?.meta || {};
        const rawQuote = result?.indicators?.quote?.[0] || {};
        const timestamps = result?.timestamp || [];
        const nowIndia = new Date(Date.now() + 330 * 60_000);
        const indiaDate = `${nowIndia.getUTCFullYear()}-${String(nowIndia.getUTCMonth() + 1).padStart(2, "0")}-${String(nowIndia.getUTCDate()).padStart(2, "0")}`;
        const indiaWeekday = new Date(Date.UTC(nowIndia.getUTCFullYear(), nowIndia.getUTCMonth(), nowIndia.getUTCDate())).getUTCDay();
        const indiaHour = nowIndia.getUTCHours();
        const indiaMinute = nowIndia.getUTCMinutes();
        const isSessionInProgress = indiaWeekday > 0 && indiaWeekday < 6 &&
          (indiaHour < 16 || (indiaHour === 16 && indiaMinute === 0));
        const latestBarDate = timestamps.length
          ? new Date(timestamps.at(-1) * 1000 + 330 * 60_000).toISOString().slice(0, 10)
          : "";
        const completedCount = isSessionInProgress && latestBarDate === indiaDate
          ? Math.max(0, timestamps.length - 1)
          : timestamps.length;
        const closes = (rawQuote.close || []).slice(0, completedCount).filter(Boolean);
        const price = closes.at(-1) ?? meta.regularMarketPrice;
        const previous = closes.at(-2) ?? meta.previousClose;
        const quote = Object.fromEntries(Object.entries(rawQuote).map(([key, values]) => [key, (values || []).slice(0, completedCount)]));
        const volume =
          quote.volume?.filter((value) => value != null).at(-1) ??
          meta.regularMarketVolume ??
          null;
        const recentVolumes = (quote.volume || [])
          .filter((value) => value != null)
          .slice(0, -1)
          .slice(-20);
        const averageVolume = recentVolumes.length
          ? recentVolumes.reduce((sum, value) => sum + value, 0) / recentVolumes.length
          : null;
        return {
          symbol,
          price,
          previousClose: previous,
          changePct: previous ? ((price - previous) / previous) * 100 : null,
          open: quote.open?.filter((value) => value != null).at(-1) ?? null,
          high: quote.high?.filter((value) => value != null).at(-1) ?? null,
          low: quote.low?.filter((value) => value != null).at(-1) ?? null,
          volume,
          averageVolume,
          volumeMultiple: volume != null && averageVolume ? volume / averageVolume : null,
          currency: meta.currency,
          exchange: meta.exchangeName,
          asOf: new Date().toISOString(),
          source: "Yahoo Finance",
          freshness: price == null ? "unavailable" : "eod",
        };
      } catch (error) {
        return {
          symbol,
          price: null,
          changePct: null,
          source: "Yahoo Finance",
          freshness: "unavailable",
          error: error.message,
        };
      }
    }),
  );
  res.status(200).json({ page, pageSize, total: symbols.length, data });
}
