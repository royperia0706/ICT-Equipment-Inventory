import XLSX from "xlsx";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const cred = JSON.parse(fs.readFileSync("./secrets/firebase-admin.json", "utf8"));
const app = initializeApp({ credential: cert(cred) });
const db = getFirestore(app, process.env.FIREBASE_DATABASE_ID || "pro4aictequipmentinventory");

function provinceName(unit) {
  if (unit === "REGIONAL HEADQUARTERS") return "Regional Headquarters";
  if (unit === "RMFB") return "RMFB";
  const bare = unit.replace(/ PPO$/i, "").trim();
  return bare.charAt(0) + bare.slice(1).toLowerCase();
}

function categoryFor(unit) {
  if (unit === "REGIONAL HEADQUARTERS") return "office";
  if (unit === "RMFB") return "company";
  return "station";
}

const workbook = XLSX.readFile("c:/Users/HP/Documents/1. R10/ICT Equipment/Offices.xlsx");
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "", raw: false });

let unit = "";
const records = [];
for (const row of rows) {
  const name = String(row[0] || "").trim();
  const classification = String(row[1] || "").trim();
  if (!name || name === "PRO 4A - CALABARZON") continue;
  if (/^NAME OF /i.test(name)) continue;
  if (!classification) {
    unit = name;
    continue;
  }
  if (!unit) continue;
  records.push({
    province: provinceName(unit),
    unit,
    name,
    category: categoryFor(unit),
    classification,
    sort: records.length,
  });
}

const batch = db.batch();
for (const record of records) {
  const id = `${record.unit}-${record.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  batch.set(db.collection("locations").doc(id), record);
}
batch.set(db.collection("meta").doc("locations-import"), {
  count: records.length,
  importedAt: Date.now(),
  source: "Offices.xlsx",
});
await batch.commit();
const provinces = [...new Set(records.map((record) => record.province))];
console.log("saved", records.length);
console.log("provinces", provinces.join(", "));
