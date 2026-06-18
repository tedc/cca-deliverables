"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { cn } from "@/lib/utils";

export interface TocEntry {
  level: number;
  text: string;
  slug: string;
}

export function DocsView({
  markdown,
  toc,
}: {
  markdown: string;
  toc: TocEntry[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 text-sm">
          <p className="mb-2 font-semibold">Indice</p>
          <ul className="space-y-1">
            {toc.map((t) => (
              <li key={t.slug}>
                <a
                  href={`#${t.slug}`}
                  className={cn(
                    "block rounded px-2 py-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]",
                    t.level === 3 && "pl-4 text-xs"
                  )}
                >
                  {t.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <article className="prose prose-neutral max-w-none prose-headings:scroll-mt-24 prose-h2:border-b prose-h2:pb-2 prose-table:text-sm">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug]}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
