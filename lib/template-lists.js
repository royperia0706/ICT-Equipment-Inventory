import { cellphoneAcquisitions, cellphoneTypes } from "@/lib/cellphone-fields";
import { cctvConnectionTypes, cctvNightVisionOptions } from "@/lib/cctv-fields";
import {
  acquireYears,
  acquisitions,
  assignmentStatuses,
  conditionsByStatus,
  connectivityOptions,
  dedicatedUses,
  equipmentTypes,
  licenseStatuses,
  ramSizes,
  statuses,
  storageUnits,
} from "@/lib/computer-fields";
import { displayTechnologies, inputPorts } from "@/lib/display-fields";
import { droneAcquisitionTypes, droneYesNoOptions } from "@/lib/drone-fields";
import { importKinds, templateFields } from "@/lib/import-columns";
import { internetStatuses, wifiCapabilities } from "@/lib/internet-fields";
import { officeLabel, officesIn, regionsIn } from "@/lib/location-choices";
import { colorCapabilities, connectionTypes, printerAcquisitions } from "@/lib/printer-fields";
import { radioAcquisitions } from "@/lib/radio-fields";
import { storageAcquisitions, storageTechnologies } from "@/lib/storage-fields";

function years(startYear = 2000) {
  return acquireYears(new Date(), startYear);
}

export function officeChoices(locations) {
  const region = regionsIn(locations || [])[0];
  return officesIn(locations || [], region).map((unit) => officeLabel(unit));
}

export function stationLabel(row) {
  const name = String(row?.name || "").trim();
  const classification = String(row?.classification || "").trim();
  if (!name) return "";
  return classification ? `${name} (${classification})` : name;
}

export function rangeName(label) {
  const name = String(label || "").trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!name || /^[0-9]/.test(name)) return `List_${name || "Item"}`;
  return name;
}

export function stationsByOffice(locations) {
  return officeChoices(locations).map((office) => {
    const unit = (locations || []).find((row) => officeLabel(row.unit) === office)?.unit || "";
    const seen = new Set();
    const stations = [];
    for (const row of locations || []) {
      if (row.unit !== unit) continue;
      const label = stationLabel(row);
      const key = label.toLowerCase();
      if (!label || seen.has(key)) continue;
      seen.add(key);
      stations.push(label);
    }
    return { office, stations };
  });
}

function stationChoices(locations) {
  const seen = new Set();
  const labels = [];
  for (const group of stationsByOffice(locations)) {
    for (const label of group.stations) {
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      labels.push(label);
    }
  }
  return labels;
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
    yearMissing: years(),
    dateAcquired: years(),
  };
  if (kind === "computer") {
    return {
      ...shared,
      equipmentType: equipmentTypes,
      connectivity: connectivityOptions,
      ram: ramSizes,
      ssdUnit: storageUnits,
      hddUnit: storageUnits,
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
  if (kind === "cctv") {
    return {
      ...shared,
      nightVision: cctvNightVisionOptions,
      connectionType: cctvConnectionTypes,
    };
  }
  if (kind === "drone") {
    return {
      ...shared,
      gps: droneYesNoOptions,
      obstacleAvoidance: droneYesNoOptions,
      trained: droneYesNoOptions,
      acquisitionType: droneAcquisitionTypes,
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
      capacityUnit: storageUnits,
      modeOfAcquisition: storageAcquisitions,
    };
  }
  return place;
}

function sameText(left, right) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

function bareStation(value) {
  return String(value || "").trim().replace(/\s*\([^)]*\)\s*$/, "");
}

export function choiceError(kind, headers, row, locations) {
  const lists = dropdownsFor(kind, locations);
  const labels = new Map(templateFields(kind));
  const valueAt = (key) => {
    const index = headers.indexOf(key);
    return index < 0 ? "" : cellText(row[index]);
  };
  for (let index = 0; index < headers.length; index += 1) {
    const key = headers[index];
    const value = cellText(row[index]);
    if (!value) continue;
    const title = labels.get(key) || "Value";
    if (key === "municipality") {
      const office = valueAt("province");
      const groups = stationsByOffice(locations).filter((group) => !office || sameText(group.office, office));
      const allowed = groups.some((group) => group.stations.some((label) => sameText(label, value) || sameText(bareStation(label), bareStation(value))));
      if (!allowed) return `${title} "${value}" is not in the list${office ? " for that office" : ""}.`;
      continue;
    }
    if (key === "condition") {
      const status = valueAt("status");
      const options = status ? (conditionsByStatus[status] || []) : Object.values(conditionsByStatus).flat();
      if (status && !options.length) return `Condition is not used when status is ${status}.`;
      if (options.length && !options.some((item) => sameText(item, value))) return `${title} "${value}" is not in the list.`;
      continue;
    }
    const options = lists[key];
    if (!options?.length) continue;
    if (!options.some((item) => sameText(item, value))) return `${title} "${value}" is not in the list.`;
  }
  return "";
}

export function listColumns(kind, locations) {
  const lists = dropdownsFor(kind, locations);
  const unique = [];
  const dependent = new Set(["province", "municipality", "condition"]);
  const indexes = templateFields(kind).map(([key]) => {
    if (dependent.has(key)) return -1;
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
