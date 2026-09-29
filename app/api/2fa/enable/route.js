import { clearLock, inspectLock, registerFailure } from "@/lib/lockout";
import { getSession, json, setSession } from "@/lib/session";
import { checkCode } from "@/lib/totp";
import { enableTotp, getUser, publicUser } from "@/lib/users";

export async function POST(request) {
  const session = await getSession();
  const user = getUser(session.email);
  const body = await request.json().catch(() => ({}));
  const secret = user?.pendingTotpSecret || session.pendingSecret;

  if (!user || session.step !== "setup" || !secret) {
    return json({ ok: false, error: "Start authenticator setup first." }, 400);
  }

  const lock = inspectLock(user.email);
  if (lock.blocked) {
    return json({ ok: false, error: lock.error, code: lock.code, retryAfter: lock.retryAfter ?? 0 }, lock.status);
  }

  if (!checkCode(body.code, secret)) {
    const failure = registerFailure(user.email);
    return json(
      { ok: false, error: "That code is invalid or expired.", code: failure.code, retryAfter: failure.retryAfter ?? 0 },
      failure.status === 401 ? 400 : failure.status
    );
  }

  clearLock(user.email);
  const saved = enableTotp(user.email, secret);
  await setSession({ email: user.email, step: "verified", pendingSecret: null });
  return json({ ok: true, ...publicUser(saved) });
}
