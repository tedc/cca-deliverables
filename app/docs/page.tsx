import { readFileSync } from "node:fs";
import { join } from "node:path";
import GithubSlugger from "github-slugger";
import { requireUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { DocsView, type TocEntry } from "./docs-view";

function buildToc(markdown: string): TocEntry[] {
  const toc: TocEntry[] = [];
  // Same slugger rehype-slug uses, so TOC anchors match heading ids exactly.
  const slugger = new GithubSlugger();
  let inCodeBlock = false;
  for (const line of markdown.split("\n")) {
    if (/^```/.test(line.trim())) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const m = /^(##|###)\s+(.*)$/.exec(line.trim());
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].replace(/`/g, "").trim();
    const slug = slugger.slug(text);
    toc.push({ level, text, slug });
  }
  return toc;
}

export default async function DocsPage() {
  await requireUser();
  const markdown = readFileSync(
    join(process.cwd(), "documentazione.md"),
    "utf-8"
  );
  const toc = buildToc(markdown);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <DocsView markdown={markdown} toc={toc} />
      </main>
    </>
  );
}
