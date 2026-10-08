import { cellphoneColumns } from "@/lib/cellphone-fields";
import { computerColumns } from "@/lib/computer-fields";
import { cctvColumns } from "@/lib/cctv-fields";
import { displayColumns } from "@/lib/display-fields";
import { droneColumns } from "@/lib/drone-fields";
import { internetColumns } from "@/lib/internet-fields";
import { printerColumns } from "@/lib/printer-fields";
import { radioColumns } from "@/lib/radio-fields";
import { storageColumns } from "@/lib/storage-fields";

const columnsByKind = {
  Computer: computerColumns,
  Printer: printerColumns,
  Internet: internetColumns,
  Display: displayColumns,
  Cellphone: cellphoneColumns,
  CCTV: cctvColumns,
  Drone: droneColumns,
  "Handheld Radio": radioColumns,
  Storage: storageColumns,
};

const metaKeys = new Set(["id", "createdAt", "updatedAt", "pendingAction", "pendingStatus", "pendingBy", "previousStatus", "pendingPayload", "editGranted", "editRequest", "editRequestedBy"]);

export function changedFields(record) {
  const payload = record?.pendingPayload;
  if (!payload || (record.pendingAction !== "edit" && record.pendingAction !== "ber")) return [];
  const labels = { status: "Status" };
  for (const [key, label] of columnsByKind[record.kind] || []) labels[key] = label;
  const changes = [];
  for (const key of Object.keys(payload)) {
    if (metaKeys.has(key) || payload[key] === undefined || typeof payload[key] === "object") continue;
    if (!(key in record) && key !== "status") continue;
    const before = key === "status" ? (record.previousStatus || "") : (record[key] ?? "");
    const after = payload[key] ?? "";
    if (String(before) !== String(after)) changes.push({ key, label: labels[key] || key, before: before || "—", after: after || "—" });
  }
  return changes;
}
