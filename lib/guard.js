import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { accountState, getSessionUser, publicUser } from "@/lib/users";

export async function currentUser() {
  const session = await getSession();
  if (session.step !== "verified" || !session.username || !session.sessionId) return null;
  const user = await getSessionUser(session.username, session.sessionId);
  if (!user || accountState(user) !== "Active" || user.mustChangePassword) return null;
  if ((user.passwordRevision || 0) !== (session.revision || 0)) return null;
  return publicUser(user);
}

export async function requireUser() {
  const session = await getSession();
  if (session.step === "reset-password") redirect("/reset-password");
  if (session.step !== "verified" || !session.username || !session.sessionId) redirect("/");
  let user;
  try {
    user = await getSessionUser(session.username, session.sessionId);
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
