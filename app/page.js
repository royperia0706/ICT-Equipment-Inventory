import { redirect } from "next/navigation";
import AuthScreen from "@/components/AuthScreen";
import { getSession } from "@/lib/session";
import { accountState, getUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (session.step === "reset-password" && session.username) redirect("/reset-password");
  if (session.step === "verified" && session.username) {
    const user = await getUser(session.username).catch(() => null);
    if (user?.mustChangePassword) redirect("/reset-password");
    if (user && accountState(user) === "Active" && (user.passwordRevision || 0) === (session.revision || 0)) redirect("/home");
  }
  return <AuthScreen />;
}
