/**
 * Persistenza dell'handle di cartella via IndexedDB.
 * chrome.storage non serializza FileSystemHandle.
 * Popup e service worker condividono lo stesso db/chiave (stessa origine).
 */

const DB_NAME = "claude-mirror";
const DB_VERSION = 1;
const STORE = "handles";
export const KEY = "root";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export async function saveDirectoryHandle(handle) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDirectoryHandle() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

const RW = { mode: "readwrite" };

export async function queryWritePermission(handle) {
  return handle.queryPermission(RW);
}

export async function requestWritePermission(handle) {
  return handle.requestPermission(RW);
}

/**
 * Scrive _health.json nella cartella collegata.
 * Richiede permesso readwrite già concesso.
 * @param {FileSystemDirectoryHandle} handle
 * @param {Record<string, unknown>} [extra]
 */
export async function writeHealthProbe(handle, extra = {}) {
  const fileHandle = await handle.getFileHandle("_health.json", {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  const payload = {
    written_at: new Date().toISOString(),
    ...extra,
  };
  await writable.write(JSON.stringify(payload, null, 2) + "\n");
  await writable.close();
  return payload;
}
