export const totals = [
  { label: "Total equipment", value: 8542, tone: "ink" },
  { label: "Serviceable", value: 8103, tone: "good" },
  { label: "For repair", value: 126, tone: "warn" },
  { label: "Defective", value: 87, tone: "bad" },
  { label: "Missing", value: 12, tone: "bad" },
  { label: "For disposal", value: 19, tone: "warn" },
  { label: "Disposed", value: 195, tone: "muted" },
  { label: "Transferred", value: 34, tone: "info" },
];

export const attention = [
  { label: "Missing equipment", count: 12, href: "/inventory" },
  { label: "For repair", count: 126, href: "/maintenance" },
  { label: "Maintenance due", count: 43, href: "/maintenance" },
  { label: "Inspection due", count: 28, href: "/inspection" },
];

export const provinces = [
  { label: "Laguna", value: 2604 },
  { label: "Cavite", value: 2031 },
  { label: "Batangas", value: 1667 },
  { label: "Rizal", value: 1302 },
  { label: "Quezon", value: 938 },
];

export const activities = [
  { time: "10:42", label: "Equipment transferred" },
  { time: "09:30", label: "New laptop added" },
  { time: "08:51", label: "Inspection completed" },
  { time: "08:20", label: "Equipment returned" },
];

const provinceNames = ["Laguna", "Cavite", "Batangas", "Rizal", "Quezon"];

function menu(label, total, serviceable, repair, defective, missing, disposal, disposed, transferred, maintenance, inspection, provinces) {
  return {
    label,
    total,
    statuses: [
      { label: "Total equipment", value: total, tone: "ink" },
      { label: "Serviceable", value: serviceable, tone: "good" },
      { label: "For repair", value: repair, tone: "warn" },
      { label: "Defective", value: defective, tone: "bad" },
      { label: "Missing", value: missing, tone: "bad" },
      { label: "For disposal", value: disposal, tone: "warn" },
      { label: "Disposed", value: disposed, tone: "muted" },
      { label: "Transferred", value: transferred, tone: "info" },
    ],
    provinces: provinceNames.map((name, index) => ({ label: name, value: provinces[index] })),
    attention: [
      { label: "Missing equipment", count: missing, href: "/inventory" },
      { label: "For repair", count: repair, href: "/maintenance" },
      { label: "Maintenance due", count: maintenance, href: "/maintenance" },
      { label: "Inspection due", count: inspection, href: "/inspection" },
    ],
    activities: [
      { time: "10:42", label: `${label} transferred` },
      { time: "09:30", label: `New ${label.toLowerCase()} added` },
      { time: "08:51", label: `${label} inspection completed` },
      { time: "08:20", label: `${label} returned` },
    ],
  };
}

export const equipmentMenus = [
  menu("Computer Equipment", 2200, 2087, 32, 22, 3, 5, 50, 9, 11, 7, [671, 523, 429, 335, 242]),
  menu("Network Equipment", 1400, 1328, 21, 14, 2, 3, 32, 6, 7, 5, [427, 333, 273, 213, 154]),
  menu("Printing & Scanning", 980, 930, 14, 10, 1, 2, 22, 4, 5, 3, [299, 233, 191, 149, 108]),
  menu("Display Equipment", 760, 721, 11, 8, 1, 2, 17, 3, 4, 2, [232, 181, 148, 116, 83]),
  menu("Security & Surveillance", 640, 607, 9, 7, 1, 1, 15, 2, 3, 2, [195, 152, 125, 98, 70]),
  menu("Communication Equipment", 520, 493, 8, 5, 1, 1, 12, 2, 3, 2, [159, 124, 101, 79, 57]),
  menu("Power & Protection", 480, 455, 7, 5, 1, 1, 11, 2, 2, 2, [146, 114, 94, 73, 53]),
  menu("Storage Equipment", 420, 398, 6, 4, 1, 1, 10, 2, 2, 1, [128, 100, 82, 64, 46]),
  menu("Audio & Video", 380, 360, 6, 4, 1, 1, 9, 1, 2, 1, [116, 90, 74, 58, 42]),
  menu("Computer Peripherals", 340, 323, 5, 3, 0, 1, 8, 1, 2, 1, [104, 81, 66, 52, 37]),
  menu("ICT Accessories", 242, 230, 4, 3, 0, 1, 5, 1, 1, 1, [74, 57, 47, 37, 27]),
  menu("ICT Infrastructure", 180, 171, 3, 2, 0, 0, 4, 1, 1, 1, [55, 43, 35, 27, 20]),
];
