import { getSession, json } from "@/lib/session";
import { addAccount, decideAccount, editAccount, getUser, publicUser, removeAccount } from "@/lib/users";

async function actor() {
  const session = await getSession();
  if (session.step !== "verified" || !session.username) return null;
  const user = await getUser(session.username);
  return user ? publicUser(user) : null;
}

function fail(error) {
  return json({ ok: false, error: error.message || "Could not update the account." }, error.status || 400);
}

export async function POST(request) {
  const user = await actor();
  if (!user) return json({ ok: false, error: "Sign in first." }, 401);
  const body = await request.json().catch(() => ({}));
  try {
    if (body.decision) {
      const result = await decideAccount(user, body.username, body.decision);
      return json({ ok: true, ...result });
    }
    const result = await addAccount(user, body);
    return json({ ok: true, ...result });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request) {
  const user = await actor();
  if (!user) return json({ ok: false, error: "Sign in first." }, 401);
  const body = await request.json().catch(() => ({}));
  try {
    return json({ ok: true, ...(await editAccount(user, body)) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request) {
  const user = await actor();
  if (!user) return json({ ok: false, error: "Sign in first." }, 401);
  const username = new URL(request.url).searchParams.get("username");
  try {
    return json({ ok: true, ...(await removeAccount(user, username)) });
  } catch (error) {
    return fail(error);
  }
}
