import { notFound } from "next/navigation";
import AccountsView from "@/components/AccountsView";
import ModuleView from "@/components/ModuleView";
import { requireUser } from "@/lib/guard";
import { listLocations } from "@/lib/locations";
import { moduleFor } from "@/lib/navigation";
import { listAccounts } from "@/lib/users";

export default async function SectionPage({ params }) {
  const { section } = await params;
  if (section === "accounts") {
    const user = await requireUser();
    const accounts = await listAccounts();
    let locations = [];
    try {
      locations = await listLocations();
    } catch {
      locations = [];
    }
    if (user.role === "assistant-admin") {
      locations = locations.filter((row) => row.unit === user.unit);
    }
    return <AccountsView accounts={accounts} user={user} locations={locations} />;
  }
  const page = moduleFor(section);
  if (!page) notFound();
  return <ModuleView page={page} />;
}
