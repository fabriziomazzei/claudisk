/**
 * Fetta 7: memoria organizzazione.
 * Non deve mai far fallire una passata: errori → log e prosegui.
 */

import { claudeFetchJson, gap, throwIfAborted } from "./api.js";
import { sha256Hex } from "./names.js";
import { ensureDir, writeJsonFile, writeTextFile } from "./fs-write.js";

/**
 * @param {any} body
 * @returns {boolean}
 */
function isValidMemoryShape(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  if (typeof body.memory !== "string") return false;
  if (body.controls != null && !Array.isArray(body.controls)) return false;
  return true;
}

/**
 * @param {any} body
 * @param {string} capturedAt
 */
export function memoryToMarkdown(body, capturedAt) {
  const lines = [
    "---",
    `catturata_il: ${capturedAt}`,
  ];
  if (body.updated_at) {
    lines.push(`updated_at: ${body.updated_at}`);
  }
  lines.push("---", "", "# Memoria", "");

  const memoryText = String(body.memory || "").trim();
  if (memoryText) {
    lines.push(memoryText, "");
  } else {
    lines.push("_(vuota)_", "");
  }

  const controls = Array.isArray(body.controls) ? body.controls : [];
  if (controls.length) {
    lines.push("## Controlli utente", "");
    for (const c of controls) {
      const text = String(c ?? "").trim();
      if (!text) continue;
      lines.push(`- ${text}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Contenuto su cui calcolare l'hash (stabile, senza catturata_il).
 * @param {any} body
 */
export function memoryHashSource(body) {
  const controls = Array.isArray(body.controls)
    ? body.controls.map((c) => String(c ?? ""))
    : [];
  return JSON.stringify({
    memory: String(body.memory ?? ""),
    controls,
    updated_at: body.updated_at ?? null,
  });
}

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {any} index
 * @param {string} orgId
 * @param {{
 *   force?: boolean,
 *   signal?: AbortSignal,
 *   onLog?: (s: string) => void,
 *   progress?: { beginPhase: Function, step: Function },
 *   pauseGate?: () => Promise<void>,
 * }} [options]
 */
export async function captureMemory(root, index, orgId, options = {}) {
  const {
    force = false,
    signal,
    onLog = () => {},
    progress = null,
    pauseGate = async () => {},
  } = options;

  const log = (msg) => {
    onLog(msg);
  };

  const stats = {
    status: /** @type {"updated" | "unchanged" | "skipped" | "error"} */ (
      "skipped"
    ),
    written: false,
  };

  progress?.beginPhase("memory", 1, "Memoria");

  try {
    throwIfAborted(signal);
    await pauseGate();
    await gap(signal);

    let body;
    try {
      body = await claudeFetchJson(
        `/api/organizations/${orgId}/memory`,
        { signal },
      );
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      log(`Memoria: endpoint errore (${err?.message || err}) - non tocco _memoria.md`);
      stats.status = "error";
      return stats;
    }

    if (!isValidMemoryShape(body)) {
      log("Memoria: forma inattesa - non tocco _memoria.md");
      stats.status = "error";
      return stats;
    }

    if (!index.memory || typeof index.memory !== "object") {
      index.memory = {};
    }

    const hash = await sha256Hex(memoryHashSource(body));
    const prevHash = index.memory.hash || null;

    if (!force && prevHash && prevHash === hash) {
      log("Memoria invariata (hash)");
      stats.status = "unchanged";
      return stats;
    }

    const capturedAt = new Date().toISOString();
    const markdown = memoryToMarkdown(body, capturedAt);
    const rawDir = await ensureDir(root, "_raw");
    await writeJsonFile(rawDir, "memory.json", body);
    await writeTextFile(root, "_memoria.md", markdown);

    index.memory = {
      percorso: "_memoria.md",
      hash,
      visto_il: capturedAt,
      updated_at: body.updated_at || null,
    };

    stats.status = "updated";
    stats.written = true;
    log("Memoria aggiornata");
    return stats;
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    log(`Memoria: errore non fatale (${err?.message || err})`);
    stats.status = "error";
    return stats;
  } finally {
    progress?.step("Memoria");
  }
}
