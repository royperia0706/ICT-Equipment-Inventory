import { cellphoneAcquisitions, cellphoneTypes } from "@/lib/cellphone-fields";
import {
  acquireYears,
  acquisitions,
  assignmentStatuses,
  conditions,
  connectivityOptions,
  dedicatedUses,
  equipmentTypes,
  licenseStatuses,
  ramSizes,
  statuses,
} from "@/lib/computer-fields";
import { displayTechnologies, inputPorts } from "@/lib/display-fields";
import { importKinds, templateColumns } from "@/lib/import-columns";
import { internetStatuses, wifiCapabilities } from "@/lib/internet-fields";
import { officeLabel, officesIn, regionsIn } from "@/lib/location-choices";
import { colorCapabilities, connectionTypes, printerAcquisitions } from "@/lib/printer-fields";
import { radioAcquisitions } from "@/lib/radio-fields";
import { storageAcquisitions, storageTechnologies } from "@/lib/storage-fields";

function years(startYear = 2000) {
  return acquireYears(new Date(), startYear);
}

function officeChoices(locations) {
  const region = regionsIn(locations || [])[0];
  return officesIn(locations || [], region).map((unit) => officeLabel(unit));
}

function stationChoices(locations) {
  const seen = new Set();
  const labels = [];
  for (const row of locations || []) {
    const name = String(row.name || "").trim();
    if (!name) continue;
    const label = row.classification ? `${name} (${row.classification})` : name;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels.sort((left, right) => left.localeCompare(right, "en"));
}

function cellText(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return String(value.getFullYear());
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value ?? "").trim();
}

export function dropdownsFor(kind, locations = []) {
  const place = {
    province: officeChoices(locations),
    municipality: stationChoices(locations),
  };
  const shared = {
    ...place,
    status: statuses,
    condition: conditions,
    yearMissing: years(),
    dateAcquired: years(),
  };
  if (kind === "computer") {
    return {
      ...shared,
      equipmentType: equipmentTypes,
      connectivity: connectivityOptions,
      ram: ramSizes,
      osStatus: licenseStatuses,
      antivirusStatus: licenseStatuses,
      officeStatus: licenseStatuses,
      assignmentStatus: assignmentStatuses,
      modeOfAcquisition: acquisitions,
      dedicatedUse: dedicatedUses,
    };
  }
  if (kind === "printer") {
    return {
      ...shared,
      yearModel: years(),
      connectionType: connectionTypes,
      colorCapability: colorCapabilities,
      modeOfAcquisition: printerAcquisitions,
    };
  }
  if (kind === "internet") {
    return {
      ...place,
      wifiCapability: wifiCapabilities,
      yearSubscribed: years(),
      status: internetStatuses,
    };
  }
  if (kind === "display") {
    return {
      ...shared,
      displayTechnology: displayTechnologies,
      inputPorts: inputPorts,
    };
  }
  if (kind === "cellphone") {
    return {
      ...shared,
      cellphoneType: cellphoneTypes,
      yearModel: years(2010),
      modeOfAcquisition: cellphoneAcquisitions,
    };
  }
  if (kind === "radio") {
    return {
      ...shared,
      modeOfAcquisition: radioAcquisitions,
    };
  }
  if (kind === "storage") {
    return {
      ...shared,
      storageTechnology: storageTechnologies,
      modeOfAcquisition: storageAcquisitions,
    };
  }
  return place;
}

export function choiceError(kind, headers, row, locations) {
  const lists = dropdownsFor(kind, locations);
  const labels = new Map(templateColumns(kind));
  for (let index = 0; index < headers.length; index += 1) {
    const key = headers[index];
    const options = lists[key];
    if (!options?.length) continue;
    const value = cellText(row[index]);
    if (!value) continue;
    const allowed = options.some((item) => item.toLowerCase() === value.toLowerCase());
    if (!allowed) return `${labels.get(key) || "Value"} "${value}" is not in the list.`;
  }
  return "";
}

export function listColumns(kind, locations) {
  const lists = dropdownsFor(kind, locations);
  const unique = [];
  const indexes = templateColumns(kind).map(([key]) => {
    const options = lists[key] || [];
    if (!options.length) return -1;
    const signature = options.join("\u0000");
    let found = unique.findIndex((item) => item.signature === signature);
    if (found < 0) {
      unique.push({ signature, options });
      found = unique.length - 1;
    }
    return found;
  });
  return { title: importKinds[kind]?.title || "Inventory", indexes, unique };
}
