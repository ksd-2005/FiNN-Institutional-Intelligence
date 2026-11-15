const STORAGE_KEY = "finn-account-session";
const CONTACTS_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const PUBLIC_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const accountAuthConfigured = Boolean(CONTACTS_URL && PUBLIC_KEY);

export function readAccountSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveAccountSession(session) {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY);
}

async function authRequest(path, body) {
  if (!accountAuthConfigured) throw new Error("Add the Supabase Auth settings to enable accounts.");
  const response = await fetch(`${CONTACTS_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: PUBLIC_KEY, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg || payload.message || payload.error_description || payload.error || "Account request failed.");
  return payload;
}

export async function signInWithEmail(email, password) {
  const data = await authRequest("token?grant_type=password", { email, password });
  return { ...data, expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600) };
}

export async function signUpWithEmail(email, password) {
  return authRequest("signup", { email, password });
}

export async function refreshAccountSession(session) {
  if (!session?.refresh_token) return null;
  if (Number(session.expires_at || 0) > Math.floor(Date.now() / 1000) + 60) return session;
  const data = await authRequest("token?grant_type=refresh_token", { refresh_token: session.refresh_token });
  return { ...data, expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600) };
}

export async function signOutAccount(session) {
  if (session?.access_token && accountAuthConfigured) {
    await fetch(`${CONTACTS_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: PUBLIC_KEY, authorization: `Bearer ${session.access_token}` },
    });
  }
  saveAccountSession(null);
}

async function contactRequest(path, session, init = {}) {
  if (!accountAuthConfigured) throw new Error("Supabase Auth is not configured.");
  const response = await fetch(`${CONTACTS_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: PUBLIC_KEY,
      authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error("Could not sync contacts to your account.");
  return response.status === 204 ? [] : response.json();
}

export async function loadAccountContacts(session) {
  if (!session?.access_token) return [];
  return contactRequest("user_contacts?select=id,name,email,tel&order=created_at.asc", session);
}

export async function syncAccountContacts(session, contacts) {
  if (!session?.access_token || !contacts.length) return;
  const rows = contacts.map(({ name, email, tel }) => ({
    name: String(name || "").slice(0, 160),
    email: String(email || "").slice(0, 254),
    tel: String(tel || "").slice(0, 48),
  }));
  await contactRequest("user_contacts?on_conflict=user_id,name,email,tel", session, {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
}
