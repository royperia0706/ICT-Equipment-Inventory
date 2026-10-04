import { inScope } from "@/lib/access";
import { addComputer, deleteComputer, getComputer, markComputerPending, updateComputer } from "@/lib/computers";
import { addCellphone, deleteCellphone, getCellphone, markCellphonePending, updateCellphone } from "@/lib/cellphones";
import { addDisplay, deleteDisplay, getDisplay, markDisplayPending, updateDisplay } from "@/lib/displays";
import { addInternet, deleteInternet, getInternet, markInternetPending, updateInternet } from "@/lib/internets";
import { addPrinter, deletePrinter, getPrinter, markPrinterPending, updatePrinter } from "@/lib/printers";
import { addRadio, deleteRadio, getRadio, markRadioPending, updateRadio } from "@/lib/radios";

const stores = {
  computer: { add: addComputer, update: updateComputer, remove: deleteComputer, get: getComputer, mark: markComputerPending },
  printer: { add: addPrinter, update: updatePrinter, remove: deletePrinter, get: getPrinter, mark: markPrinterPending },
  internet: { add: addInternet, update: updateInternet, remove: deleteInternet, get: getInternet, mark: markInternetPending },
  display: { add: addDisplay, update: updateDisplay, remove: deleteDisplay, get: getDisplay, mark: markDisplayPending },
  cellphone: { add: addCellphone, update: updateCellphone, remove: deleteCellphone, get: getCellphone, mark: markCellphonePending },
  radio: { add: addRadio, update: updateRadio, remove: deleteRadio, get: getRadio, mark: markRadioPending },
};

const basicFields = {
  computer: ["equipmentType", "computerName", "display", "size", "connectivity", "brand", "monitorBrand", "dateManufacture", "model", "serialNumber"],
  printer: ["printerType", "brand", "model", "yearModel", "serialNumber", "connectionType"],
  internet: ["internetType", "provider", "connectionType", "speed", "wifiCapability", "location", "yearSubscribed", "monthlySubscription", "ipAddress", "status"],
  display: ["equipmentType", "brand", "model", "serialNumber", "screenSize", "resolution", "displayTechnology", "inputPorts", "dateAcquired", "acquisitionCost", "location", "issuedTo", "status", "condition", "targetFixDate", "problemDetail", "dateAssessed", "reasonForBer", "yearMissing", "remarks"],
  cellphone: ["cellphoneType", "brand", "operatingSystem", "serialNumber", "simNumber", "mobileNetwork", "storageCapacity", "ram", "yearModel", "acquisitionCost", "modeOfAcquisition", "issuedTo", "status", "condition", "targetFixDate", "problemDetail", "dateAssessed", "reasonForBer", "yearMissing", "remarks"],
  radio: ["radioType", "brand", "model", "serialNumber", "frequencyBand", "dateAcquired", "acquisitionCost", "modeOfAcquisition", "issuedTo", "status", "condition", "targetFixDate", "problemDetail", "dateAssessed", "reasonForBer", "yearMissing", "remarks"],
};

function inputForSave(kind, user, input, existing) {
  const next = { ...input };
  const requested = Boolean(next.requestBasicEdit);
  delete next.requestBasicEdit;
  if (!existing || user?.role !== "encoder" || requested) return next;
  for (const key of basicFields[kind] || []) next[key] = existing[key] ?? "";
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
  if (!user || !record?.pendingAction) return false;
  if (user.role === "super-admin") return true;
  if (record.pendingAction === "ber") return false;
  return user.role === "assistant-admin" && inScope(user, record);
}

function messageFor(action) {
  if (action === "ber") return "For BER is pending. A Super Admin must approve it before the status changes.";
  if (action === "delete") return "Delete submitted. An Assistant Admin or Super Admin must approve it.";
  return "Edit submitted. An Assistant Admin or Super Admin must approve it before it is saved.";
}

export async function saveEquipment(kind, user, input, existing) {
  input = inputForSave(kind, user, input, existing);
  const store = stores[kind];
  const ber = berLabel(input);
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

  if (existing && user.role === "encoder") {
    const record = await store.mark(existing.id, {
      pendingAction: "edit",
      pendingStatus: "",
      pendingBy: user.username,
      previousStatus: existing.status,
      pendingPayload: input,
    });
    return { pending: true, message: messageFor("edit"), record };
  }

  const record = existing ? await store.update(existing.id, { ...input, ...clearPending }) : await store.add({ ...input, ...clearPending });
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

export async function decideEquipment(kind, user, id, decision) {
  const store = stores[kind];
  const existing = await store.get(id);
  if (!existing || !canDecide(user, existing)) {
    const error = new Error("You cannot approve this request.");
    error.status = 403;
    throw error;
  }
  if (decision === "reject") {
  if (existing.pendingAction === "ber") {
    if (!existing.previousStatus) {
      await store.remove(id);
      return null;
    }
    return store.mark(id, { ...clearPending, status: existing.previousStatus });
  }
    return store.mark(id, clearPending);
  }
  if (existing.pendingAction === "delete") {
    await store.remove(id);
    return null;
  }
  const payload = existing.pendingPayload || existing;
  const status = existing.pendingAction === "ber" ? existing.pendingStatus : payload.status;
  return store.update(id, { ...payload, ...clearPending, status });
}
