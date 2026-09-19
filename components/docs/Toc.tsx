import type { Heading } from "@/lib/docs";

/** Right-hand "on this page" index. Pure markup: anchors only, no JS. */
export function Toc({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) return null;

  return (
    <aside className="hidden w-56 shrink-0 pl-4 lg:block">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-term-muted">Nesta página</p>
      <ul className="space-y-1 border-l border-term-line pl-3 text-[11px]">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? "pl-3" : ""}>
            <a href={`#${heading.id}`} className="block text-term-muted transition hover:text-term-accent">
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
