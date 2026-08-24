import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "naija_admin";

function token(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("ADMIN_PASSWORD is not set");
  return createHmac("sha256", pw).update("admin-session").digest("hex");
}

export function isAdminAuthenticated(): boolean {
  try {
    const value = cookies().get(COOKIE)?.value;
    if (!value) return false;
    const expected = token();
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function adminCookieValue(): string {
  return token();
}

export { COOKIE as ADMIN_COOKIE };
