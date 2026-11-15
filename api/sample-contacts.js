import { sampleNetworkContacts } from "../src/sample-contacts.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (baseUrl && secret) {
    try {
      const response = await fetch(
        `${baseUrl}/rest/v1/sample_network_contacts?select=id,name,role,company,sector,expertise,relationship,last_spoke,bio,email,synthetic&order=name.asc`,
        {
          headers: {
            apikey: secret,
            authorization: `Bearer ${secret}`,
          },
          signal: AbortSignal.timeout(4000),
        },
      );
      if (response.ok) {
        const data = await response.json();
        if (data.length) return res.status(200).json({ data, source: "database" });
      }
    } catch {
      // Keep the demo usable when the optional database is not configured yet.
    }
  }
  return res.status(200).json({ data: sampleNetworkContacts, source: "demo" });
}
