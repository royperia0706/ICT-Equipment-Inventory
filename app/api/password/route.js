import { currentUser } from "@/lib/guard";
import { json, setSession } from "@/lib/session";
import { changeOwnPassword } from "@/lib/users";

export async function POST(request) {
  const signedIn = await currentUser();
  if (!signedIn) {
    return json({ ok: false, error: "Sign in first." }, 401);
  }
  const body = await request.json().catch(() => ({}));
  if (String(body.newPassword || "") !== String(body.confirmPassword || "")) {
    return json({ ok: false, error: "The new passwords do not match." }, 400);
  }
  try {
    const revision = await changeOwnPassword(signedIn.username, body.currentPassword, body.newPassword);
    await setSession({ username: signedIn.username, step: "verified", revision });
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: error.message || "Could not change the password." }, error.status || 400);
  }
}
