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

export function templateFields(kind) {
  const fields = [];
  for (const [key, label] of templateColumns(kind)) {
    if (key === "province") fields.push([key, "Office"]);
    else if (key === "municipality") fields.push([key, "Station"]);
    else if (key === "office") fields.push([key, "Unit"]);
    else fields.push([key, label]);
    if (kind === "computer" && key === "ssdStorage") fields.push(["ssdUnit", "SSD Unit"]);
    if (kind === "computer" && key === "hddStorage") fields.push(["hddUnit", "HDD Unit"]);
    if (kind === "storage" && key === "capacity") fields.push(["capacityUnit", "Capacity Unit"]);
  }
  return fields;
}

export function headerMap(kind) {
  const map = new Map();
  for (const [key, label] of templateColumns(kind)) {
    map.set(String(label).trim().toLowerCase(), key);
  }
  map.set("station", "municipality");
  map.set("ssd unit", "ssdUnit");
  map.set("hdd unit", "hddUnit");
  map.set("capacity unit", "capacityUnit");
  return map;
}

export function keysForLabels(kind, labels) {
  const map = headerMap(kind);
  const hasProvinceHeader = labels.includes("province");
  return labels.map((label) => {
    if (label === "unit") return "office";
    if (label === "office" && !hasProvinceHeader) return "province";
    return map.get(label) || "";
  });
}
