export const totals = [
  { label: "Total equipment", value: 0, tone: "ink" },
  { label: "Serviceable", value: 0, tone: "good" },
  { label: "For repair", value: 0, tone: "warn" },
  { label: "Defective", value: 0, tone: "bad" },
  { label: "Missing", value: 0, tone: "bad" },
  { label: "For disposal", value: 0, tone: "warn" },
  { label: "Disposed", value: 0, tone: "muted" },
  { label: "Transferred", value: 0, tone: "info" },
];

export const attention = [
  { label: "Missing equipment", count: 0, href: "/inventory/computer" },
  { label: "For repair", count: 0, href: "/maintenance" },
  { label: "Maintenance due", count: 0, href: "/maintenance" },
  { label: "Inspection due", count: 0, href: "/inspection" },
];

export const provinces = [];

export const activities = [];

function bucket(record) {
  const status = String(record.status || "");
  const condition = String(record.condition || "");
  const assignment = String(record.assignmentStatus || "");
  if (/pending/i.test(status)) return "Pending";
  if (/missing|lost/i.test(status)) return "Missing";
  if (/transfer/i.test(status) || /transfer/i.test(assignment)) return "Transferred";
  if (/disposed/i.test(status)) return "Disposed";
  if (/ber/i.test(status) || /condemn/i.test(status) || /BER/i.test(condition) || /disposal/i.test(status) || /disposal/i.test(condition)) return "For disposal";
  if (/under maintenance/i.test(status) || /repair/i.test(status) || /repair/i.test(condition) || /repair/i.test(assignment) || /unserviceable/i.test(status)) return "For repair";
  if (/damag/i.test(status) || /defect/i.test(status)) return "Defective";
  if (/^inactive$/i.test(status)) return "Defective";
  return "Serviceable";
}

export function summarize(records, locations) {
  const counts = {
    Serviceable: 0,
    "For repair": 0,
    Defective: 0,
    Missing: 0,
    "For disposal": 0,
    Disposed: 0,
    Transferred: 0,
    Pending: 0,
  };
  for (const record of records) counts[bucket(record)] += 1;

  const provinceMap = new Map();
  for (const location of locations) {
    if (!provinceMap.has(location.province)) provinceMap.set(location.province, 0);
  }
  for (const record of records) {
    const label = record.province || "Unassigned";
    provinceMap.set(label, (provinceMap.get(label) || 0) + 1);
  }

  const recent = [...records]
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
    .slice(0, 4)
    .map((record) => ({
      time: new Date(record.updatedAt || record.createdAt || Date.now()).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      label: `${record.kind || "Equipment"} ${record.controlNumber || ""}`.trim(),
    }));

  return {
    totals: [
      { label: "Total equipment", value: records.length, tone: "ink" },
      { label: "Serviceable", value: counts.Serviceable, tone: "good" },
      { label: "For repair", value: counts["For repair"], tone: "warn" },
      { label: "Defective", value: counts.Defective, tone: "bad" },
      { label: "Missing", value: counts.Missing, tone: "bad" },
      { label: "For disposal", value: counts["For disposal"], tone: "warn" },
      { label: "Disposed", value: counts.Disposed, tone: "muted" },
      { label: "Transferred", value: counts.Transferred, tone: "info" },
      { label: "Pending approval", value: counts.Pending, tone: "warn" },
    ],
    provinces: [...provinceMap].map(([label, value]) => ({ label, value })),
    attention: [
      { label: "Missing equipment", count: counts.Missing, href: "/inventory/computer" },
      { label: "For repair", count: counts["For repair"], href: "/maintenance" },
      { label: "Maintenance due", count: 0, href: "/maintenance" },
      { label: "Inspection due", count: 0, href: "/inspection" },
    ],
    activities: recent,
  };
}
