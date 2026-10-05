export const navigation = [
  { href: "/home", label: "Dashboard", icon: "home" },
  {
    label: "Inventory",
    icon: "box",
    children: [
      { href: "/inventory/computer", label: "Computer" },
      { href: "/inventory/printer", label: "Printer" },
      { href: "/inventory/internet", label: "Internet" },
      { href: "/inventory/router", label: "Router" },
      { href: "/inventory/switch", label: "Switch" },
      { href: "/inventory/display-projector", label: "Display/Projector" },
      { href: "/inventory/cellphone", label: "Cellphone" },
      { href: "/inventory/handheld-radio", label: "Handheld Radio" },
      { href: "/inventory/storage", label: "Storage" },
    ],
  },
  { href: "/maintenance", label: "Maintenance", icon: "wrench" },
  { href: "/for-ber", label: "BER", icon: "search" },
  { href: "/activity-log", label: "Activity Log", icon: "list" },
  { href: "/reports", label: "Reports", icon: "chart" },
  { href: "/accounts", label: "Accounts", icon: "users" },
];

export const modules = {
  inventory: {
    group: "Inventory",
    title: "All equipment",
    text: "The full equipment list will be managed here.",
  },
  "inventory/storage": {
    group: "Inventory",
    title: "Storage",
    text: "Storage equipment will be listed here.",
  },
  "for-ber": {
    group: "BER",
    title: "BER",
    text: "Equipment with BER status is listed here.",
  },
  accounts: {
    group: "Accounts",
    title: "Accounts",
    text: "User accounts will be managed here.",
  },
  "inventory/computer": {
    group: "Inventory",
    title: "Computer",
    text: "Encoded computers are listed here.",
  },
  "inventory/printer": {
    group: "Inventory",
    title: "Printer",
    text: "Printers will be listed here.",
  },
  "inventory/internet": {
    group: "Inventory",
    title: "Internet",
    text: "Internet connections will be listed here.",
  },
  "inventory/router": {
    group: "Inventory",
    title: "Router",
    text: "Routers will be listed here.",
  },
  "inventory/switch": {
    group: "Inventory",
    title: "Switch",
    text: "Switches will be listed here.",
  },
  "inventory/display-projector": {
    group: "Inventory",
    title: "Display/Projector",
    text: "Displays and projectors will be listed here.",
  },
  "inventory/cellphone": {
    group: "Inventory",
    title: "Cellphone",
    text: "Cellphones will be listed here.",
  },
  "inventory/handheld-radio": {
    group: "Inventory",
    title: "Handheld Radio",
    text: "Handheld radios will be listed here.",
  },
  "inventory/add": {
    group: "Inventory",
    title: "Add equipment",
    text: "New equipment records will be encoded here.",
  },
  "inventory/categories": {
    group: "Inventory",
    title: "Categories",
    text: "Computer, network, printing, security, and communication categories will be managed here.",
  },
  "inventory/locations": {
    group: "Inventory",
    title: "Locations",
    text: "Equipment counts by province and office will be managed here.",
  },
  "accountability/personnel": {
    group: "Accountability",
    title: "Personnel",
    text: "Personnel who can receive equipment will be listed here.",
  },
  "accountability/assigned": {
    group: "Accountability",
    title: "Assigned",
    text: "Equipment currently issued to personnel will be listed here.",
  },
  "accountability/records": {
    group: "Accountability",
    title: "Records",
    text: "Issuance and return history will be kept here.",
  },
  transactions: {
    group: "Transactions",
    title: "Transactions",
    text: "Transfers and other equipment movements will be recorded here.",
  },
  maintenance: {
    group: "Maintenance",
    title: "Maintenance",
    text: "Equipment under maintenance or unserviceable is listed here.",
  },
  inspection: {
    group: "Inspection",
    title: "Inspection",
    text: "Inspection schedules and completed inspections will be tracked here.",
  },
  qr: {
    group: "QR code",
    title: "QR code",
    text: "Equipment tags and scannable codes will be generated here.",
  },
  reports: {
    group: "Reports",
    title: "Reports",
    text: "Inventory summaries and printable reports will be generated here.",
  },
  admin: {
    group: "Admin",
    title: "Admin",
    text: "System settings and administrator tools will be managed here.",
  },
  "pro4a/regional-headquarters": {
    group: "PRO4A",
    title: "Headquarters",
    text: "Equipment assigned to the Regional Headquarters will be listed here.",
  },
  "pro4a/cavite-ppo": {
    group: "PRO4A",
    title: "Cavite",
    text: "Equipment assigned to Cavite PPO will be listed here.",
  },
  "pro4a/laguna-ppo": {
    group: "PRO4A",
    title: "Laguna",
    text: "Equipment assigned to Laguna PPO will be listed here.",
  },
  "pro4a/batangas-ppo": {
    group: "PRO4A",
    title: "Batangas",
    text: "Equipment assigned to Batangas PPO will be listed here.",
  },
  "pro4a/rizal-ppo": {
    group: "PRO4A",
    title: "Rizal",
    text: "Equipment assigned to Rizal PPO will be listed here.",
  },
  "pro4a/quezon-ppo": {
    group: "PRO4A",
    title: "Quezon",
    text: "Equipment assigned to Quezon PPO will be listed here.",
  },
  "pro4a/regional-mobile-force-battalion": {
    group: "PRO4A",
    title: "Mobile Force",
    text: "Equipment assigned to the Regional Mobile Force Battalion will be listed here.",
  },
};

export function moduleFor(section, item) {
  const key = item ? `${section}/${item}` : section;
  return modules[key] || null;
}
