import { addComputer, deleteComputer, getComputer, markComputerPending, updateComputer } from "@/lib/computers";
import { addCellphone, deleteCellphone, getCellphone, markCellphonePending, updateCellphone } from "@/lib/cellphones";
import { addDisplay, deleteDisplay, getDisplay, markDisplayPending, updateDisplay } from "@/lib/displays";
import { addInternet, deleteInternet, getInternet, markInternetPending, updateInternet } from "@/lib/internets";
import { addPrinter, deletePrinter, getPrinter, markPrinterPending, updatePrinter } from "@/lib/printers";
import { addRadio, deleteRadio, getRadio, markRadioPending, updateRadio } from "@/lib/radios";
import { addStorage, deleteStorage, getStorage, markStoragePending, updateStorage } from "@/lib/storages";

const stores = {
  computer: { add: addComputer, update: updateComputer, remove: deleteComputer, get: getComputer, mark: markComputerPending },
  printer: { add: addPrinter, update: updatePrinter, remove: deletePrinter, get: getPrinter, mark: markPrinterPending },
  internet: { add: addInternet, update: updateInternet, remove: deleteInternet, get: getInternet, mark: markInternetPending },
  display: { add: addDisplay, update: updateDisplay, remove: deleteDisplay, get: getDisplay, mark: markDisplayPending },
  cellphone: { add: addCellphone, update: updateCellphone, remove: deleteCellphone, get: getCellphone, mark: markCellphonePending },
  radio: { add: addRadio, update: updateRadio, remove: deleteRadio, get: getRadio, mark: markRadioPending },
  storage: { add: addStorage, update: updateStorage, remove: deleteStorage, get: getStorage, mark: markStoragePending },
};

const statusFields = {
  computer: ["status", "condition", "targetFixDate", "problemDetail", "dateAssessed", "reasonForBer", "yearMissing", "remarks"],
  printer: ["status", "condition", "targetFixDate", "problemDetail", "dateAssessed", "reasonForBer", "yearMissing", "remarks"],
  internet: ["status"],
  display: ["status", "condition", "targetFixDate", "problemDetail", "dateAssessed", "reasonForBer", "yearMissing", "remarks"],
  cellphone: ["status", "condition", "targetFixDate", "problemDetail", "dateAssessed", "reasonForBer", "yearMissing", "remarks"],
  radio: ["status", "condition", "targetFixDate", "problemDetail", "dateAssessed", "reasonForBer", "yearMissing", "remarks"],
  storage: ["status", "condition", "targetFixDate", "problemDetail", "dateAssessed", "reasonForBer", "yearMissing", "remarks"],
};

const metaKeys = new Set(["id", "createdAt", "updatedAt", "pendingAction", "pendingStatus", "pendingBy", "previousStatus", "pendingPayload", "editGranted", "editRequest", "editRequestedBy"]);

function inputForSave(kind, user, input, existing) {
  const next = { ...input };
  delete next.requestBasicEdit;
  delete next.requestEditAccess;
  if (!existing || user?.role === "super-admin" || existing.editGranted) return next;
  const allowed = new Set(statusFields[kind] || ["status"]);
  for (const key of Object.keys(existing)) {
    if (allowed.has(key) || metaKeys.has(key)) continue;
    next[key] = existing[key];
  }
  return next;
}

const clearPending = {
  pendingAction: "",
  pendingStatus: "",
  pendingBy: "",
  previousStatus: "",
  pendingPayload: null,
};

export function berLabel(input) {
  const values = [input?.status, input?.condition];
  for (const value of values) {
    const text = String(value || "").trim();
    if (/^for\s*ber$/i.test(text)) return "For BER";
    if (/^ber$/i.test(text)) return "BER";
  }
  return "";
}

export function canDecide(user, record) {
  if (!user || !record) return false;
  if (user.role !== "super-admin") return false;
  return Boolean(record.pendingAction) || record.editRequest === "pending";
}

function plainPayload(input) {
  const payload = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (value === undefined || typeof value === "function" || typeof value === "object" || metaKeys.has(key)) continue;
    payload[key] = value;
  }
  return payload;
}

function messageFor(action) {
  if (action === "ber") return "For BER is pending. A Super Admin must approve it before the status changes.";
  if (action === "delete") return "Delete submitted. An Assistant Admin or Super Admin must approve it.";
  if (action === "edit-request") return "Edit request sent. A Super Admin must accept it before other fields can be changed.";
  return "Saved as pending. A Super Admin must approve it before the data changes.";
}

export async function saveEquipment(kind, user, input, existing) {
  const store = stores[kind];
  if (existing && input.requestEditAccess) {
    if (user.role === "super-admin" || existing.editGranted) {
      return { pending: false, message: "Other fields can already be edited.", record: existing };
    }
    const record = await store.mark(existing.id, {
      editRequest: "pending",
      editRequestedBy: user.username,
    });
    return { pending: true, message: messageFor("edit-request"), record };
  }
  input = inputForSave(kind, user, input, existing);
  const ber = berLabel(input);
  if (existing && user.role !== "super-admin") {
    const record = await store.mark(existing.id, {
      status: "Pending",
      pendingAction: ber ? "ber" : "edit",
      pendingStatus: ber || "",
      pendingBy: user.username,
      previousStatus: existing.status === "Pending" ? existing.previousStatus || "" : existing.status,
      pendingPayload: plainPayload(input),
    });
    return { pending: true, message: ber ? messageFor("ber") : messageFor("edit"), record };
  }
  if (ber && user.role !== "super-admin") {
    if (!existing) {
      const record = await store.add({
        ...input,
        status: "Pending",
        pendingAction: "ber",
        pendingStatus: ber,
        pendingBy: user.username,
        previousStatus: "",
        pendingPayload: null,
      });
      return { pending: true, message: messageFor("ber"), record };
    }
    if (user.role === "encoder") {
      const record = await store.mark(existing.id, {
        status: "Pending",
        pendingAction: "ber",
        pendingStatus: ber,
        pendingBy: user.username,
        previousStatus: existing.status === "Pending" ? existing.previousStatus || "" : existing.status,
        pendingPayload: { ...input, status: ber },
      });
      return { pending: true, message: messageFor("ber"), record };
    }
    const record = await store.update(existing.id, {
      ...input,
      status: "Pending",
      pendingAction: "ber",
      pendingStatus: ber,
      pendingBy: user.username,
      previousStatus: existing.status === "Pending" ? existing.previousStatus || "" : existing.status,
      pendingPayload: null,
    });
    return { pending: true, message: messageFor("ber"), record };
  }

  const record = existing ? await store.update(existing.id, { ...input, ...clearPending, editGranted: false, editRequest: "" }) : await store.add({ ...input, ...clearPending });
  return { pending: false, message: "", record };
}

export async function requestDelete(kind, user, existing) {
  const store = stores[kind];
  if (user.role === "encoder") {
    const error = new Error("Encoders cannot delete equipment.");
    error.status = 403;
    throw error;
  }
  await store.remove(existing.id);
  return { pending: false, message: "", record: null };
}

export async function decideEquipment(kind, user, id, decision, target) {
  const store = stores[kind];
  const existing = await store.get(id);
  if (!existing || !canDecide(user, existing)) {
    const error = new Error("You cannot approve this request.");
    error.status = 403;
    throw error;
  }
  const editRequestOnly = target === "edit-request" || (!target && existing.editRequest === "pending" && !existing.pendingAction);
  if (editRequestOnly) {
    if (decision === "reject") return store.mark(id, { editRequest: "", editRequestedBy: "" });
    return store.mark(id, { editRequest: "", editRequestedBy: "", editGranted: true });
  }
  if (decision === "reject") {
  if (existing.pendingAction === "ber") {
    if (!existing.previousStatus) {
      await store.remove(id);
      return null;
    }
    return store.mark(id, { ...clearPending, status: existing.previousStatus });
  }
    return store.mark(id, { ...clearPending, status: existing.previousStatus || existing.status });
  }
  if (existing.pendingAction === "delete") {
    await store.remove(id);
    return null;
  }
  const payload = existing.pendingPayload || existing;
  const status = existing.pendingAction === "ber" ? existing.pendingStatus : payload.status;
  return store.update(id, { ...payload, ...clearPending, status });
}
