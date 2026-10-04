import Dashboard from "@/components/Dashboard";
import { scopeLocations } from "@/lib/access";
import { listAllEquipment } from "@/lib/all-equipment";
import { summarize } from "@/lib/dashboard";
import { requireUser } from "@/lib/guard";
import { listLocations } from "@/lib/locations";
import { accountsFor, listAccounts } from "@/lib/users";

export default async function HomePage() {
  const user = await requireUser();
  let locations = [];
  let records = [];
  let accounts = [];
  try {
    locations = scopeLocations(user, await listLocations());
    records = await listAllEquipment(user);
    if (user.role === "super-admin" || user.role === "assistant-admin") {
      accounts = accountsFor(user, await listAccounts());
    }
  } catch {
    locations = [];
    records = [];
    accounts = [];
  }
  return <Dashboard user={user} locations={locations} records={records} accounts={accounts} summary={summarize(records, locations, user, accounts)} />;
}
