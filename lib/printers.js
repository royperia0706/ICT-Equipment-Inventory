import { conditionsByStatus, formatControl, printerSeries } from "@/lib/computer-fields";
import { inScope } from "@/lib/access";
import { firestore } from "@/lib/firebase";

const required = [
  "printerType",
  "brand",
  "model",
  "yearModel",
  "serialNumber",
  "connectionType",
  "tonerInkType",
  "colorCapability",
  "province",
  "municipality",
  "office",
  "section",
  "accountablePerson",
  "assignedUser",
  "status",
  "modeOfAcquisition",
  "dateAcquired",
];

function text(value) {
  return String(value ?? "").trim();
}

function buildRecord(input, prefix, count) {
  return {
    id: formatControl(prefix, count),
    controlNumber: formatControl(prefix, count),
    printerType: text(input.printerType),
    brand: text(input.brand),
    model: text(input.model),
    yearModel: text(input.yearModel),
    serialNumber: text(input.serialNumber),
    connectionType: text(input.connectionType),
    tonerInkType: text(input.tonerInkType),
    colorCapability: text(input.colorCapability),
    region: text(input.region),
    province: text(input.province),
    municipality: text(input.municipality),
    office: text(input.office),
    unit: text(input.unit || input.office),
    section: text(input.section),
    accountablePerson: text(input.accountablePerson),
    assignedUser: text(input.assignedUser),
    status: text(input.status),
    condition: (conditionsByStatus[text(input.status)] || []).includes(text(input.condition)) ? text(input.condition) : "",
    targetFixDate: text(input.status) === "Under Maintenance" ? text(input.targetFixDate) : "",
    problemDetail: text(input.status) === "Under Maintenance" || text(input.status) === "Unserviceable" ? text(input.problemDetail) : "",
    dateAssessed: text(input.status) === "BER" || text(input.status) === "Unserviceable" ? text(input.dateAssessed) : "",
    reasonForBer: text(input.status) === "BER" ? text(input.reasonForBer) : "",
    yearMissing: text(input.status) === "Missing" ? text(input.yearMissing) : "",
    modeOfAcquisition: text(input.modeOfAcquisition),
    dateAcquired: text(input.dateAcquired),
    acquisitionCost: text(input.acquisitionCost),
    remarks: text(input.remarks),
    kind: "Printer",
    pendingAction: text(input.pendingAction),
    pendingStatus: text(input.pendingStatus),
    pendingBy: text(input.pendingBy),
    pendingByRole: text(input.pendingByRole),
    pendingStage: text(input.pendingStage),
    previousStatus: text(input.previousStatus),
    pendingPayload: input.pendingPayload && typeof input.pendingPayload === "object" ? input.pendingPayload : null,
    createdAt: Date.now(),
  };
}

function requireFields(input) {
  for (const key of required) {
    if (!text(input[key])) throw new Error("Fill in the required fields.");
  }
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

export async function listPrinters(user) {
  const snap = await database().collection("printers").get();
  return snap.docs
    .map((doc) => doc.data())
    .filter((row) => !user || inScope(user, row))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getPrinter(id) {
  const snap = await database().collection("printers").doc(id).get();
  return snap.exists ? snap.data() : null;
}

export async function previewPrinterNumber() {
  const snap = await database().collection("meta").doc("printer-sequences").get();
  const sequences = snap.exists ? snap.data() : {};
  return formatControl(printerSeries, (sequences[printerSeries] || 0) + 1);
}

export async function addPrinter(input) {
  requireFields(input);
  const db = database();
  const seqRef = db.collection("meta").doc("printer-sequences");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(seqRef);
    const sequences = snap.exists ? snap.data() : {};
    const count = (sequences[printerSeries] || 0) + 1;
    const next = buildRecord(input, printerSeries, count);
    tx.set(seqRef, { [printerSeries]: count }, { merge: true });
    tx.set(db.collection("printers").doc(next.id), next);
    return next;
  });
}

export async function updatePrinter(id, input) {
  requireFields(input);
  const ref = database().collection("printers").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Printer record not found.");
    error.status = 404;
    throw error;
  }
  const current = snap.data();
  const next = {
    ...buildRecord(input, "", 0),
    id: current.id,
    controlNumber: current.controlNumber,
    createdAt: current.createdAt,
    updatedAt: Date.now(),
  };
  await ref.set(next);
  return next;
}

export async function markPrinterPending(id, fields) {
  const ref = database().collection("printers").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Printer record not found.");
    error.status = 404;
    throw error;
  }
  await ref.set({ ...fields, updatedAt: Date.now() }, { merge: true });
  return { ...snap.data(), ...fields };
}

export async function deletePrinter(id) {
  const ref = database().collection("printers").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Printer record not found.");
    error.status = 404;
    throw error;
  }
  await ref.delete();
}
