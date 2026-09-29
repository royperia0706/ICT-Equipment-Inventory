import { clearLock, inspectLock, registerFailure } from "@/lib/lockout";
import { json, setSession } from "@/lib/session";
import { authenticate, publicUser } from "@/lib/users";

const CHALLENGE = 60 * 10;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = body.email;
  const lock = inspectLock(email);

  if (lock.blocked) {
    return json(
      { ok: false, error: lock.error, code: lock.code, retryAfter: lock.retryAfter ?? 0 },
      lock.status
    );
  }

  const user = authenticate(email, body.password);
  if (!user) {
    const failure = registerFailure(email);
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

  clearLock(email);
  const step = user.totpEnabled ? "verify" : "setup";
  await setSession({ email: user.email, step, pendingSecret: null }, CHALLENGE);

  return json({
    ok: true,
    step,
    ...publicUser(user),
  });
}
