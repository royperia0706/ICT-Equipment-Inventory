import { notFound } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import ModuleView from "@/components/ModuleView";
import { moduleFor } from "@/lib/navigation";

export default async function SectionPage({ params }) {
  const { section } = await params;
  if (section === "pro4a") {
    return <Dashboard kicker="PRO4A" title="Total equipment" />;
  }
  const page = moduleFor(section);
  if (!page) notFound();
  return <ModuleView page={page} />;
}
