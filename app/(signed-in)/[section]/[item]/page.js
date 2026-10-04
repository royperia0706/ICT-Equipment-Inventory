import { notFound } from "next/navigation";
import ComputerInventory from "@/components/ComputerInventory";
import InternetInventory from "@/components/InternetInventory";
import ModuleView from "@/components/ModuleView";
import PrinterInventory from "@/components/PrinterInventory";
import { scopeLocations } from "@/lib/access";
import { listComputers } from "@/lib/computers";
import { requireUser } from "@/lib/guard";
import { listLocations } from "@/lib/locations";
import { moduleFor } from "@/lib/navigation";
import { listInternets } from "@/lib/internets";
import { listPrinters } from "@/lib/printers";

export default async function ItemPage({ params }) {
  const { section, item } = await params;
  if (section === "inventory" && (item === "computer" || item === "printer" || item === "internet")) {
    const user = await requireUser();
    let locations = [];
    try {
      locations = scopeLocations(user, await listLocations());
    } catch {
      locations = [];
    }
    if (item === "computer") {
      let computers = [];
      try {
        computers = await listComputers(user);
      } catch {
        computers = [];
      }
      return <ComputerInventory initial={computers} locations={locations} user={user} />;
    }
    if (item === "printer") {
      let printers = [];
      try {
        printers = await listPrinters(user);
      } catch {
        printers = [];
      }
      return <PrinterInventory initial={printers} locations={locations} user={user} />;
    }
    let internets = [];
    try {
      internets = await listInternets(user);
    } catch {
      internets = [];
    }
    return <InternetInventory initial={internets} locations={locations} user={user} />;
  }
  const page = moduleFor(section, item);
  if (!page) notFound();
  return <ModuleView page={page} />;
}
