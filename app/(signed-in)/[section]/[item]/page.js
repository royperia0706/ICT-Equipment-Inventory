import { notFound } from "next/navigation";
import CellphoneInventory from "@/components/CellphoneInventory";
import ComputerInventory from "@/components/ComputerInventory";
import CctvInventory from "@/components/CctvInventory";
import DisplayInventory from "@/components/DisplayInventory";
import DroneInventory from "@/components/DroneInventory";
import InternetInventory from "@/components/InternetInventory";
import ModuleView from "@/components/ModuleView";
import PrinterInventory from "@/components/PrinterInventory";
import RadioInventory from "@/components/RadioInventory";
import StorageInventory from "@/components/StorageInventory";
import { scopeLocations } from "@/lib/access";
import { listComputers } from "@/lib/computers";
import { requireUser } from "@/lib/guard";
import { listLocations } from "@/lib/locations";
import { moduleFor } from "@/lib/navigation";
import { listCellphones } from "@/lib/cellphones";
import { listCctvs } from "@/lib/cctvs";
import { listDisplays } from "@/lib/displays";
import { listDrones } from "@/lib/drones";
import { listInternets } from "@/lib/internets";
import { listPrinters } from "@/lib/printers";
import { listRadios } from "@/lib/radios";
import { listStorages } from "@/lib/storages";

export default async function ItemPage({ params }) {
  const { section, item } = await params;
  if (section === "inventory" && (item === "computer" || item === "printer" || item === "internet" || item === "display-projector" || item === "cellphone" || item === "handheld-radio" || item === "cctv" || item === "drone" || item === "storage")) {
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
    if (item === "internet") {
      let internets = [];
      try {
        internets = await listInternets(user);
      } catch {
        internets = [];
      }
      return <InternetInventory initial={internets} locations={locations} user={user} />;
    }
    if (item === "display-projector") {
      let displays = [];
      try {
        displays = await listDisplays(user);
      } catch {
        displays = [];
      }
      return <DisplayInventory initial={displays} locations={locations} user={user} />;
    }
    if (item === "cellphone") {
      let cellphones = [];
      try {
        cellphones = await listCellphones(user);
      } catch {
        cellphones = [];
      }
      return <CellphoneInventory initial={cellphones} locations={locations} user={user} />;
    }
    if (item === "handheld-radio") {
      let radios = [];
      try {
        radios = await listRadios(user);
      } catch {
        radios = [];
      }
      return <RadioInventory initial={radios} locations={locations} user={user} />;
    }
    if (item === "cctv") {
      let cctvs = [];
      try {
        cctvs = await listCctvs(user);
      } catch {
        cctvs = [];
      }
      return <CctvInventory initial={cctvs} locations={locations} user={user} />;
    }
    if (item === "drone") {
      let drones = [];
      try {
        drones = await listDrones(user);
      } catch {
        drones = [];
      }
      return <DroneInventory initial={drones} locations={locations} user={user} />;
    }
    let storages = [];
    try {
      storages = await listStorages(user);
    } catch {
      storages = [];
    }
    return <StorageInventory initial={storages} locations={locations} user={user} />;
  }
  const page = moduleFor(section, item);
  if (!page) notFound();
  return <ModuleView page={page} />;
}
