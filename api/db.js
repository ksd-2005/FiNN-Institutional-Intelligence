const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export function databaseReady() {
  return Boolean(baseUrl && serviceKey);
}

function headers(extra = {}) {
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
    ...extra,
  };
}

export async function searchTickerRecords(query = "", limit = 12) {
  if (!databaseReady()) return null;
  const safeQuery = String(query).trim().replace(/[^\p{L}\p{N} .&'-]/gu, "").slice(0, 48);
  const params = new URLSearchParams({
    select: "ticker,name,sector",
    order: "name.asc",
    limit: String(Math.min(Math.max(Number(limit) || 12, 1), 30)),
  });
  if (safeQuery)
    params.set("or", `(ticker.ilike.*${safeQuery}*,name.ilike.*${safeQuery}*)`);
  const response = await fetch(`${baseUrl}/rest/v1/companies?${params}`, {
    headers: headers(),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Ticker database returned HTTP ${response.status}`);
  return response.json();
}

export async function cacheAnnouncements(rows = []) {
  if (!databaseReady() || !rows.length) return false;
  const datedRows = rows.filter((row) => row.id && row.filedAt).map((row) => ({
    id: String(row.id),
    filed_at: new Date(row.filedAt).toISOString(),
    company_key: row.companyKey || "",
    payload: row,
    updated_at: new Date().toISOString(),
  }));
  const batches = [];
  for (let index = 0; index < datedRows.length; index += 250) {
    batches.push(datedRows.slice(index, index + 250));
  }
  await Promise.all(batches.map(async (batch) => {
    const response = await fetch(`${baseUrl}/rest/v1/exchange_announcements`, {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) throw new Error(`Filing cache returned HTTP ${response.status}`);
  }));
  return true;
}

export async function readCachedAnnouncements(from, to) {
  if (!databaseReady()) return { data: [], updatedAt: 0 };
  const end = new Date(`${to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const params = new URLSearchParams({
    select: "payload,updated_at",
    filed_at: `gte.${from}T00:00:00Z`,
    order: "filed_at.desc",
    limit: "5000",
  });
  params.set("filed_at", `gte.${from}T00:00:00Z`);
  params.set("and", `(filed_at.lt.${end.toISOString()})`);
  const response = await fetch(`${baseUrl}/rest/v1/exchange_announcements?${params}`, {
    headers: headers(),
    signal: AbortSignal.timeout(1500),
  });
  if (!response.ok) throw new Error(`Filing cache returned HTTP ${response.status}`);
  const rows = await response.json();
  return {
    data: rows.map((row) => row.payload),
    updatedAt: rows.reduce((latest, row) => {
      const time = Date.parse(row.updated_at);
      return Number.isFinite(time) ? Math.max(latest, time) : latest;
    }, 0),
  };
}
