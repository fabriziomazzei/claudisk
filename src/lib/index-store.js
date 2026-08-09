/**
 * Caricamento / normalizzazione di index.json.
 */

import { readTextFile } from "./fs-write.js";

export const INDEX_FILE = "index.json";

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {(msg: string) => void} progress
 */
export async function loadIndex(root, progress) {
  const text = await readTextFile(root, INDEX_FILE);

  if (text == null) {
    progress("index.json assente, parto da zero");
    return {
      version: 1,
      docs: {},
      files: {},
      attachments: {},
      memory: {},
      projects: {},
      chats: {},
    };
  }

  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") {
    progress("index.json invalido, parto da zero");
    return {
      version: 1,
      docs: {},
      files: {},
      attachments: {},
      memory: {},
      projects: {},
      chats: {},
    };
  }

  if (!parsed.docs || typeof parsed.docs !== "object" || Array.isArray(parsed.docs)) {
    parsed.docs = {};
  }
  if (
    !parsed.projects ||
    typeof parsed.projects !== "object" ||
    Array.isArray(parsed.projects)
  ) {
    parsed.projects = {};
  }
  if (!parsed.chats || typeof parsed.chats !== "object" || Array.isArray(parsed.chats)) {
    parsed.chats = {};
  }
  if (!parsed.files || typeof parsed.files !== "object" || Array.isArray(parsed.files)) {
    parsed.files = {};
  }
  if (
    !parsed.attachments ||
    typeof parsed.attachments !== "object" ||
    Array.isArray(parsed.attachments)
  ) {
    parsed.attachments = {};
  }
  if (!parsed.memory || typeof parsed.memory !== "object" || Array.isArray(parsed.memory)) {
    parsed.memory = {};
  }

  progress(
    `index.json caricato: ${Object.keys(parsed.docs).length} docs, ` +
      `${Object.keys(parsed.files).length} file, ` +
      `${Object.keys(parsed.projects).length} progetti, ` +
      `${Object.keys(parsed.chats).length} chat`,
  );
  return parsed;
}

/**
 * true se `current` è strettamente più recente di `saved`.
 * Se saved manca, current è "nuovo" → più recente.
 */
export function isStrictlyNewer(current, saved) {
  if (!current) return false;
  if (!saved) return true;
  const a = Date.parse(current);
  const b = Date.parse(saved);
  if (Number.isNaN(a)) return false;
  if (Number.isNaN(b)) return true;
  return a > b;
}
