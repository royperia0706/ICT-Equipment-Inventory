import { applyScope } from "@/lib/access";
import { importKinds } from "@/lib/import-columns";
import { rowToInput } from "@/lib/import-rows";
import { readUpload } from "@/lib/import-sheet";
import { listLocations } from "@/lib/locations";
import { requestDelete, saveEquipment } from "@/lib/review";
import { currentUser } from "@/lib/guard";
import { json } from "@/lib/session";

const limit = 150;

export async function POST(request) {
  const user = await currentUser();
  if (!user) return json({ ok: false, error: "Sign in first." }, 401);
  if (user.role !== "super-admin") return json({ ok: false, error: "Only a Super Admin can mass upload." }, 403);

  const form = await request.formData().catch(() => null);
  const kind = String(form?.get("kind") || "");
  const file = form?.get("file");
  if (!importKinds[kind]) return json({ ok: false, error: "Choose an inventory." }, 400);
  if (!file || typeof file.arrayBuffer !== "function") return json({ ok: false, error: "Choose an Excel file." }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed = [];
  try {
    parsed = readUpload(kind, buffer);
  } catch {
    return json({ ok: false, error: "That Excel file could not be read." }, 400);
  }
  if (!parsed.length) return json({ ok: false, error: "The file has no data rows." }, 400);
  if (parsed.length > limit) return json({ ok: false, error: `Upload ${limit} rows at a time.` }, 400);

  const locations = await listLocations();
  const inputs = [];
  for (let index = 0; index < parsed.length; index += 1) {
    try {
      inputs.push(rowToInput(kind, parsed[index].headers, parsed[index].row, locations));
    } catch {
      return json({ ok: false, mismatch: true }, 400);
    }
  }

  if (String(form.get("mode") || "") !== "save") {
    return json({ ok: true, count: inputs.length });
  }

  const saved = [];
  try {
    for (const input of inputs) {
      const result = await saveEquipment(kind, user, applyScope(user, input), null);
      if (result?.record) saved.push(result.record);
    }
  } catch {
    for (const record of saved.reverse()) {
      try {
        await requestDelete(kind, user, record);
      } catch {
        /* remove the rest of this batch */
      }
    }
    return json({ ok: false, mismatch: true }, 400);
  }
  return json({ ok: true, added: saved.length, errors: [] });
}
