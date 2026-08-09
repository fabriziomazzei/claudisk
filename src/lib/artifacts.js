/**
 * Estrazione artefatti dai tool_use create_file / write_file / update_file.
 */

import { sanitizeFileName } from "./names.js";

const ARTIFACT_TOOLS = new Set(["create_file", "write_file", "update_file"]);

function basename(path) {
  const parts = String(path || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);
  return parts.pop() || "";
}

function extensionOf(path) {
  const base = basename(path);
  const m = base.match(/(\.[A-Za-z0-9]{1,12})$/);
  return m ? m[1] : "";
}

/**
 * Nome file finale sanificato (decisione 6).
 * @param {string} sourcePath
 * @param {number} anonIndex 1-based per nomi vuoti
 */
export function artifactFileName(sourcePath, anonIndex) {
  let base = basename(sourcePath);
  if (!base) {
    base = `artefatto-${anonIndex}${extensionOf(sourcePath)}`;
  }
  const cleaned = sanitizeFileName(base);
  return cleaned || `artefatto-${anonIndex}${extensionOf(sourcePath)}`;
}

/**
 * Raccoglie gli artefatti dal ramo attivo.
 * Stesso nome file = revisione: resta l'ultima.
 *
 * @param {any[]} branch
 */
export function collectArtifacts(branch) {
  /** @type {Map<string, { fileName: string, content: string, sourcePath: string }>} */
  const byFileName = new Map();
  let anon = 0;

  /** Occorrenze in ordine (per i riferimenti nel markdown). */
  const occurrences = [];

  for (const msg of branch) {
    if (msg?.truncated === true) continue;
    for (const block of msg.content || []) {
      if (block?.type !== "tool_use") continue;
      if (!ARTIFACT_TOOLS.has(block.name)) continue;

      const input = block.input || {};
      const rawContent = input.file_text ?? input.content;
      if (rawContent == null) continue;

      const sourcePath = String(input.path || input.file_path || "");
      const needsAnon = !basename(sourcePath);
      if (needsAnon) anon += 1;
      const fileName = artifactFileName(sourcePath, anon);
      const content = String(rawContent);

      byFileName.set(fileName, { fileName, content, sourcePath });
      occurrences.push({
        blockId: block.id || null,
        fileName,
        displayName: basename(sourcePath) || fileName,
      });
    }
  }

  return {
    files: [...byFileName.values()],
    occurrences,
  };
}

export function isArtifactToolUse(block) {
  return block?.type === "tool_use" && ARTIFACT_TOOLS.has(block.name);
}
