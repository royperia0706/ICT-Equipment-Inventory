import { hashPassword, verifyPassword } from "@/lib/password";
import { readStore, writeStore } from "@/lib/store";

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function hasUsers() {
  return readStore().users.length > 0;
}

export function getUser(email) {
  const key = normalizeEmail(email);
  return readStore().users.find((user) => user.email === key) || null;
}

export function publicUser(user) {
  return {
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    totpEnabled: Boolean(user.totpEnabled),
  };
}

function saveUser(next) {
  const data = readStore();
  const index = data.users.findIndex((user) => user.email === next.email);
  if (index === -1) data.users.push(next);
  else data.users[index] = next;
  writeStore(data);
  return next;
}

export function createAdmin({ email, password, displayName }) {
  if (hasUsers()) throw new Error("An administrator account already exists.");
  const key = normalizeEmail(email);
  if (!key.includes("@") || !key.includes(".")) throw new Error("Enter a valid email address.");
  if (!displayName || displayName.trim().length < 2) throw new Error("Enter the administrator's name.");
  if (!password || password.length < 8) throw new Error("Password must be at least 8 characters.");

  return publicUser(
    saveUser({
      email: key,
      passwordHash: hashPassword(password),
      displayName: displayName.trim(),
      role: "admin",
      totpSecret: null,
      totpEnabled: false,
    })
  );
}

export function authenticate(email, password) {
  const user = getUser(email);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return user;
}

export function stagePendingSecret(email, proposed) {
  const user = getUser(email);
  if (!user) throw new Error("User not found.");
  const secret = user.pendingTotpSecret || proposed;
  if (!user.pendingTotpSecret) {
    user.pendingTotpSecret = secret;
    saveUser(user);
  }
  return secret;
}

export function enableTotp(email, secret) {
  const user = getUser(email);
  if (!user) throw new Error("User not found.");
  user.totpSecret = secret;
  user.totpEnabled = true;
  user.pendingTotpSecret = null;
  saveUser(user);
  return publicUser(user);
}
