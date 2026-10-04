import { listCellphones } from "@/lib/cellphones";
import { listComputers } from "@/lib/computers";
import { listDisplays } from "@/lib/displays";
import { listInternets } from "@/lib/internets";
import { listPrinters } from "@/lib/printers";
import { listRadios } from "@/lib/radios";
import { listStorages } from "@/lib/storages";

export async function listAllEquipment(user) {
  const [computers, printers, internets, displays, cellphones, radios, storages] = await Promise.all([
    listComputers(user),
    listPrinters(user),
    listInternets(user),
    listDisplays(user),
    listCellphones(user),
    listRadios(user),
    listStorages(user),
  ]);
  return [...computers, ...printers, ...internets, ...displays, ...cellphones, ...radios, ...storages];
}
