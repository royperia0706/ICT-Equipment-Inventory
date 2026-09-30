import fs from "fs";
import path from "path";
import { controlPrefix, formatControl, storageLabel } from "@/lib/computer-fields";

const file = path.join(process.cwd(), "data", "computers.json");

const required = [
  "equipmentType",
  "brand",
  "model",
  "serialNumber",
  "province",
  "municipality",
  "office",
  "assignmentStatus",
  "status",
  "condition",
  "modeOfAcquisition",
  "dateAcquired",
];

function read() {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return { computers: data.computers || [], sequences: data.sequences || {} };
  } catch {
    return { computers: [], sequences: {} };
  }
}

function write(data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function text(value) {
  return String(value ?? "").trim();
}

export function listComputers() {
  return read().computers;
}

export function previewControlNumber(municipality, office) {
  const data = read();
  const prefix = controlPrefix(municipality, office);
  return formatControl(prefix, (data.sequences[prefix] || 0) + 1);
}

export function addComputer(input) {
  for (const key of required) {
    if (!text(input[key])) throw new Error("Fill in the required fields.");
  }

  const data = read();
  const municipality = text(input.municipality);
  const office = text(input.office);
  const prefix = controlPrefix(municipality, office);
  const count = (data.sequences[prefix] || 0) + 1;
  data.sequences[prefix] = count;

  const dedicated = text(input.dedicatedUse) === "Others"
    ? text(input.dedicatedUseOthers) || "Others"
    : text(input.dedicatedUse) || "None";

  const record = {
    id: `${prefix}-${count}`,
    controlNumber: formatControl(prefix, count),
    equipmentType: text(input.equipmentType),
    computerName: text(input.computerName),
    systemModel: text(input.systemModel),
    display: text(input.display),
    connectivity: text(input.connectivity),
    brand: text(input.brand),
    model: text(input.model),
    serialNumber: text(input.serialNumber),
    assetTag: text(input.assetTag),
    processor: text(input.processor),
    ram: text(input.ram) ? `${text(input.ram)} GB` : "",
    ssdStorage: storageLabel(input.ssdValue, input.ssdUnit),
    hddStorage: storageLabel(input.hddValue, input.hddUnit),
    gpu: text(input.gpu),
    os: text(input.os),
    province: text(input.province),
    municipality,
    office,
    section: text(input.section),
    specificEndUser: text(input.specificEndUser),
    accountablePerson: text(input.accountablePerson),
    assignmentStatus: text(input.assignmentStatus),
    status: text(input.status),
    condition: text(input.condition),
    modeOfAcquisition: text(input.modeOfAcquisition),
    dedicatedUse: dedicated,
    dateAcquired: text(input.dateAcquired),
    acquisitionCost: text(input.acquisitionCost),
    remarks: text(input.remarks),
  };

  data.computers.unshift(record);
  write(data);
  return record;
}
