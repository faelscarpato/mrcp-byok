import Link from "next/link";
import { listDocs } from "@/lib/docs";

export default async function DocsIndexPage() {
  const docs = await listDocs();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-term-text">MRCP Web Terminal</h1>
      <p className="mt-2 text-sm leading-relaxed text-term-muted">
        Um Chat-CLI que conversa com o MRCP Engine e com modelos de linguagem, mantendo sua chave no seu
        navegador. Esta documentação descreve os sete pilares do projeto, o catálogo completo de comandos e
        respostas <strong className="text-term-text">capturadas ao vivo</strong> do engine — nada aqui é
        simulado.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {docs.map((doc, index) => (
          <Link
            key={doc.slug}
            href={`/docs/${doc.slug}`}
            className="rounded-lg border border-term-line bg-term-panel p-3 transition hover:border-term-accent"
          >
            <span className="text-[10px] text-term-muted">{String(index + 1).padStart(2, "0")}</span>
            <h2 className="mt-1 text-sm font-semibold text-term-text">{doc.title}</h2>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-term-muted">{doc.summary}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-term-line bg-term-panel p-4 text-xs leading-relaxed text-term-muted">
        <p className="text-term-text">Execute você mesmo:</p>
        <pre className="mt-2 overflow-x-auto rounded border border-term-line bg-term-bg p-3 text-[11px] text-term-text">
          {`git clone https://github.com/faelscarpato/MRCP-BYOK
cd MRCP-BYOK
npm install
npm run dev`}
        </pre>
        <p className="mt-2">
          O terminal abre em <code className="text-term-accent">http://localhost:3000</code>. Comandos MRCP
          funcionam sem nenhuma chave; apenas o bate-papo exige uma API Key (BYOK).
        </p>
      </div>
    </div>
  );
}
