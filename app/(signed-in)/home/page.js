import Dashboard from "@/components/Dashboard";
import { listLocations } from "@/lib/locations";

export default async function HomePage() {
  let locations = [];
  try {
    locations = await listLocations();
  } catch {
    locations = [];
  }
  return <Dashboard locations={locations} />;
}
