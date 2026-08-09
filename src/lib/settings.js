/**
 * Impostazioni mirror (solo chrome.storage.local).
 */

export const SETTINGS_KEY = "mirrorSettings";

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
 *   locale: "en" | "it",
 *   onboardingDone: boolean,
 * }} MirrorSettings
 */

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
  next.locale = next.locale === "it" ? "it" : "en";
  next.onboardingDone = Boolean(next.onboardingDone);
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

function clamp(n, min, max, fallback) {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
