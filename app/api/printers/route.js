import { applyScope, inScope } from "@/lib/access";
import { getPrinter, listPrinters, previewPrinterNumber } from "@/lib/printers";
import { requestDelete, saveEquipment } from "@/lib/review";
import { currentUser } from "@/lib/guard";
import { json } from "@/lib/session";

async function actor() {
  return currentUser();
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
    const result = await saveEquipment("printer", user, applyScope(user, body), null);
    return json({ ok: true, printer: result.record, pending: result.pending, message: result.message });
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
    const result = await saveEquipment("printer", user, applyScope(user, body), existing);
    return json({ ok: true, printer: result.record, pending: result.pending, message: result.message });
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
    const result = await requestDelete("printer", user, existing);
    return json({ ok: true, printer: result.record, pending: result.pending, message: result.message });
  } catch (error) {
    return fail(error);
  }
}
