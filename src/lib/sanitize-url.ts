const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

const SHORTENER_HOSTS = new Set([
  "bit.ly",
  "bitly.com",
  "t.co",
  "tinyurl.com",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "shorturl.at",
  "rb.gy",
  "tiny.cc",
  "adf.ly",
]);

const BLOCKED_HOST_PATTERNS = [
  /(^|\.)whatsapp\.com$/i,
  /^wa\.me$/i,
  /(^|\.)telegram\.me$/i,
  /(^|\.)t\.me$/i,
  /(^|\.)chat\.whatsapp\.com$/i,
];

export type SanitizeResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function sanitizeUrl(raw: string): SanitizeResult {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "URL must be http or https" };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  if (SHORTENER_HOSTS.has(host)) {
    return { ok: false, error: "URL shorteners are not allowed" };
  }

  if (BLOCKED_HOST_PATTERNS.some((re) => re.test(host))) {
    return { ok: false, error: "Chat invite links are not allowed" };
  }

  // Telegram/WhatsApp invite-style paths on otherwise allowed hosts
  const path = parsed.pathname.toLowerCase();
  if (
    path.includes("/invite") ||
    path.startsWith("/joinchat") ||
    path.startsWith("/+") ||
    /^\/[a-zA-Z0-9_-]{22}$/.test(path) // common wa.me group codes — belt & suspenders
  ) {
    if (
      host.includes("telegram") ||
      host === "t.me" ||
      host.includes("whatsapp") ||
      host === "wa.me"
    ) {
      return { ok: false, error: "Chat invite links are not allowed" };
    }
  }

  for (const key of Array.from(parsed.searchParams.keys())) {
    if (
      TRACKING_PARAMS.has(key.toLowerCase()) ||
      key.toLowerCase().startsWith("utm_")
    ) {
      parsed.searchParams.delete(key);
    }
  }

  parsed.hash = "";

  return { ok: true, url: parsed.toString() };
}
