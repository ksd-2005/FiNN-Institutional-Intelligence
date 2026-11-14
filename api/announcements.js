const NSE_RSS =
  "https://nsearchives.nseindia.com/content/RSS/Online_announcements.xml";
const BSE_RSS = "https://www.bseindia.com/data/xml/announcements.aspx";
const NSE_FILINGS_PAGE =
  "https://www.nseindia.com/companies-listing/corporate-filings-announcements";
const NSE_ANNOUNCEMENTS_API =
  "https://www.nseindia.com/api/corporate-announcements";
const BSE_ANNOUNCEMENTS_API =
  "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w";
const CACHE_MS = 60_000;
const cache = new Map();

const categories = [
  ["results", /financial results|quarterly results|audited results/i],
  ["M&A", /merger|acquisition|scheme of arrangement|amalgamation/i],
  [
    "fund_raise",
    /fund rais|preferential issue|qip|rights issue|qualified institutional/i,
  ],
  [
    "management_change",
    /change in management|appointment of (?:following persons as )?(?:an? )?(?:additional |managing |executive )?directors?|appointment of (?:a )?(?:chief executive|chief financial|managing director)|resignation of (?:a )?(?:director|chief|managing)|cessation of (?:a )?(?:director|chief|managing)|chief executive officer|chief financial officer|managing director/i,
  ],
  ["litigation", /litigation|court|tribunal|legal notice|regulatory order/i],
  [
    "insider_trading",
    /insider trading|trading window|promoter purchase|bulk deal/i,
  ],
  [
    "earnings_call",
    /earnings call|investor call|conference call|analyst call/i,
  ],
  ["investor_meetings", /investor meet|analyst meet|investor presentation/i],
  ["credit_rating", /credit rating|rating rationale|rating action/i],
  ["dividend", /dividend|record date/i],
  ["bonus_split", /bonus issue|stock split|sub-division/i],
  ["capex", /capital expenditure|capex|new plant|capacity expansion/i],
  ["press_release", /press release|media release/i],
  ["postal_ballot", /postal ballot/i],
  ["agm_egm", /annual general meeting|extraordinary general meeting|agm|egm/i],
  ["pledging", /pledge|invocation of pledge|release of pledge/i],
];

function classify(text = "") {
  return (
    categories.find(([, pattern]) => pattern.test(text))?.[0] || "unclassified"
  );
}

function normalizeCompany(name = "") {
  return name
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(
      /\b(?:limited|ltd\.?|incorporated|inc\.?|corporation|corp\.?)\b/gi,
      " ",
    )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseFeedDate(value = "") {
  if (value == null || value === "") return null;
  const dateText = String(value);
  const indiaDate = dateText.match(
    /^(\d{1,2})[-/ ]([A-Za-z]{3}|\d{1,2})[-/ ](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (indiaDate) {
    const month = /^[A-Za-z]/.test(indiaDate[2])
      ? new Date(`${indiaDate[2]} 1, 2000`).getMonth()
      : Number(indiaDate[2]) - 1;
    const utc = Date.UTC(
      Number(indiaDate[3]),
      month,
      Number(indiaDate[1]),
      Number(indiaDate[4] || 0),
      Number(indiaDate[5] || 0),
      Number(indiaDate[6] || 0),
    );
    return new Date(utc - 330 * 60_000);
  }
  const parsed = Date.parse(dateText);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code) =>
      String.fromCodePoint(
        code[0].toLowerCase() === "x"
          ? parseInt(code.slice(1), 16)
          : parseInt(code, 10),
      ),
    )
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/gi, (entity) => {
      const entities = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'",
        "&nbsp;": " ",
      };
      return entities[entity.toLowerCase()] || entity;
    })
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function xmlTag(xml, tag) {
  const safeTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(
    new RegExp(`<${safeTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${safeTag}\\s*>`, "i"),
  );
  return match ? decodeXml(match[1]) : "";
}

function parseNseRss(xml) {
  const entries = [
    ...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi),
  ];
  return entries
    .map(([, , entry]) => {
      const title = xmlTag(entry, "title");
      const description =
        xmlTag(entry, "description") ||
        xmlTag(entry, "summary") ||
        xmlTag(entry, "content:encoded");
      const linkAttributes = entry.match(/<link\b([^>]*?)\/?\s*>/i)?.[1] || "";
      const linkAttribute = linkAttributes.match(
        /\bhref=["']([^"']+)["']/i,
      )?.[1];
      const linkBody = entry.match(/<link\b[^>]*>([\s\S]*?)<\/link\s*>/i)?.[1];
      const link = decodeXml(
        linkAttribute || linkBody || xmlTag(entry, "guid"),
      );
      const filedAt =
        xmlTag(entry, "pubDate") ||
        xmlTag(entry, "dc:date") ||
        xmlTag(entry, "published") ||
        xmlTag(entry, "updated");
      const headline = description || title;
      if (!title || !headline) return null;
      const companyKey = normalizeCompany(title);
      const tickerMatch = headline.match(/^([A-Z][A-Z0-9&.-]{1,19}):/);
      return {
        id: `NSE-${companyKey}-${link || `${headline}-${filedAt}`}`,
        company: title,
        companyKey,
        ticker: tickerMatch?.[1] || "",
        headline,
        category: classify(`${title} ${headline}`),
        filedAt: filedAt || null,
        sourceUrl: /^https?:\/\//i.test(link) ? link : null,
        source: "NSE RSS",
      };
    })
    .filter(Boolean);
}

function parseBseRss(xml) {
  return [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)]
    .map(([, , entry]) => {
      const title = xmlTag(entry, "title");
      const description = xmlTag(entry, "description");
      const companyMatch = title.match(/^(.*?)(?:\s*\((\d+)\))?$/);
      const company = companyMatch?.[1]?.trim() || title;
      const scripCode = xmlTag(entry, "scripcode") || companyMatch?.[2] || "";
      const sourceUrl = xmlTag(entry, "link");
      const filedAt = xmlTag(entry, "pubDate");
      if (!company || !description) return null;
      const companyKey = normalizeCompany(company);
      return {
        id: `BSE-${companyKey}-${sourceUrl || `${description}-${filedAt}`}`,
        company,
        companyKey,
        ticker: scripCode,
        headline: description,
        category: classify(`${company} ${description}`),
        filedAt: filedAt || null,
        sourceUrl: /^https?:\/\//i.test(sourceUrl) ? sourceUrl : null,
        source: "BSE RSS",
      };
    })
    .filter(Boolean);
}

function asIstTimestamp(value) {
  if (!value) return null;
  const text = String(value).trim();
  // Exchange JSON timestamps are often local IST without an explicit offset.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(text))
    return `${text}+05:30`;
  return text;
}

function asAnnouncement(row, exchange) {
  if (exchange === "BSE") {
    const title = row.NEWSSUB || row.HEADLINE || "";
    const company = String(row.SLONGNAME || title.split(" - ")[0] || "").trim();
    const headline = String(row.HEADLINE || title).trim();
    const attachment = row.ATTACHMENTNAME
      ? `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${encodeURIComponent(row.ATTACHMENTNAME)}`
      : "";
    const companyKey = normalizeCompany(company);
    const filedAt = asIstTimestamp(
      row.NEWS_DT || row.DT_TM || row.News_submission_dt,
    );
    if (!company || !headline) return null;
    return {
      id: `BSE-${row.NEWSID || `${companyKey}-${filedAt}-${headline}`}`,
      company,
      companyKey,
      ticker: String(row.SCRIP_CD || ""),
      headline,
      category: classify(`${row.SUBCATNAME || ""} ${title} ${headline}`),
      filedAt,
      sourceUrl: attachment || row.NSURL || null,
      source: "BSE",
    };
  }

  const company = String(
    row.sm_name || row.companyName || row.company || row.symbol || "",
  ).trim();
  const ticker = String(row.symbol || "").trim();
  const subject = String(row.subject || row.desc || row.headline || "").trim();
  const details = String(
    row.attchmntText || row.description || row.summary || "",
  ).trim();
  const headline = [subject, details]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(" · ");
  const attachment = String(
    row.attchmntFile || row.attachment || row.url || "",
  ).trim();
  const sourceUrl = /^https?:\/\//i.test(attachment)
    ? attachment
    : attachment
      ? `https://www.nseindia.com${attachment.startsWith("/") ? "" : "/"}${attachment}`
      : "";
  const filedAt = asIstTimestamp(
    row.an_dt ||
      row.sort_date ||
      row.exchdisstime ||
      row.broadcastDateTime ||
      row.date ||
      row.timestamp ||
      row.broadcastDate ||
      row.exchangeDate,
  );
  if (!company || !headline) return null;
  const companyKey = normalizeCompany(company);
  return {
    id: `NSE-${row.seq_id || row.announcementId || `${ticker}-${companyKey}-${filedAt}-${headline}`}`,
    company,
    companyKey,
    ticker,
    headline,
    category: classify(`${row.sub_type || row.category || ""} ${headline}`),
    filedAt,
    sourceUrl: sourceUrl || null,
    source: "NSE",
  };
}

function dateParts(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
  if (
    date.getUTCFullYear() !== +match[1] ||
    date.getUTCMonth() !== +match[2] - 1 ||
    date.getUTCDate() !== +match[3]
  )
    return null;
  return { year: +match[1], month: +match[2], day: +match[3] };
}

function formatDate(parts, separator = "") {
  return `${String(parts.day).padStart(2, "0")}${separator}${String(parts.month).padStart(2, "0")}${separator}${parts.year}`;
}

function extractArray(payload) {
  if (Array.isArray(payload)) return payload;
  for (const value of Object.values(payload || {})) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

const requestHeaders = {
  accept: "application/json, text/plain, */*",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

async function fetchNseDated(from, to) {
  const landing = await fetch(NSE_FILINGS_PAGE, {
    headers: {
      ...requestHeaders,
      accept: "text/html,application/xhtml+xml",
      referer: "https://www.nseindia.com/",
    },
    signal: AbortSignal.timeout(10_000),
  });
  const cookies =
    landing.headers.getSetCookie?.() ||
    (landing.headers.get("set-cookie") || "").split(/,\s*(?=[^;,]+=)/);
  const cookie = cookies
    .map((item) => item.split(";")[0])
    .filter(Boolean)
    .join("; ");
  const url = new URL(
    process.env.NSE_ANNOUNCEMENTS_API_URL || NSE_ANNOUNCEMENTS_API,
  );
  url.searchParams.set("index", "equities");
  url.searchParams.set("from_date", formatDate(from, "-"));
  url.searchParams.set("to_date", formatDate(to, "-"));
  const response = await fetch(url, {
    headers: {
      ...requestHeaders,
      referer: NSE_FILINGS_PAGE,
      ...(cookie ? { cookie } : {}),
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok)
    throw new Error(`NSE dated feed returned HTTP ${response.status}`);
  const body = await response.text();
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(
      "NSE dated feed returned a non-JSON response (session or access denied)",
    );
  }
  const rows = extractArray(payload)
    .map((row) => asAnnouncement(row, "NSE"))
    .filter(Boolean);
  if (!rows.length)
    throw new Error("NSE dated feed returned no readable announcements");
  return rows;
}

async function fetchBseDated(from, to) {
  const url = new URL(
    process.env.BSE_ANNOUNCEMENTS_API_URL || BSE_ANNOUNCEMENTS_API,
  );
  const pageLimit = Math.min(
    20,
    Math.max(1, Number(process.env.BSE_ANNOUNCEMENTS_MAX_PAGES) || 8),
  );
  const query = {
    strCat: "-1",
    subcategory: "-1",
    strPrevDate: `${from.year}${String(from.month).padStart(2, "0")}${String(from.day).padStart(2, "0")}`,
    strToDate: `${to.year}${String(to.month).padStart(2, "0")}${String(to.day).padStart(2, "0")}`,
    strSearch: "P",
    strScrip: "",
    strType: "C",
  };
  const fetchPage = async (page) => {
    const pageUrl = new URL(url);
    for (const [key, value] of Object.entries({ ...query, pageno: page }))
      pageUrl.searchParams.set(key, String(value));
    const response = await fetch(pageUrl, {
      headers: {
        ...requestHeaders,
        referer: "https://www.bseindia.com/corporates/ann.html",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok)
      throw new Error(`BSE dated feed returned HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.Table))
      throw new Error("BSE dated feed returned an unexpected response");
    return payload;
  };

  const first = await fetchPage(1);
  const total = Number(first.Table1?.[0]?.ROWCNT || 0);
  const totalPages = Math.ceil(total / Math.max(first.Table.length, 1));
  const pageCount = Math.min(totalPages, pageLimit);
  const remaining = await Promise.allSettled(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
      fetchPage(index + 2),
    ),
  );
  const pageErrors = remaining
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason?.message || "BSE page request failed");
  const pages = [
    first,
    ...remaining
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value),
  ];
  const rows = pages
    .flatMap((page) => page.Table)
    .map((row) => asAnnouncement(row, "BSE"))
    .filter(Boolean);
  if (!rows.length)
    throw new Error("BSE dated feed returned no readable announcements");
  return {
    rows,
    total,
    fetched: rows.length,
    partial: total > rows.length || pageErrors.length > 0,
    pageErrors,
  };
}

async function fetchNse() {
  const response = await fetch(
    process.env.NSE_ANNOUNCEMENTS_RSS_URL || NSE_RSS,
    {
      headers: {
        accept:
          "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        referer: "https://www.nseindia.com/static/rss-feed",
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new Error(`NSE returned HTTP ${response.status}`);
  const xml = await response.text();
  const rows = parseNseRss(xml);
  if (!rows.length)
    throw new Error("NSE RSS returned no readable announcement items");
  return rows;
}

async function fetchBse() {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      let cookie = "";
      try {
        const landing = await fetch("https://www.bseindia.com/", {
          headers: {
            ...requestHeaders,
            accept: "text/html,application/xhtml+xml",
            referer: "https://www.bseindia.com/rss-feed",
          },
          signal: AbortSignal.timeout(8_000),
        });
        const landingCookies =
          landing.headers.getSetCookie?.() ||
          (landing.headers.get("set-cookie") || "").split(
            /,\s*(?=[^;,]+=)/,
          );
        cookie = landingCookies
          .map((item) => item.split(";")[0])
          .filter(Boolean)
          .join("; ");
      } catch {
        // Still attempt the public RSS URL if BSE's landing page is unavailable.
      }
      const response = await fetch(
        process.env.BSE_ANNOUNCEMENTS_RSS_URL || BSE_RSS,
        {
          headers: {
            accept:
              "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            referer: "https://www.bseindia.com/rss-feed",
            ...(cookie ? { cookie } : {}),
          },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) throw new Error(`BSE returned HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") || "unknown";
      const xml = await response.text();
      const rows = parseBseRss(xml);
      if (!rows.length) {
        const looksLikeHtml = /<\s*!doctype\s+html|<\s*html\b/i.test(xml);
        throw new Error(
          looksLikeHtml
            ? "BSE returned an HTML block page instead of RSS"
            : `BSE RSS contained no parseable items (content-type: ${contentType})`,
        );
      }
      return rows;
    } catch (error) {
      lastError = error;
      if (attempt === 0)
        await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  throw lastError;
}

async function loadAnnouncements(from, to) {
  const settled = await Promise.allSettled([
    fetchNseDated(from, to),
    fetchBseDated(from, to),
  ]);
  const providers = {};
  const data = [];
  const errors = [];
  for (const [index, name] of ["NSE", "BSE"].entries()) {
    const result = settled[index];
    if (result.status === "fulfilled") {
      const value = result.value;
      providers[name] =
        index === 1
          ? {
              available: true,
              count: value.rows.length,
              total: value.total,
              partial: value.partial,
              pageErrors: value.pageErrors,
            }
          : { available: true, count: value.length };
      data.push(...(index === 1 ? value.rows : value));
    } else {
      const message = result.reason?.message || "Provider unavailable";
      providers[name] = { available: false, error: message };
      errors.push(`${name}: ${message}`);
    }
  }
  // RSS remains a useful fallback, but is explicitly identified as a latest-items snapshot.
  if (!providers.NSE.available) {
    try {
      const rows = await fetchNse();
      data.push(...rows);
      providers["NSE RSS fallback"] = {
        available: true,
        count: rows.length,
        latestOnly: true,
      };
    } catch (error) {
      providers["NSE RSS fallback"] = {
        available: false,
        error: error.message,
      };
    }
  }
  if (!providers.BSE.available) {
    try {
      const rows = await fetchBse();
      data.push(...rows);
      providers["BSE RSS fallback"] = {
        available: true,
        count: rows.length,
        latestOnly: true,
      };
    } catch (error) {
      providers["BSE RSS fallback"] = {
        available: false,
        error: error.message,
      };
    }
  }
  if (!data.length)
    throw new Error(errors.join("; ") || "No providers returned announcements");
  const unique = new Map();
  for (const item of data) unique.set(item.id, item);
  return {
    data: [...unique.values()].sort((a, b) => {
      const timeA = parseFeedDate(a.filedAt)?.getTime() || 0;
      const timeB = parseFeedDate(b.filedAt)?.getTime() || 0;
      return timeB - timeA;
    }),
    providers,
    providerWarnings: errors,
    range: {
      from: `${from.year}-${String(from.month).padStart(2, "0")}-${String(from.day).padStart(2, "0")}`,
      to: `${to.year}-${String(to.month).padStart(2, "0")}-${String(to.day).padStart(2, "0")}`,
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const includeUnclassified = req.query?.includeUnclassified === "true";
  try {
    const today = new Date(Date.now() + 330 * 60_000);
    const todayIso = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
    const from = dateParts(req.query?.from) || dateParts(todayIso);
    const to = dateParts(req.query?.to) || dateParts(todayIso);
    if (!from || !to)
      return res.status(400).json({ error: "Dates must use YYYY-MM-DD" });
    const fromTime = Date.UTC(from.year, from.month - 1, from.day);
    const toTime = Date.UTC(to.year, to.month - 1, to.day);
    if (fromTime > toTime)
      return res
        .status(400)
        .json({ error: "Start date must be on or before end date" });
    if (toTime - fromTime > 31 * 24 * 60 * 60_000)
      return res
        .status(400)
        .json({ error: "Choose a date range of 31 days or less" });
    const key = `${formatDate(from)}-${formatDate(to)}`;
    let entry = cache.get(key);
    if (req.query?.refresh === "true") cache.delete(key);
    entry = cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      entry = {
        result: await loadAnnouncements(from, to),
        expiresAt: Date.now() + CACHE_MS,
      };
      cache.set(key, entry);
    }
    const rows = includeUnclassified
      ? entry.result.data
      : entry.result.data.filter((row) => row.category !== "unclassified");
    return res.status(200).json({
      source: Object.entries(entry.result.providers)
        .filter(([, status]) => status.available)
        .map(([name]) => name),
      providers: entry.result.providers,
      providerWarnings: entry.result.providerWarnings,
      range: entry.result.range,
      fetchedAt: new Date().toISOString(),
      cacheSeconds: 60,
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    return res.status(502).json({
      error: "Exchange announcements unavailable",
      detail: error.message,
      data: [],
    });
  }
}
