import { clearLock, inspectLock, registerFailure } from "@/lib/lockout";
import { getSession, json, setSession } from "@/lib/session";
import { checkCode } from "@/lib/totp";
import { getUser, publicUser } from "@/lib/users";

export async function POST(request) {
  const session = await getSession();
  const user = getUser(session.email);
  const body = await request.json().catch(() => ({}));

  if (!user || session.step !== "verify" || !user.totpEnabled || !user.totpSecret) {
    return json({ ok: false, error: "Enter your password before the authenticator code." }, 401);
  }

  const lock = inspectLock(user.email);
  if (lock.blocked) {
    return json({ ok: false, error: lock.error, code: lock.code, retryAfter: lock.retryAfter ?? 0 }, lock.status);
  }

  if (!checkCode(body.code, user.totpSecret)) {
    const failure = registerFailure(user.email);
    return json(
      {
        ok: false,
        error: failure.code === "invalid" ? "That code is invalid or expired." : failure.error,
        code: failure.code,
        retryAfter: failure.retryAfter ?? 0,
      },
      failure.status === 401 ? 400 : failure.status
    );
  }

  clearLock(user.email);
  await setSession({ email: user.email, step: "verified", pendingSecret: null });
  return json({ ok: true, ...publicUser(user) });
}
