export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only" });
  const { query, ticker = "", company = {}, context = [], network = [] } = req.body || {};
  if (!query) return res.status(400).json({ error: "query is required" });
  const prompt = `You are FINN, a financial research assistant. The selected company is ${company.name || ticker || "unspecified"} (${ticker || company.ticker || "ticker unavailable"}). Never substitute another company or use outside knowledge. Use only supplied company data and primary documents (exchange filings, annual reports, and earnings-call transcripts). Screener-normalized tables are useful data but are not themselves primary documents; identify them as aggregated data and do not claim that a filing or transcript was reviewed unless its content/link is actually supplied. Clearly mark unavailable fields and inference; never invent financial values, guidance, biographies, source links, or citations. Keep the answer readable Markdown, with short labeled sections, compact tables, and source links only when supplied.

When the question is company research, explicitly cover: (1) business and segment/revenue mix; (2) latest financial snapshot; (3) trajectory across available years/quarters; (4) balance sheet, debt/leverage, and working-capital cycle; (5) cash flow, free cash flow and cash conversion; (6) management narrative versus reported results; (7) only explicitly stated management guidance; (8) a concise bull case and bear case. For the latest quarter, report Revenue, EBITDA, PBT and PAT with current quarter, prior quarter QoQ comparison, and same quarter prior-year YoY comparison, if the supplied data supports all periods. Do not annualize or infer missing periods. If the supplied quarterly table has fewer than five periods, state that YoY is unavailable; if it has fewer than two, state that QoQ is unavailable. Explain financial terms briefly for non-specialist readers. Do not provide a personal buy/sell recommendation.

Selected-company identity: ${JSON.stringify({ name: company.name, sector: company.sector, ticker })}
Retrieved fundamentals (may contain normalized tables, not primary documents): ${JSON.stringify(company.liveFundamentals)}
Ticker-matched primary-source context: ${JSON.stringify(context)}
Network context (use only for relationship questions, not to substantiate financial claims): ${JSON.stringify(network)}
Question: ${query}`;
  try {
    if (process.env.HYDE_API_KEY) {
      const r = await fetch("https://inference.hyde.tech/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.HYDE_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.HYDE_MODEL || "hyde/glm-5.3-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
      });
      if (r.ok) {
        const payload = await r.json();
        return res.status(200).json({
          provider: "hyde",
          answer:
            payload.choices?.[0]?.message?.content || payload.output_text || "",
          sources: context.map((item) => item.primarySources || []).flat(),
          raw: payload,
        });
      }
    }
    if (process.env.GEMINI_API_KEY) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        },
      );
      if (r.ok) {
        const payload = await r.json();
        return res.status(200).json({
          provider: "gemini",
          answer:
            payload.candidates?.[0]?.content?.parts
              ?.map((part) => part.text)
              .join("\n") || "",
          sources: context.map((item) => item.primarySources || []).flat(),
          raw: payload,
        });
      }
    }
    return res.status(200).json({
      provider: "demo",
      answer:
        "Demo mode: connect HYDE_API_KEY or GEMINI_API_KEY in Vercel to enable grounded answers.",
    });
  } catch (error) {
    return res
      .status(502)
      .json({ error: "AI provider unavailable", detail: error.message });
  }
}
