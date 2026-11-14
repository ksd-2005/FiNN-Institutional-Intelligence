const cache = new Map();
const TTL_MS = 15 * 60 * 1000;
const ALLOWED = /^[A-Z0-9.-]{1,20}$/;

function clean(value = "") {
  return value
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseTable(html, id) {
  const section = html.match(
    new RegExp(
      `<section[^>]+id=["']${id}["'][\\s\\S]*?<table[\\s\\S]*?<tbody>([\\s\\S]*?)<\\/tbody>`,
      "i",
    ),
  )?.[1];
  if (!section) return [];
  return [...section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(([, row]) => {
      const cells = [
        ...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi),
      ].map(([, cell]) => clean(cell));
      return cells.length > 1
        ? { label: cells[0], values: cells.slice(1) }
        : null;
    })
    .filter(Boolean);
}

function findMetric(html, label) {
  const items = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
  const item = items.find(([, markup]) =>
    new RegExp(`>\\s*${label}\\s*<`, "i").test(markup),
  );
  if (!item) return null;
  const numbers = [
    ...item[1].matchAll(
      /<span[^>]*class=["'][^"']*number[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
    ),
  ].map(([, value]) => clean(value));
  if (numbers.length) {
    const unit = /\bCr\./i.test(item[1]) ? " Cr" : "";
    const currency = /₹/.test(item[1]) ? "₹" : "";
    return `${currency}${numbers[0]}${unit}`;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const ticker = String(req.query?.ticker || "").toUpperCase();
  if (!ALLOWED.test(ticker))
    return res.status(400).json({ error: "Provide a valid ticker symbol." });
  const cached = cache.get(ticker);
  if (cached && cached.expiresAt > Date.now())
    return res.status(200).json({ ...cached.payload, cached: true });
  const sourceUrl = `https://www.screener.in/company/${encodeURIComponent(ticker)}/consolidated/`;
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        accept: "text/html",
        "user-agent": "FINN personal research demo/1.0",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new Error(`Screener returned HTTP ${response.status}`);
    const html = await response.text();
    if (!/<section[^>]+id=["']profit-loss["']/i.test(html))
      throw new Error("Company page was not available in the expected format.");
    const payload = {
      ticker,
      name: clean(
        html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || `${ticker} Ltd`,
      ),
      marketCap: findMetric(html, "Market Cap"),
      currentPrice: findMetric(html, "Current Price"),
      stockPE: findMetric(html, "Stock P\/E"),
      tables: {
        profitLoss: parseTable(html, "profit-loss"),
        balanceSheet: parseTable(html, "balance-sheet"),
        cashFlow: parseTable(html, "cash-flow"),
      },
      source: "Screener.in",
      sourceUrl,
      fetchedAt: new Date().toISOString(),
    };
    cache.set(ticker, { payload, expiresAt: Date.now() + TTL_MS });
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(502).json({
      error: "Screener fundamentals unavailable",
      detail: error.message,
      ticker,
      sourceUrl,
    });
  }
}
