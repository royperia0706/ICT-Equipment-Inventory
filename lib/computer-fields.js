export const equipmentTypes = ["Laptop", "Desktop", "All-in-One", "Server", "Tablet"];
export const connectivityOptions = ["LAN", "WiFi", "LAN and WiFi"];
export const storageUnits = ["GB", "TB"];
export const ramSizes = ["2", "4", "6", "8", "12", "16", "24", "32"];
export const provinces = ["Laguna", "Batangas", "Rizal", "Cavite", "Quezon"];
export const municipalities = ["Calamba", "Santa Rosa", "San Pablo", "Biñan"];
export const offices = ["Calamba CPS", "City Engineering Office", "City Treasurer's Office", "City Health Office"];
export const sections = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "Others"];
export const assignmentStatuses = ["Assigned", "Unassigned"];
export const statuses = ["Serviceable", "Under Maintenance", "Unserviceable", "BER", "Missing"];
export const conditionsByStatus = {
  Serviceable: ["Excellent", "Good", "Fair"],
  "Under Maintenance": ["For Repair", "On-going Repair"],
  BER: ["For Disposal"],
};
export const conditions = ["Excellent", "Good", "Fair", "For Repair", "On-going Repair", "For Disposal"];
export const acquisitions = ["Procured by NHQ", "Procured by PRO", "Donated", "Undocumented"];
export const dedicatedUses = ["Office Productivity", "NPCS", "DRDIGS", "BWC", "Others"];
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
  ["frequency", "Frequency"],
  ["numberOfCores", "Number of Cores"],
  ["logicalProcessor", "Logical Processor"],
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
  ["assignmentStatus", "Assignment Status"],
  ["accountablePerson", "Accountable Person"],
  ["status", "Computer Status"],
  ["condition", "Condition"],
  ["targetFixDate", "Target Date to be Fixed"],
  ["problemDetail", "Specify the computer's problem or defect."],
  ["dateAssessed", "Date Assessed"],
  ["reasonForBer", "Reason for BER"],
  ["modeOfAcquisition", "Mode of Acquisition"],
  ["dedicatedUse", "Dedicated Use For"],
  ["dateAcquired", "Year Acquired"],
  ["acquisitionCost", "Acquisition Cost"],
  ["remarks", "Remarks"],
];

export const computerSeries = "PRO4A-PC";
export const printerSeries = "PRO4A-PRNTR";

export function acquireYears(today = new Date()) {
  const years = [];
  for (let year = 2000; year <= today.getFullYear(); year += 1) years.push(String(year));
  return years;
}

export function formatControl(prefix, count) {
  return `${prefix}-${String(count).padStart(5, "0")}`;
}

export function storageLabel(value, unit) {
  const amount = String(value ?? "").trim();
  if (!amount) return "";
  return `${amount} ${unit || ""}`.trim();
}
