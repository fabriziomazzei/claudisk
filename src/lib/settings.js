/**
 * @typedef {{
 *   requestGapMs: number,
 *   requestTimeoutMs: number,
 *   maxRetries: number,
 *   logMaxLines: number,
 *   autoStartOnOpen: boolean,
 *   captureArtifacts: boolean,
 *   captureAttachments: boolean,
 *   captureProjectFiles: boolean,
 *   closeTabWhenDone: boolean,
 *   confirmBeforeWrite: boolean,
 *   writeTags: boolean,
 *   writeRelated: boolean,
 *   notifyOnSyncDone: boolean,
 *   deletedRetentionDays: number,
 *   maxAttachmentMb: number,
 *   locale: "en" | "it",
 *   onboardingDone: boolean,
 * }} MirrorSettings
 */

export const SETTINGS_KEY = "mirrorSettings";

/** @type {MirrorSettings} */
export const DEFAULT_SETTINGS = {
  requestGapMs: 200,
  requestTimeoutMs: 30_000,
  maxRetries: 5,
  logMaxLines: 500,
  autoStartOnOpen: true,
  captureArtifacts: true,
  captureAttachments: true,
  captureProjectFiles: true,
  closeTabWhenDone: false,
  confirmBeforeWrite: true,
  writeTags: true,
  writeRelated: true,
  notifyOnSyncDone: false,
  /** Days to keep soft-deleted files under `_deleted/` before auto-purge. 0 = never. */
  deletedRetentionDays: 30,
  /** Skip downloading attachments larger than this (MB). 0 = no limit. */
  maxAttachmentMb: 25,
  locale: "en",
  onboardingDone: false,
};

export async function loadSettings() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] || {}) };
}

/**
 * @param {Partial<MirrorSettings>} patch
 */
export async function saveSettings(patch) {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  next.requestGapMs = clamp(Number(next.requestGapMs), 0, 5000, 200);
  next.requestTimeoutMs = clamp(Number(next.requestTimeoutMs), 5000, 120_000, 30_000);
  next.maxRetries = clamp(Number(next.maxRetries), 1, 10, 5);
  next.logMaxLines = clamp(Number(next.logMaxLines), 50, 5000, 500);
  next.autoStartOnOpen = Boolean(next.autoStartOnOpen);
  next.captureArtifacts = Boolean(next.captureArtifacts);
  next.captureAttachments = Boolean(next.captureAttachments);
  next.captureProjectFiles = Boolean(next.captureProjectFiles);
  next.closeTabWhenDone = Boolean(next.closeTabWhenDone);
  next.confirmBeforeWrite = Boolean(next.confirmBeforeWrite);
  next.writeTags = Boolean(next.writeTags);
  next.writeRelated = Boolean(next.writeRelated);
  next.notifyOnSyncDone = Boolean(next.notifyOnSyncDone);
  next.deletedRetentionDays = clamp(Number(next.deletedRetentionDays), 0, 365, 30);
  next.maxAttachmentMb = clamp(Number(next.maxAttachmentMb), 0, 500, 25);
  next.locale = next.locale === "it" ? "it" : "en";
  next.onboardingDone = Boolean(next.onboardingDone);
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

function clamp(n, min, max, fallback) {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}
