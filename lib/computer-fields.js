export const equipmentTypes = ["Laptop", "Desktop", "All-in-One", "Server", "Tablet"];
export const connectivityOptions = ["LAN", "WiFi", "LAN and WiFi"];
export const storageUnits = ["GB", "TB"];
export const ramSizes = ["2", "4", "6", "8", "12", "16", "24", "32"];
export const provinces = ["Laguna", "Batangas", "Rizal", "Cavite", "Quezon"];
export const municipalities = ["Calamba", "Santa Rosa", "San Pablo", "Biñan"];
export const offices = ["Calamba CPS", "City Engineering Office", "City Treasurer's Office", "City Health Office"];
export const sections = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "Others"];
export const assignmentStatuses = ["Assigned", "Unassigned", "For Repair", "Condemned"];
export const statuses = ["Serviceable", "Unserviceable", "Damaged", "Lost", "For BER", "BER"];
export const conditions = ["Good", "Fair", "Poor", "BER", "For Replacement"];
export const acquisitions = ["Issued by NHQ", "Issued by RHQ", "Issued by PHQ", "Donated by LGU", "Other Donated", "Un-documented"];
export const dedicatedUses = ["None", "NPCS", "CIRAS", "DRDIGS", "Others"];
export const licenseStatuses = ["Licensed", "Cracked"];

export const computerColumns = [
  ["controlNumber", "Control Number"],
  ["equipmentType", "Equipment Type"],
  ["computerName", "Computer Name"],
  ["display", "Type of Monitor"],
  ["size", "Size"],
  ["connectivity", "Connectivity"],
  ["brand", "System Unit/CPU Brand"],
  ["monitorBrand", "Monitor Brand"],
  ["model", "Model"],
  ["serialNumber", "Serial Number"],
  ["processor", "Processor"],
  ["speed", "Speed"],
  ["frequency", "Frequency"],
  ["ram", "RAM"],
  ["ssdStorage", "SSD Storage"],
  ["hddStorage", "HDD Storage"],
  ["gpu", "Video Card"],
  ["videoCapacity", "Capacity"],
  ["os", "Operating System"],
  ["osStatus", "Operating System Status"],
  ["antivirus", "Anti-Virus/End Point Security"],
  ["antivirusStatus", "Anti-Virus Status"],
  ["officeSoftware", "Office Productivity Software"],
  ["officeStatus", "Office Software Status"],
  ["province", "Province"],
  ["municipality", "Municipality"],
  ["office", "Office"],
  ["section", "Section"],
  ["specificEndUser", "Specific End User"],
  ["accountablePerson", "Accountable Person"],
  ["assignmentStatus", "Assignment Status"],
  ["status", "Status"],
  ["condition", "Condition"],
  ["modeOfAcquisition", "Mode of Acquisition"],
  ["dedicatedUse", "Dedicated Use For"],
  ["dateAcquired", "Date Acquired"],
  ["acquisitionCost", "Acquisition Cost"],
  ["remarks", "Remarks"],
];

export const computerSeries = "PRO4A-PC";
export const printerSeries = "PRO4A-PRNTR";

export function formatControl(prefix, count) {
  return `${prefix}-${String(count).padStart(5, "0")}`;
}

export function storageLabel(value, unit) {
  const amount = String(value ?? "").trim();
  if (!amount) return "";
  return `${amount} ${unit || ""}`.trim();
}
