import fs from "fs";
import path from "path";

const file = path.join(process.cwd(), "data", "users.json");

export function readStore() {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { users: [] };
  }
}

export function writeStore(data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
