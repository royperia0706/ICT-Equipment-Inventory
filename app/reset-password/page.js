import { redirect } from "next/navigation";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { getSession } from "@/lib/session";
import { accountState, getSessionUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const session = await getSession();
  if (session.step !== "reset-password" || !session.username || !session.sessionId) redirect("/");
  const user = await getSessionUser(session.username, session.sessionId).catch(() => null);
  if (!user?.mustChangePassword || accountState(user) !== "Active") redirect("/");
  if ((user.passwordRevision || 0) !== (session.revision || 0)) redirect("/");
  return <ResetPasswordForm username={user.username} />;
}
