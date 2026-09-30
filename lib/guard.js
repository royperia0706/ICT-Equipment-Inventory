import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUser, publicUser } from "@/lib/users";

export async function requireUser() {
  const session = await getSession();
  if (session.step !== "verified" || !session.username) redirect("/");
  const user = await getUser(session.username);
  if (!user) redirect("/");
  return publicUser(user);
}
