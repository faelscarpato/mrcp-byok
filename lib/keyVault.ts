/**
 * BYOK key handling.
 *
 * DECISION: the key is stored **in plaintext** in localStorage.
 *
 * Why not obfuscate/encrypt it?
 *  - There is no way to encrypt a secret inside a browser when that same
 *    browser must decrypt it without asking a password. Any "encryption"
 *    here would be theatre: the key to unlock it sits next to the lock.
 *  - Obfuscation adds failure modes (an irreversible transform silently
 *    stores a key that can never be read back) while adding no real security.
 *  - This is BYOK: the key belongs to the user, was created by the user, and
 *    is the user's responsibility. We do not run a backend, so the key never
 *    travels anywhere except to the provider the user chose.
 *
 * What we DO guarantee:
 *  - no database, no account, no server-side copy, no telemetry;
 *  - the key is only read from memory at the moment of the call;
 *  - "Esquecer" removes it from the device immediately;
 *  - the UI never renders the full key (`maskKey` below).
 *
 * If you need stronger guarantees, use a scoped/rotatable key and clear it
 * after the session with `/provedores` → Esquecer.
 */

/** Safe display form: `sk-…9f2a`. Never reveals more than 4 trailing chars. */
export function maskKey(key: string): string {
  if (!key) return "(vazio)";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 3)}…${key.slice(-4)}`;
}

/** Cheap heuristic to warn about obviously wrong keys before a round trip. */
export function looksLikeKey(key: string, provider: string): boolean {
  if (key.trim().length < 12) return false;
  if (provider === "openai" && !key.startsWith("sk-")) return false;
  return true;
}
