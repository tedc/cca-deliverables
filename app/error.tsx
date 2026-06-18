"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Qualcosa è andato storto</h1>
      <p className="max-w-md text-sm text-[var(--color-muted-foreground)]">
        Si è verificato un errore imprevisto. Riprova.
      </p>
      <Button onClick={reset}>Riprova</Button>
    </main>
  );
}
