import { redirect } from "next/navigation";
import VerifyForm from "@/components/VerifyForm";
import { getSession } from "@/lib/session";
import { getUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const session = await getSession();
  const user = getUser(session.email);
  if (!user) redirect("/");
  if (session.step === "verified" && user.totpEnabled) redirect("/home");
  if (!user.totpEnabled) redirect(session.step === "setup" ? "/setup" : "/");
  if (session.step !== "verify") redirect("/");
  return <VerifyForm email={user.email} />;
}
