const MAX_PDF_BYTES = 12 * 1024 * 1024;
const MAX_TEXT_CHARS = 42_000;
const briefCache = new Map();
// NSE serves some official archive attachments from nsearchives.nseindia.in
// as well as nseindia.com. Keep the fetch scoped to exchange-owned domains.
const ALLOWED_HOSTS = ["nseindia.com", "nseindia.in", "bseindia.com"];

function allowedUrl(value) {
  let url;
  try { url = new URL(String(value).trim()); }
  catch { throw new Error("The filing link is not a valid URL."); }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const officialHost = ALLOWED_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  if (!officialHost) throw new Error(`The filing host “${host || "unknown"}” is not an official NSE or BSE host.`);
  if (url.username || url.password || !["https:", "http:"].includes(url.protocol))
    throw new Error("The filing link must use HTTP or HTTPS without embedded credentials.");
  if (url.protocol === "http:") url.protocol = "https:";
  if (url.port && url.port !== "443") throw new Error("Non-standard filing-link ports are not accepted.");
  return url;
}

async function readBounded(response) {
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_PDF_BYTES) throw new Error("Filing exceeds the 12 MB processing limit.");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_PDF_BYTES) {
      await reader.cancel();
      throw new Error("Filing exceeds the 12 MB processing limit.");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, size);
}

async function extractFilingText(url) {
  const cached = briefCache.get(url);
  if (cached && cached.until > Date.now()) return cached.text;
  let current = allowedUrl(url);
  let response;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    response = await fetch(current, {
      redirect: "manual",
      headers: { accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.5", "user-agent": "FINN filing research demo/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    if (!location) throw new Error("Filing redirect did not include a destination.");
    current = allowedUrl(new URL(location, current).href);
  }
  if (!response?.ok) throw new Error(`Exchange filing request failed (HTTP ${response?.status || "unknown"}).`);
  const bytes = await readBounded(response);
  if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("The exchange link did not return a PDF document.");
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: bytes });
  try {
    const parsed = await parser.getText({});
    const text = String(parsed.text || "").replace(/\0/g, " ").replace(/[ \t]+/g, " ").slice(0, MAX_TEXT_CHARS);
    if (text.trim().length < 100) throw new Error("No readable text was found in this PDF.");
    briefCache.set(url, { text, until: Date.now() + 15 * 60_000 });
    return text;
  } finally {
    await parser.destroy();
  }
}

export default async function handler(req, res) {
  try {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { url, title = "Exchange filing", company = "", ticker = "" } = req.body || {};
  if (!url) return res.status(400).json({ error: "Filing URL is required." });
  let documentText;
  try {
    allowedUrl(url);
    documentText = await extractFilingText(url);
  } catch (error) {
    return res.status(422).json({ error: error.message || "Could not read the exchange filing." });
  }
  if (!process.env.HYDE_API_KEY && !process.env.GEMINI_API_KEY)
    return res.status(503).json({ error: "Configure a Hyde or Gemini API key to create filing briefs." });
  const prompt = `Create a concise, evidence-grounded filing brief. Use only the extracted document text below. Do not use outside knowledge or invent values. Identify Revenue, EBITDA, PBT, and PAT, and QoQ/YoY only when the filing explicitly supports those comparisons. Include material guidance and a short interpretation. If a metric is absent, say so. Cite the official source link in the answer.\nCompany: ${company} (${ticker})\nFiling: ${title}\nSource URL: ${url}\n\nExtracted PDF text:\n${documentText}`;
  const failures = [];
  if (process.env.HYDE_API_KEY) {
    try {
      const response = await fetch("https://inference.hyde.tech/v1/chat/completions", {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.HYDE_API_KEY}` },
        body: JSON.stringify({ model: process.env.HYDE_MODEL || "hyde/glm-5.3-flash", messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 1400 }),
        signal: AbortSignal.timeout(14_000),
      });
      if (response.ok) {
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content || data.output_text;
        if (answer) return res.status(200).json({ answer, provider: "hyde", source: url, cached: briefCache.has(url) });
      }
      failures.push(`Hyde HTTP ${response.status}`);
    } catch (error) { failures.push(`Hyde ${error.message}`); }
  }
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1400, temperature: 0.1 } }),
        signal: AbortSignal.timeout(14_000),
      });
      if (response.ok) {
        const data = await response.json();
        const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n");
        if (answer) return res.status(200).json({ answer, provider: "gemini", source: url });
      }
      failures.push(`Gemini HTTP ${response.status}`);
    } catch (error) { failures.push(`Gemini ${error.message}`); }
  }
  return res.status(502).json({ error: "AI providers are temporarily unavailable.", detail: failures.join("; ") });
  } catch (error) {
    console.error("filing-brief invocation failed", error);
    return res.status(500).json({ error: "Filing brief failed inside the server function.", detail: error?.message || "Unknown server error." });
  }
}
