import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function SignedInLayout({ children }) {
  const user = await requireUser();
  return (
    <AppShell user={{ displayName: user.displayName, email: user.email, role: user.role }}>
      {children}
    </AppShell>
  );
}
