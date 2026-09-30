import { firestore } from "@/lib/firebase";

export async function listLocations() {
  const db = firestore();
  if (!db) return [];
  const snap = await db.collection("locations").orderBy("sort").get();
  return snap.docs.map((doc) => doc.data());
}
