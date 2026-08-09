/**
 * Cronologia delle ultime sync (chrome.storage.local).
 */

export const SYNC_HISTORY_KEY = "mirrorSyncHistory";
const MAX = 10;

/**
 * @param {{
 *   at: string,
 *   force: boolean,
 *   ok: boolean,
 *   chatsCaptured: number,
 *   chatsNew: number,
 *   chatsUpdated: number,
 *   chatsRenamed: number,
 *   docsWritten: number,
 *   artifacts: number,
 *   errors: number,
 *   durationMs?: number,
 * }} entry
 */
export async function pushSyncHistory(entry) {
  const data = await chrome.storage.local.get(SYNC_HISTORY_KEY);
  const list = Array.isArray(data[SYNC_HISTORY_KEY]) ? data[SYNC_HISTORY_KEY] : [];
  list.unshift(entry);
  await chrome.storage.local.set({ [SYNC_HISTORY_KEY]: list.slice(0, MAX) });
  return list.slice(0, MAX);
}

export async function loadSyncHistory() {
  const data = await chrome.storage.local.get(SYNC_HISTORY_KEY);
  return Array.isArray(data[SYNC_HISTORY_KEY]) ? data[SYNC_HISTORY_KEY] : [];
}
