import { notFound, redirect } from "next/navigation";
import AccountsView from "@/components/AccountsView";
import EquipmentStatusList from "@/components/EquipmentStatusList";
import ModuleView from "@/components/ModuleView";
import { listAllEquipment } from "@/lib/all-equipment";
import { requireUser } from "@/lib/guard";
import { listLocations } from "@/lib/locations";
import { moduleFor } from "@/lib/navigation";
import { accountsFor, listAccounts } from "@/lib/users";

const statusPages = {
  maintenance: {
    title: "Maintenance",
    text: "Equipment with status Under Maintenance or Unserviceable.",
    statuses: ["Under Maintenance", "Unserviceable"],
  },
  "for-ber": {
    title: "BER",
    text: "Equipment with status BER.",
    statuses: ["BER"],
  },
};

export default async function SectionPage({ params }) {
  const { section } = await params;
  if (section === "accounts") {
    const user = await requireUser();
    if (user.role === "encoder") redirect("/home");
    const accounts = accountsFor(user, await listAccounts());
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
  const statusPage = statusPages[section];
  if (statusPage) {
    const user = await requireUser();
    let records = [];
    try {
      records = await listAllEquipment(user);
    } catch {
      records = [];
    }
    const rows = records.filter((row) => statusPage.statuses.includes(row.status));
    return <EquipmentStatusList title={statusPage.title} text={statusPage.text} records={rows} />;
  }
  const page = moduleFor(section);
  if (!page) notFound();
  return <ModuleView page={page} />;
}
