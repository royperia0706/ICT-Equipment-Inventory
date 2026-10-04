import Dashboard from "@/components/Dashboard";
import { scopeLocations } from "@/lib/access";
import { listAllEquipment } from "@/lib/all-equipment";
import { summarize } from "@/lib/dashboard";
import { requireUser } from "@/lib/guard";
import { listLocations } from "@/lib/locations";

export default async function HomePage() {
  const user = await requireUser();
  let locations = [];
  let records = [];
  try {
    locations = scopeLocations(user, await listLocations());
    records = await listAllEquipment(user);
  } catch {
    locations = [];
    records = [];
  }
  return <Dashboard locations={locations} records={records} summary={summarize(records, locations)} />;
}
