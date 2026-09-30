import fs from "fs";
import path from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function serviceAccount() {
  const file = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (file) {
    const full = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
    if (fs.existsSync(full)) return JSON.parse(fs.readFileSync(full, "utf8"));
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") };
  }
  return null;
}

export function firestore() {
  const account = serviceAccount();
  if (!account) return null;
  if (!getApps().length) initializeApp({ credential: cert(account) });
  return getFirestore();
}
