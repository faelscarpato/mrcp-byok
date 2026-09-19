import Link from "next/link";
import { notFound } from "next/navigation";
import { extractHeadings, getDoc, listDocs } from "@/lib/docs";
import { Prose } from "@/components/docs/Prose";
import { Toc } from "@/components/docs/Toc";

export async function generateStaticParams() {
  const docs = await listDocs();
  return docs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps<"/docs/[slug]">) {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) return { title: "Documentação — MRCP Web Terminal" };
  return { title: `${doc.meta.title} — MRCP Web Terminal`, description: doc.meta.summary };
}

export default async function DocPage({ params }: PageProps<"/docs/[slug]">) {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) notFound();

  const headings = extractHeadings(doc.content);
  const docs = await listDocs();
  const index = docs.findIndex((entry) => entry.slug === slug);
  const previous = index > 0 ? docs[index - 1] : null;
  const next = index >= 0 && index < docs.length - 1 ? docs[index + 1] : null;

  return (
    <div className="flex gap-4 px-4 py-6">
      <article className="mx-auto min-w-0 max-w-3xl flex-1">
        <h1 className="text-xl font-semibold text-term-text">{doc.meta.title}</h1>
        <Prose content={doc.content} />

        <nav className="mt-10 flex flex-wrap justify-between gap-3 border-t border-term-line pt-4 text-xs">
          {previous ? (
            <Link href={`/docs/${previous.slug}`} className="text-term-muted hover:text-term-accent">
              ← {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/docs/${next.slug}`} className="text-term-muted hover:text-term-accent">
              {next.title} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>

      <Toc headings={headings} />
    </div>
  );
}
