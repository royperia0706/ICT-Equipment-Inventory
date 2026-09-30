import { redirect } from "next/navigation";
import AuthScreen from "@/components/AuthScreen";
import { getSession } from "@/lib/session";
import { getUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (session.step === "verified" && session.username) {
    const user = await getUser(session.username).catch(() => null);
    if (user) redirect("/home");
  }
  return <AuthScreen />;
}
