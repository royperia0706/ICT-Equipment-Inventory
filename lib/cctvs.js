import { inScope } from "@/lib/access";
import { cctvConnectionTypes, cctvNightVisionOptions, cctvSeries } from "@/lib/cctv-fields";
import { conditionsByStatus, formatControl, statuses } from "@/lib/computer-fields";
import { entryDateStamp, preserveEntryDate, withEntryDate } from "@/lib/entry-date";
import { firestore } from "@/lib/firebase";

const required = [
  "installationLocation",
  "cctvType",
  "cctvBrand",
  "numberOfCameras",
  "storageSize",
  "monitorSize",
  "resolution",
  "nightVision",
  "connectionType",
  "dateAcquired",
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
  const connectionType = text(input.connectionType);
  return {
    id: formatControl(prefix, count),
    controlNumber: formatControl(prefix, count),
    installationLocation: text(input.installationLocation),
    cctvType: text(input.cctvType),
    cctvBrand: text(input.cctvBrand),
    numberOfCameras: text(input.numberOfCameras),
    storageSize: text(input.storageSize),
    monitorSize: text(input.monitorSize),
    resolution: text(input.resolution),
    nightVision: text(input.nightVision),
    connectionType,
    networkProvider: connectionType === "Mobile Data" ? text(input.networkProvider) : "",
    dateAcquired: text(input.dateAcquired),
    acquisitionCost: text(input.acquisitionCost),
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
    kind: "CCTV",
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
  if (!cctvNightVisionOptions.includes(text(input.nightVision))) throw new Error("Fill in the required fields.");
  if (!cctvConnectionTypes.includes(text(input.connectionType))) throw new Error("Fill in the required fields.");
  if (text(input.connectionType) === "Mobile Data" && !text(input.networkProvider)) {
    throw new Error("Enter the network provider.");
  }
  if (!/^\d+$/.test(text(input.numberOfCameras)) || Number(input.numberOfCameras) < 1) {
    throw new Error("Enter a valid number of cameras.");
  }
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

export async function listCctvs(user) {
  const snap = await database().collection("cctvs").get();
  return snap.docs
    .map((doc) => doc.data())
    .filter((row) => !user || inScope(user, row))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .map(withEntryDate);
}

export async function getCctv(id) {
  const snap = await database().collection("cctvs").doc(id).get();
  return snap.exists ? snap.data() : null;
}

export async function previewCctvNumber() {
  const snap = await database().collection("meta").doc("cctv-sequences").get();
  const sequences = snap.exists ? snap.data() : {};
  return formatControl(cctvSeries, (sequences[cctvSeries] || 0) + 1);
}

export async function addCctv(input) {
  requireFields(input);
  const db = database();
  const seqRef = db.collection("meta").doc("cctv-sequences");
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(seqRef);
    const sequences = snap.exists ? snap.data() : {};
    const count = (sequences[cctvSeries] || 0) + 1;
    const next = buildRecord(input, cctvSeries, count);
    transaction.set(seqRef, { [cctvSeries]: count }, { merge: true });
    transaction.set(db.collection("cctvs").doc(next.id), next);
    return next;
  });
}

export async function updateCctv(id, input, options = {}) {
  if (!options.skipRequired) requireFields(input);
  const ref = database().collection("cctvs").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("CCTV record not found.");
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

export async function markCctvPending(id, fields) {
  const ref = database().collection("cctvs").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("CCTV record not found.");
    error.status = 404;
    throw error;
  }
  await ref.set({ ...fields, updatedAt: Date.now() }, { merge: true });
  return { ...snap.data(), ...fields };
}

export async function deleteCctv(id) {
  const ref = database().collection("cctvs").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("CCTV record not found.");
    error.status = 404;
    throw error;
  }
  await ref.delete();
}
