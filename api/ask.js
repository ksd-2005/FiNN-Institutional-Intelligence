export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only" });
  const { query, ticker = "", company = {}, context = [], network = [] } = req.body || {};
  if (!query) return res.status(400).json({ error: "query is required" });
  const prompt = `You are FINN, a financial investment intelligence agent. The selected company is ${company.name || ticker || "unspecified"} (${ticker || company.ticker || "ticker unavailable"}). Answer only from the supplied company and primary-source context. Use clean Markdown: a short heading, compact paragraphs, bullets, and a comparison table only when it improves clarity. Cite exact source names and links supplied in context. Clearly distinguish reported figures, inference, missing data, and sample/demo data. Do not substitute another company if evidence for the selected company is missing; say what is unavailable. Do not give a personal buy/sell recommendation without goals, horizon, valuation and risk context.\nSelected-company profile and live fundamentals: ${JSON.stringify(company)}\nTicker-matched research context: ${JSON.stringify(context)}\nNetwork context relevant to this company: ${JSON.stringify(network)}\nQuestion: ${query}`;
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
