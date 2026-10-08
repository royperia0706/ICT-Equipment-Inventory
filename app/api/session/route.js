import { idleExpired } from "@/lib/idle";
import { clearSession, getSession, json, setSession } from "@/lib/session";
import { endUserSession, getSessionUser } from "@/lib/users";

export async function POST() {
  const session = await getSession();
  if (!session.username || !session.sessionId || idleExpired(session)) {
    if (session.username && session.sessionId) {
      await endUserSession(session.username, session.sessionId).catch(() => {});
    }
    await clearSession();
    return json({ ok: false }, 401);
  }
  let user = null;
  try {
    user = await getSessionUser(session.username, session.sessionId);
  } catch {
    return json({ ok: false }, 503);
  }
  if (!user) {
    await clearSession();
    return json({ ok: false }, 401);
  }
  await setSession({ ...session, activeAt: Date.now() });
  return json({ ok: true });
}
