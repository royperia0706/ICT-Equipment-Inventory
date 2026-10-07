import { conditionsByStatus, formatControl, statuses } from "@/lib/computer-fields";
import { entryDateStamp, preserveEntryDate, withEntryDate } from "@/lib/entry-date";
import { inScope } from "@/lib/access";
import { firestore } from "@/lib/firebase";
import { cellphoneAcquisitions, cellphoneSeries, cellphoneTypes } from "@/lib/cellphone-fields";

const required = [
  "cellphoneType",
  "brand",
  "operatingSystem",
  "serialNumber",
  "simNumber",
  "mobileNetwork",
  "storageCapacity",
  "ram",
  "yearModel",
  "modeOfAcquisition",
  "issuedTo",
  "status",
  "province",
  "municipality",
  "office",
];

function text(value) {
  return String(value ?? "").trim();
}

function buildRecord(input, prefix, count) {
  const status = text(input.status);
  return {
    id: formatControl(prefix, count),
    controlNumber: formatControl(prefix, count),
    cellphoneType: text(input.cellphoneType),
    brand: text(input.brand),
    operatingSystem: text(input.operatingSystem),
    serialNumber: text(input.serialNumber),
    simNumber: text(input.simNumber),
    mobileNetwork: text(input.mobileNetwork),
    storageCapacity: text(input.storageCapacity),
    ram: text(input.ram),
    yearModel: text(input.yearModel),
    dateAcquired: text(input.dateAcquired),
    acquisitionCost: text(input.acquisitionCost),
    modeOfAcquisition: text(input.modeOfAcquisition),
    issuedTo: text(input.issuedTo),
    status,
    condition: (conditionsByStatus[status] || []).includes(text(input.condition)) ? text(input.condition) : "",
    targetFixDate: status === "Under Maintenance" ? text(input.targetFixDate) : "",
    problemDetail: status === "Under Maintenance" || status === "Unserviceable" ? text(input.problemDetail) : "",
    dateAssessed: status === "BER" || status === "Unserviceable" ? text(input.dateAssessed) : "",
    reasonForBer: status === "BER" ? text(input.reasonForBer) : "",
    yearMissing: status === "Missing" ? text(input.yearMissing) : "",
    remarks: text(input.remarks),
    region: text(input.region),
    province: text(input.province),
    municipality: text(input.municipality),
    office: text(input.office),
    unit: text(input.unit || input.office),
    kind: "Cellphone",
    pendingAction: text(input.pendingAction),
    pendingStatus: text(input.pendingStatus),
    pendingBy: text(input.pendingBy),
    pendingByRole: text(input.pendingByRole),
    pendingStage: text(input.pendingStage),
    previousStatus: text(input.previousStatus),
    pendingPayload: input.pendingPayload && typeof input.pendingPayload === "object" ? input.pendingPayload : null,
    entryDate: entryDateStamp(),
    createdAt: Date.now(),
  };
}

function requireFields(input) {
  for (const key of required) {
    if (!text(input[key])) throw new Error("Fill in the required fields.");
  }
  if (!cellphoneTypes.includes(text(input.cellphoneType))) throw new Error("Fill in the required fields.");
  if (!cellphoneAcquisitions.includes(text(input.modeOfAcquisition))) throw new Error("Fill in the required fields.");
  if (!statuses.includes(text(input.status))) throw new Error("Fill in the required fields.");
  const status = text(input.status);
  const conditionChoices = conditionsByStatus[status] || [];
  if (conditionChoices.length && !conditionChoices.includes(text(input.condition))) {
    throw new Error("Fill in the required fields.");
  }
  if (status === "Under Maintenance" && (!text(input.targetFixDate) || !text(input.problemDetail))) {
    throw new Error("Fill in the required fields.");
  }
  if (status === "Unserviceable" && (!text(input.dateAssessed) || !text(input.problemDetail))) {
    throw new Error("Fill in the required fields.");
  }
  if (status === "BER" && (!text(input.dateAssessed) || !text(input.reasonForBer))) {
    throw new Error("Fill in the required fields.");
  }
  if (status === "Missing" && (!text(input.yearMissing) || !text(input.remarks))) {
    throw new Error("Fill in the required fields.");
  }
}

function database() {
  const db = firestore();
  if (!db) throw new Error("The equipment database is not connected.");
  return db;
}

export async function listCellphones(user) {
  const snap = await database().collection("cellphones").get();
  return snap.docs
    .map((doc) => doc.data())
    .filter((row) => !user || inScope(user, row))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .map(withEntryDate);
}

export async function getCellphone(id) {
  const snap = await database().collection("cellphones").doc(id).get();
  return snap.exists ? snap.data() : null;
}

export async function previewCellphoneNumber() {
  const snap = await database().collection("meta").doc("cellphone-sequences").get();
  const sequences = snap.exists ? snap.data() : {};
  return formatControl(cellphoneSeries, (sequences[cellphoneSeries] || 0) + 1);
}

export async function addCellphone(input) {
  requireFields(input);
  const db = database();
  const seqRef = db.collection("meta").doc("cellphone-sequences");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(seqRef);
    const sequences = snap.exists ? snap.data() : {};
    const count = (sequences[cellphoneSeries] || 0) + 1;
    const next = buildRecord(input, cellphoneSeries, count);
    tx.set(seqRef, { [cellphoneSeries]: count }, { merge: true });
    tx.set(db.collection("cellphones").doc(next.id), next);
    return next;
  });
}

export async function updateCellphone(id, input, options = {}) {
  if (!options.skipRequired) requireFields(input);
  const ref = database().collection("cellphones").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Cellphone record not found.");
    error.status = 404;
    throw error;
  }
  const current = snap.data();
  const next = {
    ...buildRecord(input, "", 0),
    id: current.id,
    controlNumber: current.controlNumber,
    entryDate: preserveEntryDate(current),
    createdAt: current.createdAt,
    updatedAt: Date.now(),
  };
  await ref.set(next);
  return next;
}

export async function markCellphonePending(id, fields) {
  const ref = database().collection("cellphones").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Cellphone record not found.");
    error.status = 404;
    throw error;
  }
  await ref.set({ ...fields, updatedAt: Date.now() }, { merge: true });
  return { ...snap.data(), ...fields };
}

export async function deleteCellphone(id) {
  const ref = database().collection("cellphones").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Cellphone record not found.");
    error.status = 404;
    throw error;
  }
  await ref.delete();
}
