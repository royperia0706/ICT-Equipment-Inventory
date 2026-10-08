import { idleExpired } from "@/lib/idle";
import { clearSession, getSession, json, setSession } from "@/lib/session";
import { accountState, endUserSession, finishPasswordReset, getSessionUser } from "@/lib/users";

export async function POST(request) {
  const session = await getSession();
  if (idleExpired(session)) {
    await endUserSession(session.username, session.sessionId).catch(() => {});
    await clearSession();
    return json({ ok: false, error: "You were signed out after 15 minutes of inactivity." }, 401);
  }
  if (session.step !== "reset-password" || !session.username || !session.sessionId) {
    return json({ ok: false, error: "Sign in with the temporary password first." }, 401);
  }
  const user = await getSessionUser(session.username, session.sessionId).catch(() => null);
  if (!user || accountState(user) !== "Active") {
    return json({ ok: false, error: "This session is no longer active. Sign in again." }, 401);
  }
  const body = await request.json().catch(() => ({}));
  if (String(body.newPassword || "") !== String(body.confirmPassword || "")) {
    return json({ ok: false, error: "The new passwords do not match." }, 400);
  }
  try {
    const revision = await finishPasswordReset(session.username, body.newPassword);
    await setSession({
      username: session.username,
      step: "verified",
      revision,
      sessionId: session.sessionId,
      activeAt: Date.now(),
    });
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: error.message || "Could not save the new password." }, error.status || 400);
  }
}
