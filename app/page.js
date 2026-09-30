import { redirect } from "next/navigation";
import AuthScreen from "@/components/AuthScreen";
import { getSession } from "@/lib/session";
import { getUser, hasUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (session.temporary && session.step === "verified") redirect("/home");
  const user = getUser(session.email);
  if (session.step === "verified" && user?.totpEnabled) redirect("/home");
  if (session.step === "setup" && user && !user.totpEnabled) redirect("/setup");
  if (session.step === "verify" && user?.totpEnabled) redirect("/verify");
  return <AuthScreen firstRun={!hasUsers()} />;
}
