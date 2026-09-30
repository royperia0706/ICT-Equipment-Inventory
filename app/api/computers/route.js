import { addComputer, listComputers, previewControlNumber } from "@/lib/computers";
import { getSession, json } from "@/lib/session";

async function signedIn() {
  const session = await getSession();
  return session.step === "verified";
}

export async function GET(request) {
  if (!(await signedIn())) return json({ ok: false, error: "Sign in first." }, 401);
  const { searchParams } = new URL(request.url);
  if (searchParams.get("preview")) {
    return json({
      ok: true,
      controlNumber: previewControlNumber(searchParams.get("municipality"), searchParams.get("office")),
    });
  }
  return json({ ok: true, computers: listComputers() });
}

export async function POST(request) {
  if (!(await signedIn())) return json({ ok: false, error: "Sign in first." }, 401);
  const body = await request.json().catch(() => ({}));
  try {
    return json({ ok: true, computer: addComputer(body) });
  } catch (error) {
    return json({ ok: false, error: error.message }, 400);
  }
}
