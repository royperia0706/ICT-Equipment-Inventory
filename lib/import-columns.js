import { cellphoneColumns } from "@/lib/cellphone-fields";
import { computerColumns } from "@/lib/computer-fields";
import { displayColumns } from "@/lib/display-fields";
import { internetColumns } from "@/lib/internet-fields";
import { printerColumns } from "@/lib/printer-fields";
import { radioColumns } from "@/lib/radio-fields";
import { storageColumns } from "@/lib/storage-fields";

const skip = new Set(["controlNumber", "entryDate", "aging"]);

export const importKinds = {
  computer: { title: "Computer", columns: computerColumns, reload: "/api/computers", listKey: "computers" },
  printer: { title: "Printer", columns: printerColumns, reload: "/api/printers", listKey: "printers" },
  internet: { title: "Internet", columns: internetColumns, reload: "/api/internets", listKey: "internets" },
  display: { title: "Display", columns: displayColumns, reload: "/api/displays", listKey: "displays" },
  cellphone: { title: "Cellphone", columns: cellphoneColumns, reload: "/api/cellphones", listKey: "cellphones" },
  radio: { title: "Handheld Radio", columns: radioColumns, reload: "/api/radios", listKey: "radios" },
  storage: { title: "Storage", columns: storageColumns, reload: "/api/storages", listKey: "storages" },
};

export function templateColumns(kind) {
  return (importKinds[kind]?.columns || []).filter(([key]) => !skip.has(key));
}

export function headerMap(kind) {
  const map = new Map();
  for (const [key, label] of templateColumns(kind)) {
    map.set(String(label).trim().toLowerCase(), key);
  }
  return map;
}
