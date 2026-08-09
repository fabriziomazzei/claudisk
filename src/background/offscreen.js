/**
 * Offscreen document: legge l'handle da IndexedDB (chiave "root")
 * e scrive _health.json. Nessun handle nei messaggi.
 */

import {
  loadDirectoryHandle,
  queryWritePermission,
  writeHealthProbe,
} from "../lib/fs-store.js";

const bootedAt = Date.now();

/**
 * @param {string} via
 */
async function writeFromIdb(via) {
  const startedAt = new Date().toISOString();
  const aliveMs = Date.now() - bootedAt;

  const base = {
    at: startedAt,
    via,
    source: "offscreen",
    offscreenAliveMs: aliveMs,
  };

  try {
    const handle = await loadDirectoryHandle();
    if (!handle) {
      const entry = {
        ...base,
        ok: false,
        permission: null,
        error: 'Nessun handle in IndexedDB (chiave "root").',
      };
      console.warn("[offscreen] no handle", entry);
      return entry;
    }

    if (typeof handle.getFileHandle !== "function") {
      const entry = {
        ...base,
        ok: false,
        permission: null,
        error: "Valore in IDB non è un FileSystemDirectoryHandle valido.",
        receivedType: typeof handle,
      };
      console.warn("[offscreen] bad handle", entry);
      return entry;
    }

    let permission = "unknown";
    try {
      permission = await queryWritePermission(handle);
    } catch (err) {
      const entry = {
        ...base,
        ok: false,
        folder: handle.name,
        permission: null,
        error: `queryPermission fallita: ${err?.message || err}`,
        errorName: err?.name,
      };
      console.warn("[offscreen] queryPermission threw", entry);
      return entry;
    }

    if (permission !== "granted") {
      const entry = {
        ...base,
        ok: false,
        folder: handle.name,
        permission,
        error: `queryPermission = "${permission}" (non granted). Scrittura saltata.`,
      };
      console.warn("[offscreen] permission not granted", entry);
      return entry;
    }

    const payload = await writeHealthProbe(handle, {
      source: "offscreen",
      via,
      permission,
      offscreen_alive_ms: aliveMs,
    });

    const entry = {
      ...base,
      ok: true,
      folder: handle.name,
      permission,
      written_at: payload.written_at,
    };
    return entry;
  } catch (err) {
    const entry = {
      ...base,
      ok: false,
      permission: null,
      error: err?.message || String(err),
      errorName: err?.name,
    };
    console.error("[offscreen] write failed", entry);
    return entry;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;
  if (message.target !== "offscreen") return;

  if (message.type === "offscreen-write") {
    writeFromIdb(message.via || "unknown")
      .then(sendResponse)
      .catch((err) =>
        sendResponse({
          ok: false,
          source: "offscreen",
          permission: null,
          error: err?.message || String(err),
          offscreenAliveMs: Date.now() - bootedAt,
        }),
      );
    return true;
  }

  if (message.type === "offscreen-status") {
    sendResponse({
      ok: true,
      offscreenAliveMs: Date.now() - bootedAt,
      bootedAt,
    });
    return;
  }
});
