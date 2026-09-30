import { controlPrefix, formatControl } from "@/lib/computer-fields";
import { inScope } from "@/lib/access";
import { firestore } from "@/lib/firebase";

const required = [
  "printerType",
  "brand",
  "model",
  "serialNumber",
  "connectionType",
  "tonerInkType",
  "colorCapability",
  "province",
  "municipality",
  "office",
  "accountablePerson",
  "status",
  "condition",
  "modeOfAcquisition",
  "dateAcquired",
];

function text(value) {
  return String(value ?? "").trim();
}

function printerPrefix(municipality, office) {
  return `${controlPrefix(municipality, office)}_PRT`;
}

function buildRecord(input, prefix, count) {
  return {
    id: `${prefix}-${count}`,
    controlNumber: formatControl(prefix, count),
    printerType: text(input.printerType),
    brand: text(input.brand),
    model: text(input.model),
    serialNumber: text(input.serialNumber),
    assetTag: text(input.assetTag),
    connectionType: text(input.connectionType),
    ipAddress: text(input.ipAddress),
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
    condition: text(input.condition),
    modeOfAcquisition: text(input.modeOfAcquisition),
    dateAcquired: text(input.dateAcquired),
    acquisitionCost: text(input.acquisitionCost),
    remarks: text(input.remarks),
    kind: "Printer",
    createdAt: Date.now(),
  };
}

function requireFields(input) {
  for (const key of required) {
    if (!text(input[key])) throw new Error("Fill in the required fields.");
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

export async function previewPrinterNumber(municipality, office) {
  const prefix = printerPrefix(municipality, office);
  const snap = await database().collection("meta").doc("printer-sequences").get();
  const sequences = snap.exists ? snap.data() : {};
  return formatControl(prefix, (sequences[prefix] || 0) + 1);
}

export async function addPrinter(input) {
  requireFields(input);
  const prefix = printerPrefix(text(input.municipality), text(input.office));
  const db = database();
  const seqRef = db.collection("meta").doc("printer-sequences");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(seqRef);
    const sequences = snap.exists ? snap.data() : {};
    const count = (sequences[prefix] || 0) + 1;
    const next = buildRecord(input, prefix, count);
    tx.set(seqRef, { [prefix]: count }, { merge: true });
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
