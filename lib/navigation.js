export const navigation = [
  { href: "/home", label: "Dashboard", icon: "home" },
  {
    label: "PRO4A",
    href: "/pro4a",
    icon: "building",
    children: [
      { href: "/pro4a/regional-headquarters", label: "Headquarters" },
      { href: "/pro4a/cavite-ppo", label: "Cavite" },
      { href: "/pro4a/laguna-ppo", label: "Laguna" },
      { href: "/pro4a/batangas-ppo", label: "Batangas" },
      { href: "/pro4a/rizal-ppo", label: "Rizal" },
      { href: "/pro4a/quezon-ppo", label: "Quezon" },
      { href: "/pro4a/regional-mobile-force-battalion", label: "Mobile Force" },
    ],
  },
  {
    label: "Inventory",
    icon: "box",
    children: [
      { href: "/inventory", label: "All" },
      { href: "/inventory/computer", label: "Computer" },
      { href: "/inventory/add", label: "Add" },
      { href: "/inventory/categories", label: "Categories" },
      { href: "/inventory/locations", label: "Locations" },
    ],
  },
  {
    label: "Accountability",
    icon: "users",
    children: [
      { href: "/accountability/personnel", label: "Personnel" },
      { href: "/accountability/assigned", label: "Assigned" },
      { href: "/accountability/records", label: "Records" },
    ],
  },
  { href: "/transactions", label: "Transactions", icon: "transfer" },
  { href: "/maintenance", label: "Maintenance", icon: "wrench" },
  { href: "/inspection", label: "Inspection", icon: "search" },
  { href: "/qr", label: "QR code", icon: "qr" },
  { href: "/reports", label: "Reports", icon: "chart" },
  { href: "/admin", label: "Admin", icon: "gear" },
];

export const modules = {
  inventory: {
    group: "Inventory",
    title: "All equipment",
    text: "The full equipment list will be managed here.",
  },
  "inventory/computer": {
    group: "Inventory",
    title: "Computer",
    text: "Encoded computers are listed here.",
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
    text: "Items for repair and maintenance due will be tracked here.",
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
