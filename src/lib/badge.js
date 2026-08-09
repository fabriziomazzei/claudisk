/**
 * Toolbar badge: count of chats newer than last sync.
 */

/**
 * @param {number} count
 */
export async function setActionBadge(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  try {
    if (n <= 0) {
      await chrome.action.setBadgeText({ text: "" });
      return;
    }
    const text = n > 99 ? "99+" : String(n);
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: "#C45C26" });
    if (chrome.action.setBadgeTextColor) {
      await chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
    }
  } catch {
    /* action may be unavailable in some contexts */
  }
}

export async function clearActionBadge() {
  return setActionBadge(0);
}
