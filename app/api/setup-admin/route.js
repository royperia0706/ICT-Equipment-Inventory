import { json } from "@/lib/session";

export async function GET() {
  return json({ firstRun: false });
}

export async function POST() {
  return json({ ok: false, error: "Sign in with the username assigned to your office." }, 400);
}
