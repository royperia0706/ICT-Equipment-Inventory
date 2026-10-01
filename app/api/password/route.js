import { getSession, json } from "@/lib/session";
import { changeOwnPassword } from "@/lib/users";

export async function POST(request) {
  const session = await getSession();
  if (session.step !== "verified" || !session.username) {
    return json({ ok: false, error: "Sign in first." }, 401);
  }
  const body = await request.json().catch(() => ({}));
  if (String(body.newPassword || "") !== String(body.confirmPassword || "")) {
    return json({ ok: false, error: "The new passwords do not match." }, 400);
  }
  try {
    await changeOwnPassword(session.username, body.currentPassword, body.newPassword);
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: error.message || "Could not change the password." }, error.status || 400);
  }
}
