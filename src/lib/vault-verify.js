/**
 * Verifica coerenza disco ↔ index.json.
 */

import { loadIndex, INDEX_FILE } from "./index-store.js";
import { readTextAt } from "./fs-path.js";
import { readJsonFile } from "./fs-write.js";

/**
 * Estrae id dal frontmatter YAML di un .md chat.
 * @param {string} text
 */
export function extractFrontmatterId(text) {
  if (!text || !text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end < 0) return null;
  const head = text.slice(3, end);
  const m = head.match(/^\s*id:\s*([0-9a-f-]{36})\s*$/im);
  return m ? m[1] : null;
}

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {AbortSignal} [signal]
 */
async function walkChatMarkdown(root, signal) {
  /** @type {{ percorso: string, id: string | null }[]} */
  const found = [];

  async function walk(dir, prefix) {
    if (signal?.aborted) return;
    for await (const [name, handle] of dir.entries()) {
      if (signal?.aborted) return;
      const path = prefix ? `${prefix}/${name}` : name;
      if (handle.kind === "directory") {
        if (name === "_raw" || name === "_deleted" || name === "wiki") continue;
        await walk(handle, path);
      } else if (handle.kind === "file" && name.endsWith(".md")) {
        const parts = path.split("/");
        const inChats =
          parts.length >= 2 && parts[parts.length - 2] === "chats";
        if (!inChats) continue;
        try {
          const file = await handle.getFile();
          const text = await file.text();
          found.push({
            percorso: path,
            id: extractFrontmatterId(text),
          });
        } catch {
          found.push({ percorso: path, id: null });
        }
      }
    }
  }

  await walk(root, "");
  return found;
}

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {string} relativePath
 */
async function pathExists(root, relativePath) {
  const text = await readTextAt(root, relativePath);
  return text != null;
}

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {{ signal?: AbortSignal, onLog?: (s: string) => void }} [options]
 */
export async function verifyVault(root, options = {}) {
  const { signal, onLog = () => {} } = options;
  const log = (msg) => {
    onLog(msg);
  };

  log("Carico index.json…");
  const index = await loadIndex(root, log);
  const health = (await readJsonFile(root, "_health.json")) || null;

  /** @type {string[]} */
  const missingChats = [];
  /** @type {string[]} */
  const missingDocs = [];
  /** @type {string[]} */
  const missingFiles = [];
  /** @type {{ percorso: string, indexId: string, fileId: string | null }[]} */
  const idMismatch = [];
  /** @type {{ percorso: string, id: string | null }[]} */
  const orphans = [];
  /** @type {string[]} */
  const pathDrift = [];

  const chats = index.chats || {};
  const docs = index.docs || {};
  const files = index.files || {};

  log(`Controllo ${Object.keys(chats).length} chat in indice…`);
  for (const [uuid, entry] of Object.entries(chats)) {
    if (signal?.aborted) break;
    const percorso = entry?.percorso;
    if (!percorso) {
      missingChats.push(`${uuid} (senza percorso)`);
      continue;
    }
    const text = await readTextAt(root, percorso);
    if (text == null) {
      missingChats.push(percorso);
      continue;
    }
    const fileId = extractFrontmatterId(text);
    if (fileId && fileId !== uuid) {
      idMismatch.push({ percorso, indexId: uuid, fileId });
    } else if (!fileId) {
      idMismatch.push({ percorso, indexId: uuid, fileId: null });
    }
  }

  log(`Controllo ${Object.keys(docs).length} docs…`);
  for (const entry of Object.values(docs)) {
    if (signal?.aborted) break;
    const percorso = entry?.percorso;
    if (!percorso) continue;
    if (!(await pathExists(root, percorso))) missingDocs.push(percorso);
  }

  log(`Controllo ${Object.keys(files).length} file progetto…`);
  for (const entry of Object.values(files)) {
    if (signal?.aborted) break;
    const percorso = entry?.percorso;
    if (!percorso) continue;
    if (!(await pathExists(root, percorso))) missingFiles.push(percorso);
  }

  log("Scansione .md in chats/ sul disco…");
  const onDisk = await walkChatMarkdown(root, signal);
  const indexedByPath = new Map(
    Object.values(chats)
      .filter((c) => c?.percorso)
      .map((c) => [c.percorso, c.uuid]),
  );
  const indexedById = new Map(
    Object.entries(chats).map(([id, c]) => [id, c?.percorso || null]),
  );

  for (const row of onDisk) {
    const indexedId = indexedByPath.get(row.percorso);
    if (!indexedId) {
      if (row.id && indexedById.has(row.id)) {
        const expected = indexedById.get(row.id);
        if (expected && expected !== row.percorso) {
          pathDrift.push(`${row.id}: disco=${row.percorso} indice=${expected}`);
        } else {
          orphans.push(row);
        }
      } else {
        orphans.push(row);
      }
    }
  }

  const okChats =
    Object.keys(chats).length - missingChats.length - idMismatch.length;
  const report = {
    at: new Date().toISOString(),
    indexFile: INDEX_FILE,
    totals: {
      chats: Object.keys(chats).length,
      docs: Object.keys(docs).length,
      files: Object.keys(files).length,
      projects: Object.keys(index.projects || {}).length,
      chatFilesOnDisk: onDisk.length,
    },
    ok: {
      chatsConsistent: Math.max(0, okChats),
    },
    issues: {
      missingChats,
      missingDocs,
      missingFiles,
      idMismatch,
      orphans,
      pathDrift,
    },
    health: health
      ? {
          last_success_at: health.last_success_at || null,
          consecutive_failures: health.consecutive_failures || 0,
          last_error: health.last_error || null,
        }
      : null,
  };

  const issueCount =
    missingChats.length +
    missingDocs.length +
    missingFiles.length +
    idMismatch.length +
    orphans.length +
    pathDrift.length;

  log(
    issueCount === 0
      ? "Vault coerente: nessun problema rilevato."
      : `Vault: ${issueCount} problemi (chat mancanti ${missingChats.length}, ` +
          `docs ${missingDocs.length}, file ${missingFiles.length}, ` +
          `id mismatch ${idMismatch.length}, orfani ${orphans.length}, ` +
          `path drift ${pathDrift.length}).`,
  );

  return report;
}
