import { redirect } from "next/navigation";
import AuthScreen from "@/components/AuthScreen";
import { getSession } from "@/lib/session";
import { accountState, getSessionUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const hasSession = Boolean(session.username && session.sessionId);
  if (hasSession && (session.step === "reset-password" || session.step === "verified")) {
    const user = await getSessionUser(session.username, session.sessionId).catch(() => null);
    if (!user || accountState(user) !== "Active") return <AuthScreen />;
    if (session.step === "reset-password") redirect("/reset-password");
    if (user?.mustChangePassword) redirect("/reset-password");
    if ((user.passwordRevision || 0) === (session.revision || 0)) redirect("/home");
  }
  return <AuthScreen />;
}
