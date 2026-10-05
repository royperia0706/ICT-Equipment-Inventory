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

export function attentionItems(records = [], user, accounts = []) {
  let missing = 0;
  let repair = 0;
  let forSuper = 0;
  let forAssistant = 0;
  for (const record of records) {
    const name = bucket(record);
    if (name === "Missing") missing += 1;
    if (name === "For repair") repair += 1;
    if (record.pendingStage === "assistant" && record.pendingAction) forAssistant += 1;
    else if (record.pendingAction || record.status === "Pending") forSuper += 1;
    if (record.editRequest === "pending") forSuper += 1;
  }
  const accountSuper = accounts.filter((account) => account.pendingAction).length;
  const items = [
    { label: "Missing equipment", count: missing, href: "/inventory/computer" },
    { label: "For repair", count: repair, href: "/maintenance" },
  ];
  if (user?.role === "super-admin" || user?.role === "assistant-admin") {
    items.push(
      { label: "For Super Admin approval", count: forSuper + accountSuper, href: "/home" },
      { label: "For Assistant Admin approval", count: forAssistant, href: "/home" },
    );
  }
  return items;
}

const kindHref = {
  Computer: "/inventory/computer",
  Printer: "/inventory/printer",
  Internet: "/inventory/internet",
  Display: "/inventory/display-projector",
  Cellphone: "/inventory/cellphone",
  "Handheld Radio": "/inventory/handheld-radio",
  Storage: "/inventory/storage",
};

function equipmentHref(record) {
  const base = kindHref[record.kind] || "/inventory/computer";
  const id = record.controlNumber || record.id || "";
  return `${base}?focus=${encodeURIComponent(id)}`;
}

export function notificationItems(records = [], user, accounts = []) {
  const items = [];
  const manager = user?.role === "super-admin" || user?.role === "assistant-admin";
  for (const record of records) {
    const id = record.controlNumber || record.id || "";
    const label = `${record.kind || "Equipment"} ${id}`.trim();
    const href = equipmentHref(record);
    const name = bucket(record);
    if (name === "Missing") items.push({ id: `missing-${id}`, label, note: "Missing", href });
    if (name === "For repair") items.push({ id: `repair-${id}`, label, note: "For repair", href });
    if (!manager) continue;
    if (record.pendingStage === "assistant" && record.pendingAction) {
      items.push({ id: `assistant-${id}`, label, note: "Assistant Admin approval", href });
    } else if (record.pendingAction || record.status === "Pending") {
      items.push({ id: `super-${id}`, label, note: "Super Admin approval", href });
    }
    if (record.editRequest === "pending") {
      items.push({ id: `edit-${id}`, label, note: "Edit request", href });
    }
  }
  if (manager) {
    for (const account of accounts) {
      if (!account.pendingAction) continue;
      const id = account.username;
      items.push({
        id: `account-${id}`,
        label: account.displayName || id,
        note: "Account approval",
        href: `/accounts?focus=${encodeURIComponent(id)}`,
      });
    }
  }
  return items;
}

export function summarize(records, locations, user, accounts = []) {
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
    attention: attentionItems(records, user, accounts),
    activities: recent,
  };
}
