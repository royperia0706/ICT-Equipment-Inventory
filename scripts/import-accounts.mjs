import { randomBytes, scryptSync } from "crypto";
import fs from "fs";
import XLSX from "xlsx";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const cred = JSON.parse(fs.readFileSync("./secrets/firebase-admin.json", "utf8"));
const app = initializeApp({ credential: cert(cred) });
const db = getFirestore(app, process.env.FIREBASE_DATABASE_ID || "pro4aictequipmentinventory");

function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 32).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

function provinceName(unit) {
  if (unit === "REGIONAL HEADQUARTERS") return "Regional Headquarters";
  if (unit === "RMFB") return "RMFB";
  const bare = String(unit || "").replace(/ PPO$/i, "").trim();
  return bare.charAt(0) + bare.slice(1).toLowerCase();
}

function roleFor(access) {
  return /assistant/i.test(access) ? "assistant-admin" : "encoder";
}

const workbook = XLSX.readFile("c:/Users/HP/Documents/1. R10/ICT Equipment/User_Account.xlsx");
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "", raw: false });

let unit = "";
const records = [];
for (const row of rows) {
  const name = String(row[0] || "").trim();
  const classification = String(row[1] || "").trim();
  const username = String(row[2] || "").trim().toLowerCase();
  const password = String(row[3] || "").trim();
  const access = String(row[4] || "").trim();
  if (!username && name && !classification) {
    unit = name;
    continue;
  }
  if (!username || username === "username" || !password || !unit) continue;
  records.push({
    region: "PRO 4A - CALABARZON",
    unit,
    province: provinceName(unit),
    station: name,
    displayName: name,
    classification,
    username,
    password,
    access: access || "Encoder",
    role: roleFor(access),
    sort: records.length,
  });
}

const seen = new Map();
for (const record of records) {
  const count = seen.get(record.username) || 0;
  seen.set(record.username, count + 1);
}
const renamed = [];
for (const record of records) {
  if (seen.get(record.username) < 2) continue;
  const office = record.unit.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const next = `${office}_${record.username}`;
  renamed.push(`${record.unit} ${record.station}: ${record.username} -> ${next}`);
  record.username = next;
}

const batch = db.batch();
for (const record of records) {
  const id = record.username.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  batch.set(db.collection("accounts").doc(id), {
    region: record.region,
    unit: record.unit,
    province: record.province,
    station: record.station,
    displayName: record.displayName,
    classification: record.classification,
    username: record.username,
    passwordHash: hashPassword(record.password),
    access: record.access,
    role: record.role,
    sort: record.sort,
  });
}
batch.set(db.collection("meta").doc("accounts-import"), {
  count: records.length,
  importedAt: Date.now(),
  source: "User_Account.xlsx",
  renamed,
});
await batch.commit();
console.log("saved", records.length);
console.log("renamed", renamed.join(" | ") || "none");
