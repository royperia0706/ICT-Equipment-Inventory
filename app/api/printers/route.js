import { applyScope, inScope } from "@/lib/access";
import { addPrinter, deletePrinter, getPrinter, listPrinters, previewPrinterNumber, updatePrinter } from "@/lib/printers";
import { getSession, json } from "@/lib/session";
import { getUser, publicUser } from "@/lib/users";

async function actor() {
  const session = await getSession();
  if (session.step !== "verified" || !session.username) return null;
  const user = await getUser(session.username);
  return user ? publicUser(user) : null;
}

function fail(error) {
  return json({ ok: false, error: error.message || "Could not save the printer." }, error.status || 400);
}

export async function GET(request) {
  const user = await actor();
  if (!user) return json({ ok: false, error: "Sign in first." }, 401);
  const { searchParams } = new URL(request.url);
  if (searchParams.get("preview")) {
    const scoped = applyScope(user, {
      municipality: searchParams.get("municipality"),
      office: searchParams.get("office"),
    });
    return json({ ok: true, controlNumber: await previewPrinterNumber(scoped.municipality, scoped.office) });
  }
  return json({ ok: true, printers: await listPrinters(user) });
}

export async function POST(request) {
  const user = await actor();
  if (!user) return json({ ok: false, error: "Sign in first." }, 401);
  const body = await request.json().catch(() => ({}));
  try {
    return json({ ok: true, printer: await addPrinter(applyScope(user, body)) });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request) {
  const user = await actor();
  if (!user) return json({ ok: false, error: "Sign in first." }, 401);
  const body = await request.json().catch(() => ({}));
  try {
    const existing = await getPrinter(body.id);
    if (!existing || !inScope(user, existing)) {
      return json({ ok: false, error: "You cannot edit this printer." }, 403);
    }
    return json({ ok: true, printer: await updatePrinter(existing.id, applyScope(user, body)) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request) {
  const user = await actor();
  if (!user) return json({ ok: false, error: "Sign in first." }, 401);
  const { searchParams } = new URL(request.url);
  try {
    const existing = await getPrinter(searchParams.get("id"));
    if (!existing || !inScope(user, existing)) {
      return json({ ok: false, error: "You cannot delete this printer." }, 403);
    }
    await deletePrinter(existing.id);
    return json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
