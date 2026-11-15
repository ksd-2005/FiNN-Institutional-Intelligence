function compactFundamentals(data) {
  if (!data) return null;
  const compactRows = (rows = [], maxRows = 20, maxPeriods = 6) => rows
    .slice(0, maxRows)
    .map(({ label, values = [] }) => ({ label, values: values.slice(-maxPeriods) }));
  const tables = data.tables || {};
  return {
    ticker: data.ticker,
    name: data.name,
    source: data.source,
    sourceUrl: data.sourceUrl,
    fetchedAt: data.fetchedAt,
    currentPrice: data.currentPrice,
    marketCap: data.marketCap,
    stockPE: data.stockPE,
    keyMetrics: data.keyMetrics,
    quarterlyHeadline: data.quarterlyHeadline,
    tables: {
      quarterlyPeriods: (tables.quarterlyPeriods || []).slice(-6),
      quarterlyResults: compactRows(tables.quarterlyResults),
      profitLoss: compactRows(tables.profitLoss),
      balanceSheet: compactRows(tables.balanceSheet),
      cashFlow: compactRows(tables.cashFlow),
      ratios: compactRows(tables.ratios),
    },
  };
}

function compactContext(context) {
  if (!Array.isArray(context)) return [];
  return context.slice(0, 12).map((item) => {
    if (typeof item === "string") return item.slice(0, 1200);
    if (!item || typeof item !== "object") return item;
    return {
      title: item.title || item.headline || item.name,
      type: item.type || item.category || item.kind,
      date: item.date || item.filedAt || item.period,
      summary: String(item.summary || item.text || item.content || "").slice(0, 1200),
      source: item.source,
      url: item.url || item.sourceUrl,
    };
  });
}

function errorMessage(error) {
  return error?.name === "TimeoutError" || error?.name === "AbortError"
    ? "provider timed out"
    : error?.message || "provider request failed";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { query, ticker = "", company = {}, context = [], network = [] } = req.body || {};
  if (!query) return res.status(400).json({ error: "query is required" });
  const fundamentals = compactFundamentals(company.liveFundamentals);
  const networkContext = Array.isArray(network) ? network.slice(0, 12).map((person) => ({
    name: person.name,
    role: person.role,
    company: person.company,
    sector: person.sector,
    expertise: person.expertise || person.detail,
    relationship: person.relationship,
    email: person.synthetic ? undefined : person.email,
    synthetic: Boolean(person.synthetic),
  })) : [];
  const compactedContext = compactContext(context);
  const prompt = `You are FINN, a financial research assistant. The selected company is ${company.name || ticker || "unspecified"} (${ticker || company.ticker || "ticker unavailable"}). Never substitute another company or use outside knowledge. Use only supplied company data and primary documents (exchange filings, annual reports, and earnings-call transcripts). Screener-normalized tables are aggregated data, not primary documents; identify them as such. Clearly mark missing evidence and inference. Never invent financial values, guidance, biographies, source links, or citations. Write concise, readable Markdown with short headings and compact tables.

For company research cover: business and segment/revenue mix; latest financial snapshot; multi-year trajectory; balance sheet, debt/leverage and working-capital cycle; cash flow, free cash flow and cash conversion; management narrative versus reported numbers; explicitly stated guidance; and concise bull and bear cases. For the latest quarter compare Revenue, EBITDA, PBT and PAT against the prior quarter (QoQ) and same quarter last year (YoY) only where the supplied periods support it. Do not annualize missing periods. Explain financial terms briefly. Do not give a personal buy/sell recommendation.

Selected company: ${JSON.stringify({ name: company.name, sector: company.sector, ticker })}
Retrieved fundamentals: ${JSON.stringify(fundamentals)}
Ticker-matched primary-source context: ${JSON.stringify(compactedContext)}
Network context (relationship questions only; synthetic profiles are not verified): ${JSON.stringify(networkContext)}
Question: ${String(query).slice(0, 5000)}`;

  const failures = [];
  if (process.env.HYDE_API_KEY) {
    try {
      const response = await fetch("https://inference.hyde.tech/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.HYDE_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.HYDE_MODEL || "hyde/glm-5.3-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 1100,
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (response.ok) {
        const payload = await response.json();
        const answer = payload.choices?.[0]?.message?.content || payload.output_text || "";
        if (answer) return res.status(200).json({ provider: "hyde", answer, sources: [] });
      }
      failures.push(`Hyde returned HTTP ${response.status}`);
    } catch (error) {
      failures.push(`Hyde ${errorMessage(error)}`);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1100, temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (response.ok) {
        const payload = await response.json();
        const answer = payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") || "";
        if (answer) return res.status(200).json({ provider: "gemini", answer, sources: [] });
      }
      failures.push(`Gemini returned HTTP ${response.status}`);
    } catch (error) {
      failures.push(`Gemini ${errorMessage(error)}`);
    }
  }

  if (!process.env.HYDE_API_KEY && !process.env.GEMINI_API_KEY)
    return res.status(200).json({ provider: "demo", answer: "AI is not configured yet. Add a Hyde or Gemini key in the server environment." });
  return res.status(502).json({ error: "AI providers are temporarily unavailable. Try again shortly.", detail: failures.join("; ") });
}
