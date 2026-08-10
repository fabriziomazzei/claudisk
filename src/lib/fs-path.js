/**
 * Path relativi rispetto alla root del mirror (es. "Proj/chats/uuid.md").
 *
 * Soft-delete (fetta 8): non cancella mai davvero - sposta sotto _deleted/
 * conservando la struttura. Se la destinazione esiste, suffisso data.
 */

import {
  ensureDir,
  writeTextFile,
  readTextFile,
  writeBinaryFile,
} from "./fs-write.js";

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {string} relativePath
 */
export async function resolveParentDir(root, relativePath) {
  const parts = relativePath.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) throw new Error(`Percorso non valido: ${relativePath}`);
  let dir = root;
  for (const part of parts) {
    dir = await ensureDir(dir, part);
  }
  return { dir, fileName, parts };
}

export async function writeTextAt(root, relativePath, text) {
  const { dir, fileName } = await resolveParentDir(root, relativePath);
  await writeTextFile(dir, fileName, text);
}

export async function readTextAt(root, relativePath) {
  const parts = relativePath.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) return null;
  let dir = root;
  for (const part of parts) {
    try {
      dir = await dir.getDirectoryHandle(part);
    } catch (err) {
      if (err?.name === "NotFoundError") return null;
      throw err;
    }
  }
  return readTextFile(dir, fileName);
}

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {string} relativePath
 * @returns {Promise<ArrayBuffer | null>}
 */
export async function readBinaryAt(root, relativePath) {
  const parts = relativePath.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) return null;
  let dir = root;
  for (const part of parts) {
    try {
      dir = await dir.getDirectoryHandle(part);
    } catch (err) {
      if (err?.name === "NotFoundError") return null;
      throw err;
    }
  }
  try {
    const fileHandle = await dir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.arrayBuffer();
  } catch (err) {
    if (err?.name === "NotFoundError") return null;
    throw err;
  }
}

export async function writeBinaryAt(root, relativePath, data) {
  const { dir, fileName } = await resolveParentDir(root, relativePath);
  await writeBinaryFile(dir, fileName, data);
}

export async function removeFileAt(root, relativePath) {
  const parts = relativePath.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) return false;
  let dir = root;
  for (const part of parts) {
    try {
      dir = await dir.getDirectoryHandle(part);
    } catch (err) {
      if (err?.name === "NotFoundError") return false;
      throw err;
    }
  }
  try {
    await dir.removeEntry(fileName);
    return true;
  } catch (err) {
    if (err?.name === "NotFoundError") return false;
    throw err;
  }
}

/**
 * Sposta un file (lettura + scrittura + delete). Non elimina directory.
 */
export async function moveFileAt(root, fromPath, toPath) {
  if (fromPath === toPath) return;
  const text = await readTextAt(root, fromPath);
  if (text == null) {
    throw new Error(`Impossibile spostare: origine assente (${fromPath})`);
  }
  await writeTextAt(root, toPath, text);
  await removeFileAt(root, fromPath);
}

/**
 * @param {FileSystemDirectoryHandle} dir
 * @param {string} name
 */
async function entryExists(dir, name) {
  try {
    await dir.getFileHandle(name);
    return "file";
  } catch (err) {
    if (err?.name !== "NotFoundError") throw err;
  }
  try {
    await dir.getDirectoryHandle(name);
    return "directory";
  } catch (err) {
    if (err?.name === "NotFoundError") return null;
    throw err;
  }
}

/**
 * Destinazione sotto _deleted/ con suffisso data se già occupata.
 * @param {FileSystemDirectoryHandle} root
 * @param {string} relativePath percorso originale (senza _deleted/)
 * @param {"file" | "directory"} kind
 */
async function resolveDeletedDestination(root, relativePath, kind) {
  const clean = relativePath.replace(/^\/+/, "").replace(/^_deleted\//, "");
  const parts = clean.split("/").filter(Boolean);
  const baseName = parts.pop();
  if (!baseName) throw new Error(`Percorso non valido: ${relativePath}`);

  const deletedRoot = await ensureDir(root, "_deleted");
  let parent = deletedRoot;
  for (const part of parts) {
    parent = await ensureDir(parent, part);
  }

  let destName = baseName;
  if (await entryExists(parent, destName)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (kind === "directory") {
      destName = `${baseName}__${stamp}`;
    } else {
      const m = baseName.match(/^(.*?)(\.[^.]+)?$/);
      const stem = m?.[1] || baseName;
      const ext = m?.[2] || "";
      destName = `${stem}__${stamp}${ext}`;
    }
  }

  const destRelative = ["_deleted", ...parts, destName].join("/");
  return { parent, destName, destRelative };
}

/**
 * Soft-delete di un file: copia byte-identica in _deleted/, poi rimuove l'originale.
 * NON cancella senza copia. Mai.
 * @param {FileSystemDirectoryHandle} root
 * @param {string} relativePath
 */
export async function softDeleteRelativePath(root, relativePath) {
  const buffer = await readBinaryAt(root, relativePath);
  if (buffer == null) {
    throw new Error(`Origine assente: ${relativePath}`);
  }
  const { parent, destName, destRelative } = await resolveDeletedDestination(
    root,
    relativePath,
    "file",
  );
  await writeBinaryFile(parent, destName, buffer);
  await removeFileAt(root, relativePath);
  return destRelative;
}

/**
 * Soft-delete ricorsivo di una directory (se esiste).
 * @param {FileSystemDirectoryHandle} root
 * @param {string} relativeDir
 */
export async function softDeleteDirectoryRelative(root, relativeDir) {
  const parts = relativeDir.split("/").filter(Boolean);
  if (!parts.length) return null;

  let src = root;
  for (const part of parts) {
    try {
      src = await src.getDirectoryHandle(part);
    } catch (err) {
      if (err?.name === "NotFoundError") return null;
      throw err;
    }
  }

  const { destRelative } = await resolveDeletedDestination(
    root,
    relativeDir,
    "directory",
  );

  async function copyDir(fromDir, toRelative) {
    const destParts = toRelative.split("/").filter(Boolean);
    let dest = root;
    for (const p of destParts) {
      dest = await ensureDir(dest, p);
    }
    for await (const [name, handle] of fromDir.entries()) {
      if (handle.kind === "directory") {
        await copyDir(handle, `${toRelative}/${name}`);
      } else {
        const file = await handle.getFile();
        const buf = await file.arrayBuffer();
        await writeBinaryFile(dest, name, buf);
      }
    }
  }

  await copyDir(src, destRelative);

  const parentParts = parts.slice(0, -1);
  const leaf = parts[parts.length - 1];
  let parent = root;
  for (const p of parentParts) {
    parent = await parent.getDirectoryHandle(p);
  }
  await parent.removeEntry(leaf, { recursive: true });
  return destRelative;
}

/**
 * Svuota _deleted/ (dopo conferma UI).
 * @param {FileSystemDirectoryHandle} root
 */
export async function emptyDeletedFolder(root) {
  try {
    await root.removeEntry("_deleted", { recursive: true });
    return true;
  } catch (err) {
    if (err?.name === "NotFoundError") return false;
    throw err;
  }
}

/**
 * Remove files under `_deleted/` older than `days` (by lastModified).
 * @param {FileSystemDirectoryHandle} root
 * @param {number} days 0 = no-op
 * @returns {Promise<{ removed: number, bytes: number }>}
 */
export async function purgeDeletedOlderThan(root, days) {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return { removed: 0, bytes: 0 };
  const cutoff = Date.now() - n * 24 * 60 * 60 * 1000;
  let removed = 0;
  let bytes = 0;

  /** @type {FileSystemDirectoryHandle} */
  let deletedRoot;
  try {
    deletedRoot = await root.getDirectoryHandle("_deleted");
  } catch (err) {
    if (err?.name === "NotFoundError") return { removed: 0, bytes: 0 };
    throw err;
  }

  /**
   * @param {FileSystemDirectoryHandle} dir
   * @param {string[]} pathParts
   */
  async function walk(dir, pathParts) {
    /** @type {{ name: string, handle: FileSystemHandle }[]} */
    const entries = [];
    for await (const [name, handle] of dir.entries()) {
      entries.push({ name, handle });
    }
    for (const { name, handle } of entries) {
      if (handle.kind === "directory") {
        await walk(/** @type {FileSystemDirectoryHandle} */ (handle), [
          ...pathParts,
          name,
        ]);
        // Best-effort: drop empty dirs after purge
        try {
          let empty = true;
          for await (const _ of /** @type {FileSystemDirectoryHandle} */ (
            handle
          ).entries()) {
            empty = false;
            break;
          }
          if (empty) await dir.removeEntry(name);
        } catch {
          /* ignore */
        }
        continue;
      }
      try {
        const file = await /** @type {FileSystemFileHandle} */ (handle).getFile();
        if (file.lastModified < cutoff) {
          bytes += file.size;
          await dir.removeEntry(name);
          removed += 1;
        }
      } catch {
        /* ignore */
      }
    }
  }

  await walk(deletedRoot, []);
  return { removed, bytes };
}

/**
 * @param {FileSystemDirectoryHandle} root
 */
export async function measureDeletedStats(root) {
  try {
    const dir = await root.getDirectoryHandle("_deleted");
    let files = 0;
    let bytes = 0;
    async function walk(d) {
      for await (const [, handle] of d.entries()) {
        if (handle.kind === "directory") {
          await walk(handle);
        } else {
          try {
            const file = await handle.getFile();
            files += 1;
            bytes += file.size;
          } catch {
            /* ignore */
          }
        }
      }
    }
    await walk(dir);
    return { files, bytes, exists: true };
  } catch (err) {
    if (err?.name === "NotFoundError") {
      return { files: 0, bytes: 0, exists: false };
    }
    throw err;
  }
}
