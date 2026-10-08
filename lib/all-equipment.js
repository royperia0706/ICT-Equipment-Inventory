import { listCellphones } from "@/lib/cellphones";
import { listComputers } from "@/lib/computers";
import { listCctvs } from "@/lib/cctvs";
import { listDisplays } from "@/lib/displays";
import { listDrones } from "@/lib/drones";
import { listInternets } from "@/lib/internets";
import { listPrinters } from "@/lib/printers";
import { listRadios } from "@/lib/radios";
import { listStorages } from "@/lib/storages";

export async function listAllEquipment(user) {
  const { readCache } = await import("@/lib/read-cache");
  const key = `equipment:${user?.username || ""}:${user?.role || ""}:${user?.unit || ""}:${user?.station || ""}`;
  return readCache(key, 60 * 1000, () => loadAllEquipment(user));
}

async function loadAllEquipment(user) {
  const [computers, printers, internets, displays, cellphones, cctvs, drones, radios, storages] = await Promise.all([
    listComputers(user),
    listPrinters(user),
    listInternets(user),
    listDisplays(user),
    listCellphones(user),
    listCctvs(user),
    listDrones(user),
    listRadios(user),
    listStorages(user),
  ]);
  return [...computers, ...printers, ...internets, ...displays, ...cellphones, ...cctvs, ...drones, ...radios, ...storages];
}
