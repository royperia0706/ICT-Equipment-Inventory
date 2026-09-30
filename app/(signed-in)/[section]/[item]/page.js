import { notFound } from "next/navigation";
import ComputerInventory from "@/components/ComputerInventory";
import Dashboard from "@/components/Dashboard";
import ModuleView from "@/components/ModuleView";
import { listComputers } from "@/lib/computers";
import { moduleFor } from "@/lib/navigation";

export default async function ItemPage({ params }) {
  const { section, item } = await params;
  if (section === "inventory" && item === "computer") {
    return <ComputerInventory initial={listComputers()} />;
  }
  const page = moduleFor(section, item);
  if (!page) notFound();
  if (section === "pro4a") {
    return <Dashboard kicker="PRO4A" title={page.title} />;
  }
  return <ModuleView page={page} />;
}
