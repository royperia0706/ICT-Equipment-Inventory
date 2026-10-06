import { officeLabel, regionName } from "@/lib/location-choices";

const dateKeys = new Set(["dateManufacture", "targetFixDate", "dateAssessed"]);
const yearKeys = new Set(["dateAcquired", "yearModel", "yearSubscribed", "yearMissing"]);

function text(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return String(value ?? "").trim();
}

function asDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const raw = text(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial > 20000 && serial < 80000) {
      const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      return date.toISOString().slice(0, 10);
    }
  }
  return raw;
}

function asYear(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return String(value.getFullYear());
  const raw = text(value);
  const match = raw.match(/^(\d{4})/);
  return match ? match[1] : raw;
}

function splitStorage(label) {
  const raw = text(label);
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(GB|TB)?$/i);
  if (!match) return { value: raw, unit: "GB" };
  return { value: match[1], unit: (match[2] || "GB").toUpperCase() };
}

function norm(value) {
  return text(value).toLowerCase().replace(/\s+/g, " ");
}

export function rowToInput(kind, headers, row, locations) {
  const input = {};
  headers.forEach((key, index) => {
    if (!key) return;
    const value = row[index];
    if (value === "" || value === null || value === undefined) return;
    if (dateKeys.has(key)) input[key] = asDate(value);
    else if (yearKeys.has(key)) input[key] = asYear(value);
    else input[key] = value instanceof Date ? asDate(value) : text(value);
  });
  delete input.controlNumber;
  delete input.entryDate;
  delete input.id;
  delete input.aging;

  if (kind === "computer") {
    if (input.ram) input.ram = text(input.ram).replace(/\s*gb$/i, "");
    const ssd = splitStorage(input.ssdStorage);
    const hdd = splitStorage(input.hddStorage);
    input.ssdValue = ssd.value;
    input.ssdUnit = text(input.ssdUnit || ssd.unit).toUpperCase();
    input.hddValue = hdd.value;
    input.hddUnit = text(input.hddUnit || hdd.unit).toUpperCase();
  }

  if (kind === "storage" && text(input.capacityUnit)) {
    input.capacityValue = text(input.capacity).replace(/\s*(gb|tb)$/i, "");
    input.capacityUnit = text(input.capacityUnit).toUpperCase();
  }

  return attachPlace(input, locations);
}

function attachPlace(input, locations) {
  const stationText = norm(input.municipality).replace(/\s*\([^)]*\)\s*$/, "");
  if (!stationText) {
    const error = new Error("Station is required.");
    error.status = 400;
    throw error;
  }
  const officeText = norm(input.office);
  const provinceText = norm(input.province);
  const hits = locations.filter((row) => norm(row.name) === stationText);
  const hit = hits.find((row) => {
    const label = norm(officeLabel(row.unit));
    const unit = norm(row.unit);
    if (!officeText && !provinceText) return true;
    return officeText === unit || officeText === label || provinceText === unit || provinceText === label;
  }) || (hits.length === 1 ? hits[0] : null);
  if (!hit) {
    const error = new Error(`Station "${input.municipality}" was not found for that office.`);
    error.status = 400;
    throw error;
  }
  return {
    ...input,
    municipality: hit.name,
    office: hit.unit,
    unit: hit.unit,
    province: officeLabel(hit.unit),
    region: hit.region || input.region || regionName,
  };
}
