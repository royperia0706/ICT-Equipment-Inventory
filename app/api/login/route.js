import { clearLock, inspectLock, registerFailure } from "@/lib/lockout";
import { json, setSession } from "@/lib/session";
import { authenticate, normalizeUsername } from "@/lib/users";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const username = normalizeUsername(body.username ?? body.email);

  if (!username || !String(body.password || "")) {
    return json({ ok: false, error: "Enter your username and password." }, 400);
  }

  const lock = inspectLock(username);
  if (lock.blocked) {
    return json(
      { ok: false, error: lock.error, code: lock.code, retryAfter: lock.retryAfter ?? 0 },
      lock.status
    );
  }

  let user = null;
  try {
    user = await authenticate(username, body.password);
  } catch (error) {
    return json({ ok: false, error: error.message }, 503);
  }

  if (!user) {
    const failure = registerFailure(username);
    return json(
      {
        ok: false,
        error: failure.error,
        code: failure.code,
        retryAfter: failure.retryAfter ?? 0,
        remainingAttempts: failure.remainingAttempts,
      },
      failure.status
    );
  }

  clearLock(username);
  await setSession({ username: user.username, step: "verified" });
  return json({ ok: true, step: "verified", ...user });
}
