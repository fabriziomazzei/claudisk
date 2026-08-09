/**
 * Meta sync (primo passaggio dopo installazione, ecc.).
 * Solo chrome.storage.local.
 */

export const SYNC_META_KEY = "mirrorSyncMeta";

/**
 * @typedef {{ firstSyncDone: boolean, updatedAt: string }} MirrorSyncMeta
 */

/** @returns {Promise<MirrorSyncMeta>} */
export async function loadSyncMeta() {
  const data = await chrome.storage.local.get(SYNC_META_KEY);
  const raw = data[SYNC_META_KEY];
  return {
    firstSyncDone: Boolean(raw?.firstSyncDone),
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : "",
  };
}

/**
 * @param {Partial<MirrorSyncMeta>} patch
 */
export async function saveSyncMeta(patch) {
  const current = await loadSyncMeta();
  const next = {
    firstSyncDone: Boolean(
      patch.firstSyncDone !== undefined
        ? patch.firstSyncDone
        : current.firstSyncDone,
    ),
    updatedAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ [SYNC_META_KEY]: next });
  return next;
}
