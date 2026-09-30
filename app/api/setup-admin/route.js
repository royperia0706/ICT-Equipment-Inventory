import { isBlankLogin, temporaryUser } from "@/lib/guard";
import { json, setSession } from "@/lib/session";
import { createAdmin, hasUsers } from "@/lib/users";

export async function GET() {
  return json({ firstRun: !hasUsers() });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (isBlankLogin(body.email, body.password, body.displayName)) {
    await setSession({ email: temporaryUser.email, step: "verified", temporary: true });
    return json({ ok: true, step: "verified", ...temporaryUser });
  }
  try {
    const user = createAdmin({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
    });
    await setSession({ email: user.email, step: "setup", pendingSecret: null }, 60 * 10);
    return json({ ok: true, step: "setup", ...user });
  } catch (error) {
    return json({ ok: false, error: error.message }, 400);
  }
}
