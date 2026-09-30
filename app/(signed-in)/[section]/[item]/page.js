import { notFound } from "next/navigation";
import ComputerInventory from "@/components/ComputerInventory";
import Dashboard from "@/components/Dashboard";
import ModuleView from "@/components/ModuleView";
import { listComputers } from "@/lib/computers";
import { listLocations } from "@/lib/locations";
import { moduleFor } from "@/lib/navigation";

export default async function ItemPage({ params }) {
  const { section, item } = await params;
  if (section === "inventory" && item === "computer") {
    let locations = [];
    try {
      locations = await listLocations();
    } catch {
      locations = [];
    }
    return <ComputerInventory initial={await listComputers()} locations={locations} />;
  }
  const page = moduleFor(section, item);
  if (!page) notFound();
  if (section === "pro4a") {
    return <Dashboard kicker="PRO4A" title={page.title} />;
  }
  return <ModuleView page={page} />;
}
