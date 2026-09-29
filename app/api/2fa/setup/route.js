import { json, getSession, setSession } from "@/lib/session";
import { generateSecret, ISSUER, qrForSecret } from "@/lib/totp";
import { getUser, stagePendingSecret } from "@/lib/users";

export async function GET() {
  const session = await getSession();
  const user = getUser(session.email);

  if (!user || (session.step !== "setup" && session.step !== "verified")) {
    return json({ ok: false, error: "Sign in before setting up the authenticator." }, 401);
  }
  if (user.totpEnabled) {
    return json({ ok: false, error: "Authenticator is already enabled." }, 400);
  }

  const secret = stagePendingSecret(user.email, session.pendingSecret || generateSecret());
  await setSession({ email: user.email, step: "setup", pendingSecret: secret }, 60 * 10);
  const qrDataUrl = await qrForSecret(user.email, secret);

  return json({
    ok: true,
    secret,
    qrDataUrl,
    account: user.email,
    issuer: ISSUER,
  });
}
