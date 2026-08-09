/**
 * Scrittura/lettura su FileSystemDirectoryHandle.
 */

export async function ensureDir(parent, name) {
  return parent.getDirectoryHandle(name, { create: true });
}

export async function writeTextFile(dirHandle, fileName, text) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

export async function writeJsonFile(dirHandle, fileName, value) {
  await writeTextFile(
    dirHandle,
    fileName,
    JSON.stringify(value, null, 2) + "\n",
  );
}

/**
 * Scrive bytes grezzi (PDF, docx, immagini, …).
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {string} fileName
 * @param {ArrayBuffer | Uint8Array | Blob} data
 */
export async function writeBinaryFile(dirHandle, fileName, data) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

export async function readTextFile(dirHandle, fileName) {
  let fileHandle;
  try {
    fileHandle = await dirHandle.getFileHandle(fileName);
  } catch (err) {
    if (err?.name === "NotFoundError") return null;
    throw err;
  }
  const file = await fileHandle.getFile();
  return await file.text();
}

export async function readJsonFile(dirHandle, fileName) {
  const text = await readTextFile(dirHandle, fileName);
  if (text == null) return null;
  return JSON.parse(text);
}

/**
 * Crea path tipo a/b/c come directory nested, restituisce l'handle finale.
 * @param {FileSystemDirectoryHandle} root
 * @param {string[]} parts
 */
export async function ensurePath(root, parts) {
  let current = root;
  for (const part of parts) {
    current = await ensureDir(current, part);
  }
  return current;
}
