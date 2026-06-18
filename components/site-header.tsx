"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/drill", label: "Drill" },
  { href: "/exam", label: "Esame" },
  { href: "/bruciapelo", label: "Bruciapelo" },
  { href: "/docs", label: "Docs" },
  { href: "/history", label: "Storico" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-[var(--color-background)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          CCA-F<span className="text-[var(--color-primary)]"> Trainer</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--color-accent)] text-[var(--color-foreground)]"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
          title="Esci"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Esci</span>
        </button>
      </div>
    </header>
  );
}
