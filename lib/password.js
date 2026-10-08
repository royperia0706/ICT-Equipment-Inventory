import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const NUMBERS = "23456789";

export function passwordError(value) {
  const password = String(value || "");
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must be at least 8 characters and include letters and numbers.";
  }
  return "";
}

export function temporaryPassword() {
  const all = LETTERS + NUMBERS;
  const bytes = randomBytes(8);
  const chars = [
    LETTERS[bytes[0] % LETTERS.length],
    NUMBERS[bytes[1] % NUMBERS.length],
  ];
  for (let index = 2; index < 8; index += 1) chars.push(all[bytes[index] % all.length]);
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = bytes[index % bytes.length] % (index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join("");
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
