import { getSession, json, setSession } from "@/lib/session";
import { finishPasswordReset } from "@/lib/users";

export async function POST(request) {
  const session = await getSession();
  if (session.step !== "reset-password" || !session.username) {
    return json({ ok: false, error: "Sign in with the temporary password first." }, 401);
  }
  const body = await request.json().catch(() => ({}));
  if (String(body.newPassword || "") !== String(body.confirmPassword || "")) {
    return json({ ok: false, error: "The new passwords do not match." }, 400);
  }
  try {
    const revision = await finishPasswordReset(session.username, body.newPassword);
    await setSession({ username: session.username, step: "verified", revision });
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: error.message || "Could not save the new password." }, error.status || 400);
  }
}
