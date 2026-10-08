import { clearLock, inspectLock, registerFailure } from "@/lib/lockout";
import { json, setSession } from "@/lib/session";
import { normalizeUsername, signIn, startUserSession } from "@/lib/users";

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

  let result = null;
  try {
    result = await signIn(username, body.password);
  } catch (error) {
    return json({ ok: false, error: error.message }, 503);
  }

  if (!result) {
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

  if (!result.ok) {
    return json(
      {
        ok: false,
        error: result.error,
        code: result.code,
        retryAfter: result.retryAfter ?? 0,
        remainingAttempts: result.remainingAttempts,
      },
      result.status
    );
  }

  clearLock(username);
  const step = result.mustChangePassword ? "reset-password" : "verified";
  const sessionId = await startUserSession(result.user.username);
  await setSession({
    username: result.user.username,
    step,
    revision: result.revision || 0,
    sessionId,
  });
  const { recordActivity } = await import("@/lib/activity");
  await recordActivity({
    username: result.user.username,
    action: "Signed in",
    detail: `${result.user.username} signed in`,
    kind: "Account",
    controlNumber: result.user.username,
    unit: result.user.unit || "",
    province: result.user.province || "",
    municipality: result.user.station || "",
  });
  return json({ ok: true, step, ...result.user });
}
