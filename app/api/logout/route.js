import { redirect } from "next/navigation";
import { clearSession, getSession, json } from "@/lib/session";
import { endUserSession } from "@/lib/users";

async function end(session) {
  await endUserSession(session.username, session.sessionId).catch(() => {});
  await clearSession();
}

export async function POST() {
  const session = await getSession();
  await end(session);
  return json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  await end(session);
  redirect("/?signedOut=idle");
}
