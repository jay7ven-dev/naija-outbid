/**
 * Runnable check for URL sanitizer.
 * Run: npx tsx src/lib/sanitize-url.selfcheck.ts
 */
import { sanitizeUrl } from "./sanitize-url";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(sanitizeUrl("https://example.com?utm_source=x").ok, "strip utm");
const cleaned = sanitizeUrl("https://example.com?utm_source=x&id=1");
assert(cleaned.ok && !cleaned.url.includes("utm_"), "utm gone");
assert(cleaned.ok && cleaned.url.includes("id=1"), "keep id");

assert(!sanitizeUrl("ftp://x.com").ok, "block ftp");
assert(!sanitizeUrl("https://bit.ly/abc").ok, "block shortener");
assert(!sanitizeUrl("https://wa.me/123").ok, "block wa.me");
assert(!sanitizeUrl("https://t.me/+invite").ok, "block telegram invite");
assert(sanitizeUrl("https://github.com/foo").ok, "allow github");

console.log("sanitize-url.selfcheck: ok");
