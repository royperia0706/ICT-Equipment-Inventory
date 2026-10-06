import Reports from "@/components/Reports";
import { scopeLocations } from "@/lib/access";
import { listAllEquipment } from "@/lib/all-equipment";
import { requireUser } from "@/lib/guard";
import { listLocations } from "@/lib/locations";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
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
  return <Reports locations={locations} records={records} user={user} />;
}
