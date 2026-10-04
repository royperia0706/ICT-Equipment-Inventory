import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function temporaryPassword() {
  return randomBytes(9).toString("base64url").replace(/[-_]/g, "").slice(0, 8);
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 32).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const actual = scryptSync(password, parts[1], 32);
  const expected = Buffer.from(parts[2], "base64url");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
