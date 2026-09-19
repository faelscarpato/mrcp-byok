"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DocMeta } from "@/lib/docs";

/**
 * Left navigation. On phones it becomes a horizontally scrollable strip;
 * from `md` upwards it is a fixed column. No JS is needed for the collapse,
 * only for the active-state highlight.
 */
export function Sidebar({ docs }: { docs: DocMeta[] }) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-term-line md:w-60 md:shrink-0 md:border-b-0 md:border-r md:pr-2">
      <ul className="scrollback flex gap-1 overflow-x-auto px-3 py-2 md:flex-col md:gap-0.5 md:overflow-visible md:py-4">
        {docs.map((doc, index) => {
          const active = pathname === `/docs/${doc.slug}`;
          return (
            <li key={doc.slug} className="shrink-0">
              <Link
                href={`/docs/${doc.slug}`}
                className={`block whitespace-nowrap rounded px-2 py-1.5 text-xs transition md:whitespace-normal ${
                  active
                    ? "bg-term-accent/10 text-term-accent"
                    : "text-term-muted hover:bg-term-raise hover:text-term-text"
                }`}
              >
                <span className="mr-1.5 text-[10px] text-term-muted">{String(index + 1).padStart(2, "0")}</span>
                {doc.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
