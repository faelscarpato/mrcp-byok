import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugifyHeading } from "@/lib/docs";

/**
 * Markdown renderer for the documentation.
 *
 * Headings receive ids computed with the same function used to build the
 * table of contents, so anchors always resolve — no `rehype-slug` needed.
 */
export function Prose({ content }: { content: string }) {
  return (
    <div className="prose-term max-w-none text-term-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2
              id={slugifyHeading(String(children))}
              className="mt-8 mb-3 scroll-mt-4 border-b border-term-line pb-1 text-base font-semibold text-term-accent"
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 id={slugifyHeading(String(children))} className="mt-6 mb-2 scroll-mt-4 text-sm font-semibold text-term-text">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="my-3 leading-relaxed text-term-text/90">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-term-info underline decoration-dotted underline-offset-2 hover:text-term-accent"
              {...(href?.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="my-3 list-disc pl-5 text-term-text/90">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal pl-5 text-term-text/90">{children}</ol>,
          li: ({ children }) => <li className="my-1">{children}</li>,
          code: ({ children, className }) => {
            const isBlock = /language-/.test(className ?? "");
            return isBlock ? (
              <code className={className}>{children}</code>
            ) : (
              <code className="rounded bg-term-raise px-1 py-0.5 text-[0.9em] text-term-accent">{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-lg border border-term-line bg-term-panel p-3 text-[12px] leading-relaxed">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-term-warn bg-term-warn/5 py-1 pl-3 text-term-text/80">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-term-line bg-term-panel px-2 py-1.5 text-left font-semibold text-term-text">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border border-term-line px-2 py-1.5 align-top">{children}</td>,
          hr: () => <hr className="my-6 border-term-line" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
