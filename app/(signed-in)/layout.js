import AppShell from "@/components/AppShell";
import { listAllEquipment } from "@/lib/all-equipment";
import { notificationItems } from "@/lib/dashboard";
import { requireUser } from "@/lib/guard";
import { accountsFor, listAccounts } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function SignedInLayout({ children }) {
  const user = await requireUser();
  let alerts = notificationItems([], user, []);
  try {
    const records = await listAllEquipment(user);
    const accounts = user.role === "super-admin" || user.role === "assistant-admin"
      ? accountsFor(user, await listAccounts())
      : [];
    alerts = notificationItems(records, user, accounts);
  } catch {
    alerts = notificationItems([], user, []);
  }
  return (
    <AppShell user={user} alerts={alerts}>
      {children}
    </AppShell>
  );
}
