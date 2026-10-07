import { redirect } from "next/navigation";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { getSession } from "@/lib/session";
import { accountState, getUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const session = await getSession();
  if (session.step !== "reset-password" || !session.username) redirect("/");
  const user = await getUser(session.username).catch(() => null);
  if (!user?.mustChangePassword || accountState(user) !== "Active") redirect("/");
  if ((user.passwordRevision || 0) !== (session.revision || 0)) redirect("/");
  return <ResetPasswordForm username={user.username} />;
}
