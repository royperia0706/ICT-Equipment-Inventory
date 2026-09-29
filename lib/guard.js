import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUser } from "@/lib/users";

export async function requireUser() {
  const session = await getSession();
  const user = getUser(session.email);
  if (!user || session.step !== "verified" || !user.totpEnabled) redirect("/");
  return user;
}
