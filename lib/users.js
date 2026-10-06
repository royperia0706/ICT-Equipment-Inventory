import { recordActivity } from "@/lib/activity";
import { firestore } from "@/lib/firebase";
import { formatClock } from "@/lib/lockout";
import { provinceName, regionName } from "@/lib/location-choices";
import { hashPassword, temporaryPassword, verifyPassword } from "@/lib/password";

const RESTRICT_MS = 60 * 1000;
const FAILS_BEFORE_RESTRICT = 3;

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
    blocked: Boolean(user.blocked),
    mustChangePassword: Boolean(user.mustChangePassword),
    accountStatus: accountStatus(user),
  };
}

function accountStatus(user) {
  if (user.blocked) return "Blocked";
  if (user.pendingAction) return "Pending";
  if (user.mustChangePassword) return "Password reset";
  if ((user.restrictedUntil || 0) > Date.now()) return "Restricted";
  return "Active";
}

function accountId(username) {
  return normalizeUsername(username).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function logAccount(actor, action, account, detail) {
  return recordActivity({
    username: actor?.username || account?.username || "",
    action,
    detail,
    kind: "Account",
    controlNumber: account?.username || "",
    unit: account?.unit || actor?.unit || "",
    province: account?.province || actor?.province || "",
    municipality: account?.station || actor?.station || "",
  });
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
  const { readCache } = await import("@/lib/read-cache");
  return readCache(`user:${key}`, 60 * 1000, async () => {
    const snap = await (await accounts()).where("username", "==", key).limit(1).get();
    if (snap.empty) return null;
    return snap.docs[0].data();
  });
}

function denied(status, code, error, extra = {}) {
  return { ok: false, status, code, error, ...extra };
}

export async function signIn(username, password) {
  const user = await getUser(username);
  if (!user || user.pendingAction === "add") return null;

  const now = Date.now();
  const ref = (await accounts()).doc(accountId(user.username));
  if (user.blocked) {
    return denied(403, "locked", "This account is blocked. An Assistant Admin or Super Admin must unblock it.");
  }
  if ((user.restrictedUntil || 0) > now) {
    const seconds = Math.max(1, Math.ceil((user.restrictedUntil - now) / 1000));
    return denied(429, "timeout", `Too many failed attempts. Try again in ${formatClock(seconds)}.`, { retryAfter: seconds });
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return recordAccountFailure(ref, user, now);
  }

  await ref.set({ loginFails: 0, restrictedUntil: 0, loginArmed: false }, { merge: true });
  return {
    ok: true,
    mustChangePassword: Boolean(user.mustChangePassword),
    revision: user.passwordRevision || 0,
    user: publicUser(user),
  };
}

async function recordAccountFailure(ref, user, now) {
  if (user.loginArmed && (user.restrictedUntil || 0) <= now) {
    await ref.set({ blocked: true, loginFails: 0, restrictedUntil: 0, loginArmed: false }, { merge: true });
    return denied(403, "locked", "This account is blocked. An Assistant Admin or Super Admin must unblock it.");
  }

  const fails = (user.loginFails || 0) + 1;
  if (fails >= FAILS_BEFORE_RESTRICT) {
    await ref.set({ loginFails: 0, restrictedUntil: now + RESTRICT_MS, loginArmed: true }, { merge: true });
    return denied(429, "timeout", "Too many failed attempts. Try again in 1:00.", { retryAfter: 60 });
  }

  await ref.set({ loginFails: fails }, { merge: true });
  const remaining = FAILS_BEFORE_RESTRICT - fails;
  return denied(401, "invalid", `That did not match. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining.`, {
    remainingAttempts: remaining,
  });
}

export async function authenticate(username, password) {
  const result = await signIn(username, password);
  if (!result?.ok || result.mustChangePassword) return null;
  return result.user;
}

export async function listAccounts() {
  const { readCache } = await import("@/lib/read-cache");
  return readCache("accounts", 60 * 1000, async () => {
    const snap = await (await accounts()).get();
    return snap.docs
      .map((doc) => ({ ...publicUser(doc.data()), sort: doc.data().sort || 0 }))
      .sort((a, b) => a.sort - b.sort || a.displayName.localeCompare(b.displayName));
  });
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
  record.passwordPlain = password;
  record.sort = Date.now();
  record.pendingAction = actor.role === "assistant-admin" ? "add" : "";
  record.pendingBy = actor.role === "assistant-admin" ? actor.username : "";
  record.pendingPayload = null;
  await (await accounts()).doc(accountId(username)).set(record);
  await logAccount(actor, record.pendingAction ? "Account submitted" : "Account added", record, `${record.pendingAction ? "Account submitted for" : "Added account"} ${record.username}`);
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
  next.blocked = Boolean(existing.blocked);
  next.loginFails = existing.loginFails || 0;
  next.restrictedUntil = existing.restrictedUntil || 0;
  next.loginArmed = Boolean(existing.loginArmed);
  next.mustChangePassword = password ? false : Boolean(existing.mustChangePassword);
  next.passwordRevision = password ? Date.now() : (existing.passwordRevision || 0);
  next.passwordPlain = password || existing.passwordPlain || "";
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
      passwordPlain: next.passwordPlain,
    };
    await ref.set({
      pendingAction: "edit",
      pendingBy: actor.username,
      pendingAccess: next.access,
      pendingStation: next.station,
      pendingPayload,
    }, { merge: true });
    await logAccount(actor, "Account submitted", existing, `Account changes submitted for ${existing.username}`);
    return { pending: true, account: publicUser({ ...existing, pendingAction: "edit", pendingBy: actor.username, pendingAccess: next.access, pendingStation: next.station }) };
  }
  next.pendingAction = "";
  next.pendingBy = "";
  next.pendingAccess = "";
  next.pendingStation = "";
  next.pendingPayload = null;
  await ref.set(next);
  await logAccount(actor, "Account updated", next, `Updated account ${next.username}`);
  return { pending: false, account: publicUser(next) };
}

export async function changeOwnPassword(username, currentPassword, newPassword) {
  const existing = await getUser(username);
  if (!existing || existing.pendingAction === "add" || !verifyPassword(currentPassword, existing.passwordHash)) {
    fail("The current password is not correct.");
  }
  const next = String(newPassword || "");
  if (next.length < 4) fail("Password must be at least 4 characters.");
  const passwordRevision = Date.now();
  await (await accounts()).doc(accountId(existing.username)).set({
    passwordHash: hashPassword(next),
    passwordRevision,
    mustChangePassword: false,
    passwordPlain: "",
  }, { merge: true });
  await logAccount({ username }, "Password changed", existing, `Password changed for ${existing.username}`);
  return passwordRevision;
}

export async function finishPasswordReset(username, newPassword) {
  const existing = await getUser(username);
  if (!existing || !existing.mustChangePassword) fail("This account does not need a new password.", 400);
  const next = String(newPassword || "");
  if (next.length < 4) fail("Password must be at least 4 characters.");
  const passwordRevision = Date.now();
  await (await accounts()).doc(accountId(existing.username)).set({
    passwordHash: hashPassword(next),
    passwordRevision,
    mustChangePassword: false,
    passwordPlain: "",
    blocked: false,
    loginFails: 0,
    restrictedUntil: 0,
    loginArmed: false,
  }, { merge: true });
  return passwordRevision;
}

export async function unblockAccount(actor, username) {
  assertManager(actor);
  const existing = await getUser(username);
  if (!existing) fail("Account not found.", 404);
  if (!existing.blocked) fail("This account is not blocked.");
  if (existing.username === actor.username) fail("You cannot unblock the account you are using.");
  const role = roleFromAccess(existing.access, existing.role);
  if (role === "super-admin" && actor.role !== "super-admin") {
    fail("A Super Admin account can only be changed by a Super Admin.", 403);
  }
  assertOffice(actor, existing.unit);
  assertEncoderTarget(actor, existing);
  const password = temporaryPassword();
  const passwordRevision = Date.now();
  const next = {
    ...existing,
    passwordHash: hashPassword(password),
    passwordRevision,
    mustChangePassword: true,
    blocked: false,
    loginFails: 0,
    restrictedUntil: 0,
    loginArmed: false,
  };
  await (await accounts()).doc(accountId(existing.username)).set(next);
  await logAccount(actor, "Account unblocked", next, `Unblocked account ${existing.username}`);
  return { account: publicUser(next), temporaryPassword: password };
}

async function managedAccount(actor, username) {
  assertManager(actor);
  const key = normalizeUsername(username);
  const snap = await (await accounts()).where("username", "==", key).limit(1).get();
  if (snap.empty) fail("Account not found.", 404);
  const existing = snap.docs[0].data();
  if (existing.username === actor.username) fail("You cannot change the account you are using.");
  const role = roleFromAccess(existing.access, existing.role);
  if (role === "super-admin" && actor.role !== "super-admin") {
    fail("A Super Admin account can only be changed by a Super Admin.", 403);
  }
  assertOffice(actor, existing.unit);
  assertEncoderTarget(actor, existing);
  return existing;
}

export async function resetAccountPassword(actor, username) {
  const existing = await managedAccount(actor, username);
  const password = temporaryPassword();
  const passwordRevision = Date.now();
  const next = {
    ...existing,
    passwordHash: hashPassword(password),
    passwordPlain: password,
    passwordRevision,
    mustChangePassword: true,
    loginFails: 0,
    restrictedUntil: 0,
    loginArmed: false,
  };
  await (await accounts()).doc(accountId(existing.username)).set(next);
  await logAccount(actor, "Password reset", next, `Reset password for ${existing.username}`);
  return { account: publicUser(next), temporaryPassword: password };
}

export async function deactivateAccount(actor, username) {
  const existing = await managedAccount(actor, username);
  if (existing.blocked) fail("This account is already deactivated.");
  const next = { ...existing, blocked: true };
  await (await accounts()).doc(accountId(existing.username)).set(next);
  await logAccount(actor, "Account deactivated", next, `Deactivated account ${existing.username}`);
  return { account: publicUser(next) };
}

export async function showAccountPassword(actor, username) {
  const existing = await managedAccount(actor, username);
  const snap = await (await accounts()).doc(accountId(existing.username)).get();
  await logAccount(actor, "Password viewed", existing, `Viewed password for ${existing.username}`);
  return { username: existing.username, password: snap.data()?.passwordPlain || "" };
}

export async function removeAccount(actor, username) {
  assertManager(actor);
  const existing = await getUser(username);
  if (!existing) fail("Account not found.", 404);
  if (existing.username === actor.username) fail("You cannot delete the account you are using.");
  const role = roleFromAccess(existing.access, existing.role);
  if (role === "assistant-admin" || role === "encoder") {
    fail("Assistant Admin and Encoder accounts cannot be deleted.", 403);
  }
  if (roleFromAccess(existing.access, existing.role) === "super-admin" && actor.role !== "super-admin") {
    fail("A Super Admin account can only be changed by a Super Admin.", 403);
  }
  assertOffice(actor, existing.unit);
  assertEncoderTarget(actor, existing);
  const ref = (await accounts()).doc(accountId(existing.username));
  if (actor.role === "assistant-admin") {
    await ref.set({ pendingAction: "delete", pendingBy: actor.username, pendingPayload: null }, { merge: true });
    await logAccount(actor, "Account submitted", existing, `Account delete submitted for ${existing.username}`);
    return { pending: true, account: publicUser({ ...existing, pendingAction: "delete", pendingBy: actor.username }) };
  }
  await ref.delete();
  await logAccount(actor, "Account deleted", existing, `Deleted account ${existing.username}`);
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
      await logAccount(actor, "Account rejected", existing, `Rejected new account ${existing.username}`);
      return { account: null, removed: true };
    }
    await ref.set({ pendingAction: "", pendingBy: "", pendingAccess: "", pendingStation: "", pendingPayload: null }, { merge: true });
    await logAccount(actor, "Account rejected", existing, `Rejected account changes for ${existing.username}`);
    return { account: publicUser({ ...existing, pendingAction: "", pendingBy: "" }), removed: false };
  }
  if (existing.pendingAction === "delete") {
    await ref.delete();
    await logAccount(actor, "Account deleted", existing, `Approved delete for account ${existing.username}`);
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
    await logAccount(actor, "Account approved", next, `Approved account changes for ${existing.username}`);
    return { account: publicUser(next), removed: false };
  }
  await ref.set({ pendingAction: "", pendingBy: "", pendingAccess: "", pendingStation: "", pendingPayload: null }, { merge: true });
  await logAccount(actor, "Account approved", existing, `Approved account ${existing.username}`);
  return { account: publicUser({ ...existing, pendingAction: "", pendingBy: "" }), removed: false };
}
