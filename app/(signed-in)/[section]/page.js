import { notFound } from "next/navigation";
import AccountsView from "@/components/AccountsView";
import ModuleView from "@/components/ModuleView";
import { requireUser } from "@/lib/guard";
import { moduleFor } from "@/lib/navigation";
import { listAccounts } from "@/lib/users";

export default async function SectionPage({ params }) {
  const { section } = await params;
  if (section === "accounts") {
    await requireUser();
    const accounts = await listAccounts();
    return <AccountsView accounts={accounts} />;
  }
  const page = moduleFor(section);
  if (!page) notFound();
  return <ModuleView page={page} />;
}
