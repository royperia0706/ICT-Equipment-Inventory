const hits = new Map();
const pending = new Map();
let blockedUntil = 0;

export function isQuotaError(error) {
  return error?.code === "QUOTA" || /RESOURCE_EXHAUSTED|Quota exceeded/i.test(String(error?.message || error));
}

function quotaError() {
  const error = new Error("The free database quota for today is used up. Try again after 3:00 PM.");
  error.code = "QUOTA";
  return error;
}

export function readCache(key, ttl, load) {
  const now = Date.now();
  const hit = hits.get(key);
  if (hit && now - hit.at < ttl) return Promise.resolve(hit.value);
  if (now < blockedUntil) {
    if (hit) return Promise.resolve(hit.value);
    return Promise.reject(quotaError());
  }
  if (pending.has(key)) return pending.get(key);

  const job = Promise.resolve()
    .then(load)
    .then((value) => {
      hits.set(key, { at: Date.now(), value });
      pending.delete(key);
      return value;
    })
    .catch((error) => {
      pending.delete(key);
      if (!isQuotaError(error)) throw error;
      blockedUntil = Date.now() + 10 * 60 * 1000;
      if (hit) return hit.value;
      throw quotaError();
    });
  pending.set(key, job);
  return job;
}
