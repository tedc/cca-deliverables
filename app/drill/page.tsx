import { requireUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { DrillClient } from "./drill-client";

export default async function DrillPage() {
  await requireUser();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <DrillClient />
      </main>
    </>
  );
}
