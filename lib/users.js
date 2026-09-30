import { firestore } from "@/lib/firebase";
import { verifyPassword } from "@/lib/password";

export function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export function roleFromAccess(access, stored) {
  const text = String(access || "");
  if (/super/i.test(text)) return "super-admin";
  if (/assistant/i.test(text)) return "assistant-admin";
  if (stored === "super-admin" || stored === "assistant-admin" || stored === "encoder") return stored;
  return "encoder";
}

export function publicUser(user) {
  return {
    username: user.username,
    displayName: user.displayName,
    role: roleFromAccess(user.access, user.role),
    access: user.access,
    region: user.region,
    unit: user.unit,
    province: user.province,
    station: user.station,
    classification: user.classification,
  };
}

async function accounts() {
  const db = firestore();
  if (!db) throw new Error("The account database is not connected.");
  return db.collection("accounts");
}

export async function hasUsers() {
  const snap = await (await accounts()).limit(1).get();
  return !snap.empty;
}

export async function getUser(username) {
  const key = normalizeUsername(username);
  if (!key) return null;
  const snap = await (await accounts()).where("username", "==", key).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data();
}

export async function authenticate(username, password) {
  const user = await getUser(username);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return publicUser(user);
}

export async function listAccounts() {
  const snap = await (await accounts()).get();
  return snap.docs
    .map((doc) => ({ ...publicUser(doc.data()), sort: doc.data().sort || 0 }))
    .sort((a, b) => a.sort - b.sort);
}
