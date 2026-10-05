import { firestore } from "@/lib/firebase";

function database() {
  const db = firestore();
  if (!db) throw new Error("The activity log is not connected.");
  return db;
}

export async function recordActivity(entry) {
  try {
    const db = firestore();
    if (!db) return;
    const id = entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.collection("activityLogs").doc(id).set({
      id,
      at: entry.at || Date.now(),
      username: entry.username || "",
      action: entry.action || "",
      detail: entry.detail || "",
      kind: entry.kind || "",
      controlNumber: entry.controlNumber || "",
      unit: entry.unit || "",
      province: entry.province || "",
      municipality: entry.municipality || "",
    });
  } catch {
    // A failed log must not block the action that was saved.
  }
}

function canSee(user, row) {
  if (!user) return false;
  if (user.role === "super-admin") return true;
  if (row.unit && row.unit !== user.unit) return false;
  if (user.role === "assistant-admin") return true;
  if (row.municipality && row.municipality !== user.station) return false;
  return true;
}

export async function listActivity(user, records = []) {
  const { readCache } = await import("@/lib/read-cache");
  const rows = await readCache("activity-logs", 60 * 1000, async () => {
    const snap = await database().collection("activityLogs").get();
    return snap.docs.map((doc) => doc.data());
  });
  const known = new Set(rows.map((row) => row.id));
  const added = [];
  for (const record of records) {
    const id = record.controlNumber || record.id;
    if (!id) continue;
    const place = {
      kind: record.kind || "",
      controlNumber: id,
      unit: record.unit || record.office || "",
      province: record.province || "",
      municipality: record.municipality || "",
    };
    const addId = `history-add-${id}`;
    if (!known.has(addId)) {
      const entry = {
        id: addId,
        at: record.createdAt || record.updatedAt || Date.now(),
        username: "",
        action: "Added",
        detail: `${record.kind || "Equipment"} ${id} was added`,
        ...place,
      };
      added.push(entry);
      known.add(addId);
    }
    if (record.updatedAt && record.createdAt && record.updatedAt - record.createdAt > 2000) {
      const updateId = `history-update-${id}`;
      if (!known.has(updateId)) {
        added.push({
          id: updateId,
          at: record.updatedAt,
          username: "",
          action: "Updated",
          detail: `${record.kind || "Equipment"} ${id} was updated`,
          ...place,
        });
        known.add(updateId);
      }
    }
  }
  return [...rows, ...added]
    .filter((row) => canSee(user, row))
    .sort((a, b) => (b.at || 0) - (a.at || 0));
}
