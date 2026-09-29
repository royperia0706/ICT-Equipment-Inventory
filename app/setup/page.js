import { redirect } from "next/navigation";
import SetupForm from "@/components/SetupForm";
import { getSession } from "@/lib/session";
import { getUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const session = await getSession();
  const user = getUser(session.email);
  if (!user) redirect("/");
  if (user.totpEnabled && session.step === "verified") redirect("/home");
  if (user.totpEnabled) redirect("/verify");
  if (session.step !== "setup") redirect("/");
  return <SetupForm />;
}
