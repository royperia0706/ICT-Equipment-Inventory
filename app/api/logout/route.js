import { clearSession, getSession, json } from "@/lib/session";
import { endUserSession } from "@/lib/users";

export async function POST() {
  const session = await getSession();
  await endUserSession(session.username, session.sessionId).catch(() => {});
  await clearSession();
  return json({ ok: true });
}
