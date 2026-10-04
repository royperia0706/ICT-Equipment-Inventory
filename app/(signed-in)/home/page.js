import Dashboard from "@/components/Dashboard";
import { scopeLocations } from "@/lib/access";
import { listComputers } from "@/lib/computers";
import { summarize } from "@/lib/dashboard";
import { requireUser } from "@/lib/guard";
import { listLocations } from "@/lib/locations";
import { listCellphones } from "@/lib/cellphones";
import { listDisplays } from "@/lib/displays";
import { listInternets } from "@/lib/internets";
import { listPrinters } from "@/lib/printers";
import { listRadios } from "@/lib/radios";
import { listStorages } from "@/lib/storages";

export default async function HomePage() {
  const user = await requireUser();
  let locations = [];
  let records = [];
  try {
    locations = scopeLocations(user, await listLocations());
    const [computers, printers, internets, displays, cellphones, radios, storages] = await Promise.all([listComputers(user), listPrinters(user), listInternets(user), listDisplays(user), listCellphones(user), listRadios(user), listStorages(user)]);
    records = [...computers, ...printers, ...internets, ...displays, ...cellphones, ...radios, ...storages];
  } catch {
    locations = [];
    records = [];
  }
  return <Dashboard locations={locations} records={records} summary={summarize(records, locations)} />;
}
