import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUser } from "@/lib/users";

export const temporaryUser = {
  displayName: "Temporary",
  email: "temporary",
  role: "admin",
  totpEnabled: true,
};

export function isBlankLogin(...values) {
  return values.every((value) => String(value ?? "").trim() === "");
}

export async function requireUser() {
  const session = await getSession();
  if (session.temporary && session.step === "verified") return temporaryUser;
  const user = getUser(session.email);
  if (!user || session.step !== "verified" || !user.totpEnabled) redirect("/");
  return user;
}
