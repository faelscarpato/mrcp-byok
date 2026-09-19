/** Client-side download helpers. Files are generated in the browser; nothing is uploaded. */

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown): void {
  saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename.endsWith(".json") ? filename : `${filename}.json`);
}

/** Downloads any text payload (used by `/salvar chat`). */
export function downloadText(filename: string, content: string, mime = "text/markdown;charset=utf-8"): void {
  saveBlob(new Blob([content], { type: mime }), filename);
}

/**
 * Opens a remote asset in a new tab.
 *
 * Used for the VS Code and Chrome extensions: those files live on GitHub, so
 * the download attribute would be ignored cross-origin. The `raw` URL serves
 * the binary and the browser saves it.
 */
export function openExternal(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Filesystem-safe name derived from the command that produced the data. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
