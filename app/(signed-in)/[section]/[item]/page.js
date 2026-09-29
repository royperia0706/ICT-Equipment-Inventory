import { notFound } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import ModuleView from "@/components/ModuleView";
import { moduleFor } from "@/lib/navigation";

export default async function ItemPage({ params }) {
  const { section, item } = await params;
  const page = moduleFor(section, item);
  if (!page) notFound();
  if (section === "pro4a") {
    return <Dashboard kicker="PRO4A" title={page.title} />;
  }
  return <ModuleView page={page} />;
}
