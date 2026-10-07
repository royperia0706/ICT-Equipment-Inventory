import { computerSeries, conditionsByStatus, formatControl, storageLabel } from "@/lib/computer-fields";
import { entryDateStamp, preserveEntryDate, withEntryDate } from "@/lib/entry-date";
import { inScope } from "@/lib/access";
import { firestore } from "@/lib/firebase";

const required = [
  "equipmentType",
  "computerName",
  "display",
  "size",
  "connectivity",
  "brand",
  "monitorBrand",
  "dateManufacture",
  "serialNumber",
  "processor",
  "frequency",
  "ram",
  "gpu",
  "videoCapacity",
  "os",
  "osStatus",
  "antivirus",
  "antivirusStatus",
  "officeSoftware",
  "officeStatus",
  "province",
  "municipality",
  "office",
  "section",
  "specificEndUser",
  "assignmentStatus",
  "status",
  "modeOfAcquisition",
  "dedicatedUse",
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
    brand: text(input.equipmentType) === "Laptop" ? "N/A" : text(input.brand),
    monitorBrand: text(input.equipmentType) === "Laptop" ? "N/A" : text(input.monitorBrand),
    dateManufacture: text(input.dateManufacture),
    model: text(input.model),
    serialNumber: text(input.serialNumber),
    processor: text(input.processor),
    frequency: text(input.frequency),
    numberOfCores: text(input.numberOfCores),
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
    assignmentStatus: text(input.assignmentStatus),
    status: text(input.status),
    condition: (conditionsByStatus[text(input.status)] || []).includes(text(input.condition)) ? text(input.condition) : "",
    targetFixDate: text(input.status) === "Under Maintenance" ? text(input.targetFixDate) : "",
    problemDetail: text(input.status) === "Under Maintenance" || text(input.status) === "Unserviceable" ? text(input.problemDetail) : "",
    dateAssessed: text(input.status) === "BER" || text(input.status) === "Unserviceable" ? text(input.dateAssessed) : "",
    reasonForBer: text(input.status) === "BER" ? text(input.reasonForBer) : "",
    yearMissing: text(input.status) === "Missing" ? text(input.yearMissing) : "",
    modeOfAcquisition: text(input.modeOfAcquisition),
    dedicatedUse: dedicated,
    dateAcquired: text(input.dateAcquired),
    acquisitionCost: text(input.acquisitionCost),
    remarks: text(input.remarks),
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
  const laptop = text(input.equipmentType) === "Laptop";
  for (const key of required) {
    if (laptop && (key === "brand" || key === "monitorBrand")) continue;
    if (!text(input[key])) throw new Error("Fill in the required fields.");
  }
  if (text(input.ssdValue) === "" || text(input.hddValue) === "") throw new Error("Fill in the required fields.");
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
  if (text(input.dedicatedUse) === "Others" && !text(input.dedicatedUseOthers)) {
    throw new Error("Fill in the required fields.");
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
  return byNewest(rows).map(withEntryDate);
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

export async function updateComputer(id, input, options = {}) {
  if (!options.skipRequired) requireFields(input);
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
    entryDate: preserveEntryDate(current),
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
