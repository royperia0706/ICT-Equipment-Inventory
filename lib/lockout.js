const TIMEOUT_MS = 60 * 1000;
const FAILS_BEFORE_TIMEOUT = 3;

const store = globalThis.__ictLockouts ?? new Map();
if (!globalThis.__ictLockouts) globalThis.__ictLockouts = store;

function keyFor(email) {
  return String(email || "").trim().toLowerCase();
}

function getRecord(email) {
  const key = keyFor(email);
  if (!key) return null;
  return store.get(key) ?? { fails: 0, timeoutUntil: 0, afterTimeout: false, locked: false };
}

function save(email, record) {
  store.set(keyFor(email), record);
}

function retryAfter(record) {
  return Math.max(0, Math.ceil((record.timeoutUntil - Date.now()) / 1000));
}

export function inspectLock(email) {
  const record = getRecord(email);
  if (!record) return { blocked: false };

  if (record.locked) {
    return {
      blocked: true,
      status: 403,
      code: "locked",
      error: "This account is locked. Contact the administrator.",
    };
  }

  if (record.timeoutUntil > Date.now()) {
    const seconds = retryAfter(record);
    return {
      blocked: true,
      status: 429,
      code: "timeout",
      retryAfter: seconds,
      error: `Too many failed attempts. Try again in ${formatClock(seconds)}.`,
    };
  }

  if (record.timeoutUntil && record.timeoutUntil <= Date.now()) {
    record.timeoutUntil = 0;
    save(email, record);
  }

  return { blocked: false };
}

export function registerFailure(email) {
  const record = getRecord(email) || {
    fails: 0,
    timeoutUntil: 0,
    afterTimeout: false,
    locked: false,
  };

  if (record.afterTimeout) {
    record.locked = true;
    save(email, record);
    return {
      status: 403,
      code: "locked",
      error: "This account is locked. Contact the administrator.",
    };
  }

  record.fails += 1;

  if (record.fails >= FAILS_BEFORE_TIMEOUT) {
    record.afterTimeout = true;
    record.timeoutUntil = Date.now() + TIMEOUT_MS;
    save(email, record);
    return {
      status: 429,
      code: "timeout",
      retryAfter: 60,
      error: "Too many failed attempts. Try again in 1:00.",
    };
  }

  save(email, record);
  const remaining = FAILS_BEFORE_TIMEOUT - record.fails;
  return {
    status: 401,
    code: "invalid",
    remainingAttempts: remaining,
    error: `That did not match. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining.`,
  };
}

export function clearLock(email) {
  const key = keyFor(email);
  if (key) store.delete(key);
}

export function formatClock(totalSeconds) {
  const seconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}
