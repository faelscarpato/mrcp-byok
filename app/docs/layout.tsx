import Link from "next/link";
import { listDocs } from "@/lib/docs";
import { Sidebar } from "@/components/docs/Sidebar";

export default async function DocsLayout({ children }: LayoutProps<"/docs">) {
  const docs = await listDocs();

  return (
    <div className="app-shell bg-term-bg">
      <header className="flex items-center justify-between border-b border-term-line px-3 py-2">
        <Link href="/docs" className="flex items-center gap-2">
          <span className="text-term-accent">▍</span>
          <span className="text-xs font-semibold tracking-wide text-term-text">MRCP WEB TERMINAL — DOCS</span>
        </Link>
        <Link href="/" className="rounded border border-term-line px-2 py-0.5 text-[11px] text-term-muted hover:text-term-text">
          abrir terminal ↗
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Sidebar docs={docs} />
        <div className="min-w-0 flex-1 overflow-y-auto scrollback">{children}</div>
      </div>
    </div>
  );
}
