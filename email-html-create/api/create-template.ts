// Vercel serverless function — SEAM #1 backend (Part 2: Template_ID Create).
// POST { name, subject, html, segment?, domain?, sendDate? }
//   1. Creates a SendGrid Dynamic Template (POST /v3/templates + first version).
//   2. Appends a row to the team tracking sheet ("templates" tab) via the
//      Google Sheets API (offline OAuth refresh token) — header-mapped, so
//      column order/renames never corrupt rows. Sheet failure never fails the
//      request; the response carries sheetLogged: false instead.
//
// Env (server-only, set in Vercel): SENDGRID_API_KEY, GOOGLE_OAUTH_CLIENT_ID,
// GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN, SHEET_ID, SHEET_TAB.
// CORS is open so the GitHub Pages build can call this cross-origin.

type Req = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (code: number) => { json: (body: unknown) => void; end: () => void };
};

const SG = "https://api.sendgrid.com/v3";

async function sgFetch(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${SG}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const errs = json.errors as { message?: string }[] | undefined;
    throw new Error(`SendGrid ${res.status}: ${errs?.[0]?.message || "request failed"}`);
  }
  return json;
}

async function googleAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(8000),
  });
  const body = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !body.access_token) throw new Error(`google token refresh failed: ${body.error || res.status}`);
  return body.access_token;
}

async function appendSheetRow(values: Record<string, string>): Promise<void> {
  const sheetId = process.env.SHEET_ID;
  if (!sheetId || !process.env.GOOGLE_OAUTH_REFRESH_TOKEN) throw new Error("sheet env not configured");
  const tab = process.env.SHEET_TAB || "templates";
  const token = await googleAccessToken();
  const auth = { Authorization: `Bearer ${token}` };
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values`;

  const headerRes = await fetch(`${base}/${encodeURIComponent(`${tab}!1:1`)}`, { headers: auth, signal: AbortSignal.timeout(8000) });
  const headerBody = (await headerRes.json()) as { values?: string[][]; error?: { message?: string } };
  if (!headerRes.ok) throw new Error(`sheet header read failed: ${headerBody.error?.message || headerRes.status}`);
  const headers = (headerBody.values?.[0] || []).map((h) => String(h).trim().toLowerCase());
  if (!headers.length) throw new Error(`sheet tab "${tab}" has no header row`);

  const row = headers.map((h) => values[h] ?? "");
  const appendRes = await fetch(
    `${base}/${encodeURIComponent(`${tab}!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ values: [row] }), signal: AbortSignal.timeout(8000) },
  );
  if (!appendRes.ok) {
    const err = (await appendRes.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(`sheet append failed: ${err?.error?.message || appendRes.status}`);
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.SENDGRID_API_KEY) return res.status(500).json({ error: "SENDGRID_API_KEY not configured" });

  const { name, subject, html, segment, domain, sendDate } = (req.body || {}) as {
    name?: string; subject?: string; html?: string; segment?: string; domain?: string; sendDate?: string;
  };
  if (!name || !html) return res.status(400).json({ error: "name and html are required" });

  let templateId = "";
  let versionId = "";
  try {
    const tpl = await sgFetch("/templates", { name, generation: "dynamic" });
    templateId = String(tpl.id || "");
    const ver = await sgFetch(`/templates/${templateId}/versions`, {
      name: `${name} v1`,
      subject: subject || name,
      html_content: html,
      generate_plain_content: true,
      active: 1,
    });
    versionId = String(ver.id || "");
  } catch (err) {
    return res.status(502).json({ error: err instanceof Error ? err.message : "SendGrid create failed" });
  }

  let sheetLogged = false;
  try {
    const date = sendDate || new Date().toISOString().slice(0, 10);
    await appendSheetRow({
      id: templateId,
      code: name,
      provider: "sendgrid",
      created: date,
      description: ["template", domain, segment, subject].filter(Boolean).join(" · "),
    });
    sheetLogged = true;
  } catch {
    // fire-safe: template already exists in SendGrid — report, don't fail
  }

  return res.status(200).json({
    templateId,
    versionId,
    editorUrl: `https://mc.sendgrid.com/dynamic-templates/${templateId}`,
    sheetLogged,
  });
}
