/**
 * Stato sync per il badge del content script (solo chrome.storage.local).
 */

export const MIRROR_SYNC_KEY = "mirrorSync";

/**
 * @param {any} index
 * @param {{ ok: boolean, consecutiveFailures?: number }} result
 */
export async function writeMirrorSync(index, result) {
  const prev = (await chrome.storage.local.get(MIRROR_SYNC_KEY))[MIRROR_SYNC_KEY] || {};

  /** @type {Record<string, string>} */
  const vistoIlByChat = {};
  for (const [uuid, entry] of Object.entries(index.chats || {})) {
    if (entry?.visto_il) vistoIlByChat[uuid] = entry.visto_il;
  }

  /** @type {Record<string, string>} */
  const updatedAtByProject = {};
  for (const [id, entry] of Object.entries(index.projects || {})) {
    if (entry?.updated_at) updatedAtByProject[id] = entry.updated_at;
  }

  const consecutiveFailures = result.ok
    ? 0
    : (result.consecutiveFailures ?? (prev.consecutiveFailures || 0) + 1);

  /** @type {Record<string, unknown>} */
  const next = {
    vistoIlByChat,
    updatedAtByProject,
    lastSuccessAt: result.ok
      ? new Date().toISOString()
      : prev.lastSuccessAt || null,
    consecutiveFailures,
    updatedAt: new Date().toISOString(),
  };

  await chrome.storage.local.set({ [MIRROR_SYNC_KEY]: next });
  return next;
}

export async function bumpMirrorSyncFailure() {
  const prev = (await chrome.storage.local.get(MIRROR_SYNC_KEY))[MIRROR_SYNC_KEY] || {};
  const next = {
    ...prev,
    vistoIlByChat: prev.vistoIlByChat || {},
    consecutiveFailures: (prev.consecutiveFailures || 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ [MIRROR_SYNC_KEY]: next });
  return next;
}
