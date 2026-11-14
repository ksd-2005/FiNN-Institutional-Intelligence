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
    .filter((value) => /^[A-Z0-9^.-]{1,24}$/.test(value));
  const symbols = requestedSymbols.length
    ? [...new Set(requestedSymbols)].slice(0, 100)
    : portfolioSymbols;
  const slice = symbols.slice((page - 1) * pageSize, page * pageSize);
  const data = await Promise.all(
    slice.map(async (symbol) => {
      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`,
        );
        if (!response.ok) throw new Error("Yahoo unavailable");
        const json = await response.json();
        const result = json.chart.result?.[0];
        const meta = result?.meta || {};
        const closes =
          result?.indicators?.quote?.[0]?.close?.filter(Boolean) || [];
        const price = closes.at(-1) ?? meta.regularMarketPrice;
        const previous = closes.at(-2) ?? meta.previousClose;
        const quote = result?.indicators?.quote?.[0] || {};
        const volume =
          quote.volume?.filter((value) => value != null).at(-1) ??
          meta.regularMarketVolume ??
          null;
        return {
          symbol,
          price,
          previousClose: previous,
          changePct: previous ? ((price - previous) / previous) * 100 : null,
          open: quote.open?.filter((value) => value != null).at(-1) ?? null,
          high: quote.high?.filter((value) => value != null).at(-1) ?? null,
          low: quote.low?.filter((value) => value != null).at(-1) ?? null,
          volume,
          currency: meta.currency,
          exchange: meta.exchangeName,
          asOf: new Date().toISOString(),
          source: "Yahoo Finance",
          freshness: price == null ? "unavailable" : "live",
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
