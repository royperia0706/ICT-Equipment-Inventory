import { formatControl } from "@/lib/computer-fields";
import { inScope } from "@/lib/access";
import { firestore } from "@/lib/firebase";
import { internetSeries, internetStatuses, wifiCapabilities } from "@/lib/internet-fields";

const required = [
  "internetType",
  "provider",
  "connectionType",
  "speed",
  "wifiCapability",
  "location",
  "yearSubscribed",
  "monthlySubscription",
  "ipAddress",
  "status",
  "province",
  "municipality",
  "office",
];

function text(value) {
  return String(value ?? "").trim();
}

function money(value) {
  const raw = text(value).replace(/^₱\s*/, "");
  if (!raw) return "";
  return `₱${raw}`;
}

function buildRecord(input, prefix, count) {
  return {
    id: formatControl(prefix, count),
    controlNumber: formatControl(prefix, count),
    internetType: text(input.internetType),
    provider: text(input.provider),
    connectionType: text(input.connectionType),
    speed: text(input.speed),
    wifiCapability: text(input.wifiCapability),
    location: text(input.location),
    yearSubscribed: text(input.yearSubscribed),
    monthlySubscription: money(input.monthlySubscription),
    ipAddress: text(input.ipAddress),
    status: text(input.status),
    region: text(input.region),
    province: text(input.province),
    municipality: text(input.municipality),
    office: text(input.office),
    unit: text(input.unit || input.office),
    kind: "Internet",
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
  if (!internetStatuses.includes(text(input.status))) throw new Error("Fill in the required fields.");
  if (!wifiCapabilities.includes(text(input.wifiCapability))) throw new Error("Fill in the required fields.");
  if (!money(input.monthlySubscription).replace(/^₱/, "")) throw new Error("Fill in the required fields.");
}

function database() {
  const db = firestore();
  if (!db) throw new Error("The equipment database is not connected.");
  return db;
}

export async function listInternets(user) {
  const snap = await database().collection("internets").get();
  return snap.docs
    .map((doc) => doc.data())
    .filter((row) => !user || inScope(user, row))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getInternet(id) {
  const snap = await database().collection("internets").doc(id).get();
  return snap.exists ? snap.data() : null;
}

export async function previewInternetNumber() {
  const snap = await database().collection("meta").doc("internet-sequences").get();
  const sequences = snap.exists ? snap.data() : {};
  return formatControl(internetSeries, (sequences[internetSeries] || 0) + 1);
}

export async function addInternet(input) {
  requireFields(input);
  const db = database();
  const seqRef = db.collection("meta").doc("internet-sequences");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(seqRef);
    const sequences = snap.exists ? snap.data() : {};
    const count = (sequences[internetSeries] || 0) + 1;
    const next = buildRecord(input, internetSeries, count);
    tx.set(seqRef, { [internetSeries]: count }, { merge: true });
    tx.set(db.collection("internets").doc(next.id), next);
    return next;
  });
}

export async function updateInternet(id, input, options = {}) {
  if (!options.skipRequired) requireFields(input);
  const ref = database().collection("internets").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Internet record not found.");
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

export async function markInternetPending(id, fields) {
  const ref = database().collection("internets").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Internet record not found.");
    error.status = 404;
    throw error;
  }
  await ref.set({ ...fields, updatedAt: Date.now() }, { merge: true });
  return { ...snap.data(), ...fields };
}

export async function deleteInternet(id) {
  const ref = database().collection("internets").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Internet record not found.");
    error.status = 404;
    throw error;
  }
  await ref.delete();
}
