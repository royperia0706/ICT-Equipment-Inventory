import { inScope } from "@/lib/access";
import { conditionsByStatus, formatControl, statuses } from "@/lib/computer-fields";
import { droneAcquisitionTypes, droneSeries, droneYesNoOptions } from "@/lib/drone-fields";
import { entryDateStamp, preserveEntryDate, withEntryDate } from "@/lib/entry-date";
import { firestore } from "@/lib/firebase";

const required = [
  "droneType",
  "brand",
  "cameraResolution",
  "flightTime",
  "maximumRange",
  "maximumSpeed",
  "gps",
  "obstacleAvoidance",
  "acquisitionType",
  "dateAcquired",
  "endUser",
  "trained",
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
    droneType: text(input.droneType),
    brand: text(input.brand),
    cameraResolution: text(input.cameraResolution),
    flightTime: text(input.flightTime),
    maximumRange: text(input.maximumRange),
    maximumSpeed: text(input.maximumSpeed),
    gps: text(input.gps),
    obstacleAvoidance: text(input.obstacleAvoidance),
    acquisitionType: text(input.acquisitionType),
    dateAcquired: text(input.dateAcquired),
    acquisitionCost: text(input.acquisitionCost),
    endUser: text(input.endUser),
    trained: text(input.trained),
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
    kind: "Drone",
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
  if (!droneYesNoOptions.includes(text(input.gps))) throw new Error("Fill in the required fields.");
  if (!droneYesNoOptions.includes(text(input.obstacleAvoidance))) throw new Error("Fill in the required fields.");
  if (!droneYesNoOptions.includes(text(input.trained))) throw new Error("Fill in the required fields.");
  if (!droneAcquisitionTypes.includes(text(input.acquisitionType))) throw new Error("Fill in the required fields.");
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

export async function listDrones(user) {
  const snap = await database().collection("drones").get();
  return snap.docs
    .map((doc) => doc.data())
    .filter((row) => !user || inScope(user, row))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .map(withEntryDate);
}

export async function getDrone(id) {
  const snap = await database().collection("drones").doc(id).get();
  return snap.exists ? snap.data() : null;
}

export async function previewDroneNumber() {
  const snap = await database().collection("meta").doc("drone-sequences").get();
  const sequences = snap.exists ? snap.data() : {};
  return formatControl(droneSeries, (sequences[droneSeries] || 0) + 1);
}

export async function addDrone(input) {
  requireFields(input);
  const db = database();
  const seqRef = db.collection("meta").doc("drone-sequences");
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(seqRef);
    const sequences = snap.exists ? snap.data() : {};
    const count = (sequences[droneSeries] || 0) + 1;
    const next = buildRecord(input, droneSeries, count);
    transaction.set(seqRef, { [droneSeries]: count }, { merge: true });
    transaction.set(db.collection("drones").doc(next.id), next);
    return next;
  });
}

export async function updateDrone(id, input, options = {}) {
  if (!options.skipRequired) requireFields(input);
  const ref = database().collection("drones").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Drone record not found.");
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

export async function markDronePending(id, fields) {
  const ref = database().collection("drones").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Drone record not found.");
    error.status = 404;
    throw error;
  }
  await ref.set({ ...fields, updatedAt: Date.now() }, { merge: true });
  return { ...snap.data(), ...fields };
}

export async function deleteDrone(id) {
  const ref = database().collection("drones").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Drone record not found.");
    error.status = 404;
    throw error;
  }
  await ref.delete();
}
