/**
 * Stato setup obbligatorio (cartella + permesso).
 * Solo chrome.storage.local: il content script non legge IndexedDB.
 */

export const MIRROR_SETUP_KEY = "mirrorSetup";

/**
 * @typedef {{
 *   ready: boolean,
 *   folderName: string | null,
 *   updatedAt: string,
 * }} MirrorSetup
 */

/** @returns {Promise<MirrorSetup>} */
export async function loadMirrorSetup() {
  const data = await chrome.storage.local.get(MIRROR_SETUP_KEY);
  const raw = data[MIRROR_SETUP_KEY];
  if (!raw || typeof raw !== "object") {
    return { ready: false, folderName: null, updatedAt: "" };
  }
  return {
    ready: Boolean(raw.ready),
    folderName: raw.folderName ? String(raw.folderName) : null,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : "",
  };
}

/**
 * @param {{ ready: boolean, folderName?: string | null }} state
 * @returns {Promise<MirrorSetup>}
 */
export async function writeMirrorSetup(state) {
  /** @type {MirrorSetup} */
  const next = {
    ready: Boolean(state.ready),
    folderName: state.folderName ? String(state.folderName) : null,
    updatedAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ [MIRROR_SETUP_KEY]: next });
  return next;
}
