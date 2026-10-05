import ActivityLog from "@/components/ActivityLog";
import { listActivity } from "@/lib/activity";
import { listAllEquipment } from "@/lib/all-equipment";
import { requireUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function ActivityLogPage() {
  const user = await requireUser();
  let records = [];
  try {
    records = await listAllEquipment(user);
  } catch {
    records = [];
  }
  let rows = [];
  try {
    rows = await listActivity(user, records);
  } catch {
    rows = [];
  }
  return <ActivityLog rows={rows} />;
}
