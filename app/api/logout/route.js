import { clearSession, json } from "@/lib/session";

export async function POST() {
  await clearSession();
  return json({ ok: true });
}
