import { firestore } from "@/lib/firebase";
import { provinceName, regionName } from "@/lib/location-choices";
import { hashPassword, verifyPassword } from "@/lib/password";

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
    pendingAction: user.pendingAction || "",
    pendingBy: user.pendingBy || "",
    pendingAccess: user.pendingAccess || "",
    pendingStation: user.pendingStation || "",
    accountStatus: user.pendingAction ? "Pending" : "Active",
  };
}

function accountId(username) {
  return normalizeUsername(username).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function assertManager(actor) {
  if (actor?.role !== "assistant-admin" && actor?.role !== "super-admin") {
    fail("Only an Assistant Admin or Super Admin can change accounts.", 403);
  }
}

function assertOffice(actor, unit) {
  if (actor.role === "assistant-admin" && unit !== actor.unit) {
    fail("You can only change accounts in your office.", 403);
  }
}

function assertEncoderTarget(actor, account) {
  if (actor.role === "assistant-admin" && roleFromAccess(account.access, account.role) !== "encoder") {
    fail("You can only manage Encoder accounts in your office.", 403);
  }
}

function buildAccount(input, passwordHash) {
  const access = String(input.access || "").trim();
  const unit = String(input.unit || "").trim();
  const station = String(input.station || input.displayName || "").trim();
  return {
    region: regionName,
    unit,
    province: provinceName(unit),
    station,
    displayName: String(input.displayName || station).trim(),
    classification: String(input.classification || "").trim(),
    username: normalizeUsername(input.username),
    passwordHash,
    access,
    role: roleFromAccess(access),
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
  if (!user || user.pendingAction === "add" || !verifyPassword(password, user.passwordHash)) return null;
  return publicUser(user);
}

export async function listAccounts() {
  const snap = await (await accounts()).get();
  return snap.docs
    .map((doc) => ({ ...publicUser(doc.data()), sort: doc.data().sort || 0 }))
    .sort((a, b) => a.sort - b.sort || a.displayName.localeCompare(b.displayName));
}

export function accountsFor(actor, accounts) {
  if (actor?.role === "super-admin") return accounts;
  if (actor?.role !== "assistant-admin") return [];
  return accounts.filter((account) => account.unit === actor.unit && account.role === "encoder");
}

export async function addAccount(actor, input) {
  assertManager(actor);
  const username = normalizeUsername(input.username);
  const password = String(input.password || "");
  if (!username) fail("Enter a username.");
  if (password.length < 4) fail("Password must be at least 4 characters.");
  if (!String(input.unit || "").trim()) fail("Choose an office.");
  if (!String(input.station || input.displayName || "").trim()) fail("Choose a station.");
  if (!String(input.access || "").trim()) fail("Choose an access level.");
  assertOffice(actor, String(input.unit).trim());
  if (await getUser(username)) fail("That username is already used.");
  const record = buildAccount(input, hashPassword(password));
  assertEncoderTarget(actor, record);
  record.sort = Date.now();
  record.pendingAction = actor.role === "assistant-admin" ? "add" : "";
  record.pendingBy = actor.role === "assistant-admin" ? actor.username : "";
  record.pendingPayload = null;
  await (await accounts()).doc(accountId(username)).set(record);
  return { pending: Boolean(record.pendingAction), account: publicUser(record) };
}

export async function editAccount(actor, input) {
  assertManager(actor);
  const existing = await getUser(input.username);
  if (!existing) fail("Account not found.", 404);
  if (roleFromAccess(existing.access, existing.role) === "super-admin" && actor.role !== "super-admin") {
    fail("A Super Admin account can only be changed by a Super Admin.", 403);
  }
  assertOffice(actor, existing.unit);
  assertEncoderTarget(actor, existing);
  const unit = String(input.unit || existing.unit).trim();
  assertOffice(actor, unit);
  const password = String(input.password || "");
  if (password && password.length < 4) fail("Password must be at least 4 characters.");
  const next = buildAccount({ ...existing, ...input, unit }, password ? hashPassword(password) : existing.passwordHash);
  assertEncoderTarget(actor, next);
  next.sort = existing.sort || 0;
  const ref = (await accounts()).doc(accountId(existing.username));
  if (actor.role === "assistant-admin") {
    const pendingPayload = {
      displayName: next.displayName,
      station: next.station,
      classification: next.classification,
      unit: next.unit,
      province: next.province,
      access: next.access,
      role: next.role,
      passwordHash: next.passwordHash,
    };
    await ref.set({
      pendingAction: "edit",
      pendingBy: actor.username,
      pendingAccess: next.access,
      pendingStation: next.station,
      pendingPayload,
    }, { merge: true });
    return { pending: true, account: publicUser({ ...existing, pendingAction: "edit", pendingBy: actor.username, pendingAccess: next.access, pendingStation: next.station }) };
  }
  next.pendingAction = "";
  next.pendingBy = "";
  next.pendingAccess = "";
  next.pendingStation = "";
  next.pendingPayload = null;
  await ref.set(next);
  return { pending: false, account: publicUser(next) };
}

export async function removeAccount(actor, username) {
  assertManager(actor);
  const existing = await getUser(username);
  if (!existing) fail("Account not found.", 404);
  if (existing.username === actor.username) fail("You cannot delete the account you are using.");
  if (roleFromAccess(existing.access, existing.role) === "super-admin" && actor.role !== "super-admin") {
    fail("A Super Admin account can only be changed by a Super Admin.", 403);
  }
  assertOffice(actor, existing.unit);
  assertEncoderTarget(actor, existing);
  const ref = (await accounts()).doc(accountId(existing.username));
  if (actor.role === "assistant-admin") {
    await ref.set({ pendingAction: "delete", pendingBy: actor.username, pendingPayload: null }, { merge: true });
    return { pending: true, account: publicUser({ ...existing, pendingAction: "delete", pendingBy: actor.username }) };
  }
  await ref.delete();
  return { pending: false, account: null };
}

export async function decideAccount(actor, username, decision) {
  if (actor?.role !== "super-admin") fail("Only a Super Admin can approve account changes.", 403);
  const existing = await getUser(username);
  if (!existing || !existing.pendingAction) fail("This account has no pending request.", 400);
  const ref = (await accounts()).doc(accountId(existing.username));
  if (decision === "reject") {
    if (existing.pendingAction === "add") {
      await ref.delete();
      return { account: null, removed: true };
    }
    await ref.set({ pendingAction: "", pendingBy: "", pendingAccess: "", pendingStation: "", pendingPayload: null }, { merge: true });
    return { account: publicUser({ ...existing, pendingAction: "", pendingBy: "" }), removed: false };
  }
  if (existing.pendingAction === "delete") {
    await ref.delete();
    return { account: null, removed: true };
  }
  if (existing.pendingAction === "edit") {
    const payload = existing.pendingPayload || {};
    const next = {
      ...existing,
      ...payload,
      pendingAction: "",
      pendingBy: "",
      pendingAccess: "",
      pendingStation: "",
      pendingPayload: null,
    };
    await ref.set(next);
    return { account: publicUser(next), removed: false };
  }
  await ref.set({ pendingAction: "", pendingBy: "", pendingAccess: "", pendingStation: "", pendingPayload: null }, { merge: true });
  return { account: publicUser({ ...existing, pendingAction: "", pendingBy: "" }), removed: false };
}
