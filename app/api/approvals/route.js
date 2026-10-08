import { currentUser } from "@/lib/guard";
import { decideEquipment } from "@/lib/review";
import { json } from "@/lib/session";

async function actor() {
  return currentUser();
}

export async function POST(request) {
  const user = await actor();
  if (!user) return json({ ok: false, error: "Sign in first." }, 401);
  const body = await request.json().catch(() => ({}));
  const kind = ["printer", "internet", "display", "cellphone", "cctv", "drone", "radio", "storage"].includes(body.equipment) ? body.equipment : "computer";
  if (!body.id || (body.decision !== "approve" && body.decision !== "reject")) {
    return json({ ok: false, error: "Choose approve or reject." }, 400);
  }
  try {
    const record = await decideEquipment(kind, user, body.id, body.decision, body.target);
    return json({ ok: true, record, removed: !record });
  } catch (error) {
    return json({ ok: false, error: error.message || "Could not update the request." }, error.status || 400);
  }
}
