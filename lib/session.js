import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "ict_session";
const SECRET = process.env.SESSION_SECRET || "ict-inventory-local-dev-only";

function sign(payload) {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function encode(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function getSession() {
  const jar = await cookies();
  return decode(jar.get(COOKIE)?.value) || {};
}

export async function setSession(data, maxAge = 60 * 60 * 8) {
  const jar = await cookies();
  jar.set(COOKIE, encode(data), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function json(data, status = 200) {
  return Response.json(data, { status });
}
