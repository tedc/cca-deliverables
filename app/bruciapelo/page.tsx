import { requireUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { BruciapeloClient } from "./bruciapelo-client";

export default async function BruciapeloPage() {
  await requireUser();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <BruciapeloClient />
      </main>
    </>
  );
}
