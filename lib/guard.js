import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { accountState, getUser, publicUser } from "@/lib/users";

export async function currentUser() {
  const session = await getSession();
  if (session.step !== "verified" || !session.username) return null;
  const user = await getUser(session.username);
  if (!user || accountState(user) !== "Active" || user.mustChangePassword) return null;
  if ((user.passwordRevision || 0) !== (session.revision || 0)) return null;
  return publicUser(user);
}

export async function requireUser() {
  const session = await getSession();
  if (session.step === "reset-password") redirect("/reset-password");
  if (session.step !== "verified" || !session.username) redirect("/");
  let user;
  try {
    user = await getUser(session.username);
  } catch (error) {
    const { isQuotaError } = await import("@/lib/read-cache");
    if (isQuotaError(error)) redirect("/quota");
    throw error;
  }
  if (!user || accountState(user) !== "Active") redirect("/");
  if ((user.passwordRevision || 0) !== (session.revision || 0)) redirect("/");
  if (user.mustChangePassword) redirect("/reset-password");
  return publicUser(user);
}
