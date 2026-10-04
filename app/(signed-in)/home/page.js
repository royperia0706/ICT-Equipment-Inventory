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

export default async function HomePage() {
  const user = await requireUser();
  let locations = [];
  let records = [];
  try {
    locations = scopeLocations(user, await listLocations());
    const [computers, printers, internets, displays, cellphones] = await Promise.all([listComputers(user), listPrinters(user), listInternets(user), listDisplays(user), listCellphones(user)]);
    records = [...computers, ...printers, ...internets, ...displays, ...cellphones];
  } catch {
    locations = [];
    records = [];
  }
  return <Dashboard locations={locations} summary={summarize(records, locations)} />;
}
