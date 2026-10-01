import { computerSeries, formatControl, storageLabel } from "@/lib/computer-fields";
import { inScope } from "@/lib/access";
import { firestore } from "@/lib/firebase";

const required = [
  "equipmentType",
  "brand",
  "model",
  "serialNumber",
  "province",
  "municipality",
  "office",
  "assignmentStatus",
  "status",
  "condition",
  "modeOfAcquisition",
  "dateAcquired",
];

function text(value) {
  return String(value ?? "").trim();
}

function buildRecord(input, prefix, count) {
  const dedicated = text(input.dedicatedUse) === "Others"
    ? text(input.dedicatedUseOthers) || "Others"
    : text(input.dedicatedUse) || "None";

  return {
    id: formatControl(prefix, count),
    controlNumber: formatControl(prefix, count),
    equipmentType: text(input.equipmentType),
    computerName: text(input.computerName),
    display: text(input.display),
    size: text(input.size),
    connectivity: text(input.connectivity),
    brand: text(input.brand),
    monitorBrand: text(input.monitorBrand),
    model: text(input.model),
    serialNumber: text(input.serialNumber),
    processor: text(input.processor),
    speed: text(input.speed),
    frequency: text(input.frequency),
    ram: text(input.ram) ? `${text(input.ram)} GB` : "",
    ssdStorage: storageLabel(input.ssdValue, input.ssdUnit),
    hddStorage: storageLabel(input.hddValue, input.hddUnit),
    gpu: text(input.gpu),
    videoCapacity: text(input.videoCapacity),
    os: text(input.os),
    osStatus: text(input.osStatus),
    antivirus: text(input.antivirus),
    antivirusStatus: text(input.antivirusStatus),
    officeSoftware: text(input.officeSoftware),
    officeStatus: text(input.officeStatus),
    region: text(input.region),
    province: text(input.province),
    municipality: text(input.municipality),
    office: text(input.office),
    unit: text(input.unit || input.office),
    kind: "Computer",
    section: text(input.section),
    specificEndUser: text(input.specificEndUser),
    accountablePerson: text(input.accountablePerson),
    assignmentStatus: text(input.assignmentStatus),
    status: text(input.status),
    condition: text(input.condition),
    modeOfAcquisition: text(input.modeOfAcquisition),
    dedicatedUse: dedicated,
    dateAcquired: text(input.dateAcquired),
    acquisitionCost: text(input.acquisitionCost),
    remarks: text(input.remarks),
    pendingAction: text(input.pendingAction),
    pendingStatus: text(input.pendingStatus),
    pendingBy: text(input.pendingBy),
    previousStatus: text(input.previousStatus),
    pendingPayload: input.pendingPayload && typeof input.pendingPayload === "object" ? input.pendingPayload : null,
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

function byNewest(rows) {
  return rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function listComputers(user) {
  const snap = await database().collection("computers").get();
  const rows = snap.docs.map((doc) => doc.data()).filter((row) => !user || inScope(user, row));
  return byNewest(rows);
}

export async function getComputer(id) {
  const snap = await database().collection("computers").doc(id).get();
  return snap.exists ? snap.data() : null;
}

export async function previewControlNumber() {
  const snap = await database().collection("meta").doc("computer-sequences").get();
  const sequences = snap.exists ? snap.data() : {};
  return formatControl(computerSeries, (sequences[computerSeries] || 0) + 1);
}

export async function addComputer(input) {
  requireFields(input);
  const db = database();
  const seqRef = db.collection("meta").doc("computer-sequences");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(seqRef);
    const sequences = snap.exists ? snap.data() : {};
    const count = (sequences[computerSeries] || 0) + 1;
    const next = buildRecord(input, computerSeries, count);
    tx.set(seqRef, { [computerSeries]: count }, { merge: true });
    tx.set(db.collection("computers").doc(next.id), next);
    return next;
  });
}

export async function updateComputer(id, input) {
  requireFields(input);
  const db = database();
  const ref = db.collection("computers").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Computer record not found.");
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

export async function markComputerPending(id, fields) {
  const ref = database().collection("computers").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Computer record not found.");
    error.status = 404;
    throw error;
  }
  await ref.set({ ...fields, updatedAt: Date.now() }, { merge: true });
  return { ...snap.data(), ...fields };
}

export async function deleteComputer(id) {
  const db = database();
  const ref = db.collection("computers").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Computer record not found.");
    error.status = 404;
    throw error;
  }
  await ref.delete();
}
