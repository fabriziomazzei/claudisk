/**
 * Injects the ClauDisk button on claude.ai.
 *
 * Content scripts are classic scripts (Chrome ignores "type":"module" here),
 * so shared ES modules are loaded via dynamic import() + web_accessible_resources.
 */

(async () => {
  const [{ setLocale, t }, { SETTINGS_KEY }] = await Promise.all([
    import(chrome.runtime.getURL("src/ui/i18n.js")),
    import(chrome.runtime.getURL("src/lib/settings.js")),
  ]);

  const BUTTON_ID = "claudisk-aggiorna";
  const MIRROR_SYNC_KEY = "mirrorSync";
  const MIRROR_SETUP_KEY = "mirrorSetup";
  const REFRESH_MS = 10 * 60 * 1000;

  async function syncLocaleFromSettings() {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    const locale = data[SETTINGS_KEY]?.locale;
    setLocale(locale === "it" ? "it" : "en");
  }

  function openMirrorTab() {
    // No response expected (SW opens the tab as a side effect). Awaiting a
    // reply races with the offscreen onMessage listener and throws at this line.
    if (!chrome.runtime?.id) return;
    try {
      const sent = chrome.runtime.sendMessage({ type: "open-mirror" });
      if (sent && typeof sent.then === "function") {
        sent.catch((err) => {
          const msg = err?.message || String(err);
          // Expected when another listener (offscreen) closes the port first;
          // the SW still handles the message and opens the tab.
          if (/port closed|receiving end does not exist/i.test(msg)) return;
          console.warn("[claudisk] open-mirror:", msg);
        });
      }
    } catch (err) {
      console.warn("[claudisk] open-mirror:", err?.message || err);
    }
  }

  function formatAgo(iso) {
    if (!iso) return null;
    const ms = Date.now() - Date.parse(iso);
    if (Number.isNaN(ms) || ms < 0) return null;
    if (ms < 60_000) return t("content.agoNow");
    if (ms < 3_600_000) {
      return t("content.agoMin", { n: Math.max(1, Math.round(ms / 60_000)) });
    }
    if (ms < 86_400_000) {
      return t("content.agoHour", { n: Math.max(1, Math.round(ms / 3_600_000)) });
    }
    return t("content.agoDay", { n: Math.max(1, Math.round(ms / 86_400_000)) });
  }

  function isStrictlyNewer(current, saved) {
    if (!current) return false;
    if (!saved) return true;
    const a = Date.parse(current);
    const b = Date.parse(saved);
    if (Number.isNaN(a)) return false;
    if (Number.isNaN(b)) return true;
    return a > b;
  }

  function readOrgIdFromCookie() {
    const match = document.cookie.match(/(?:^|;\s*)lastActiveOrg=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async function fetchAllConversationSummaries(orgId) {
    const all = [];
    let offset = 0;
    const limit = 30;

    for (;;) {
      const url =
        `/api/organizations/${orgId}/chat_conversations_v2` +
        `?limit=${limit}&offset=${offset}&consistency=eventual`;
      const res = await fetch(url, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`conversation list HTTP ${res.status}`);
      }
      const body = await res.json();
      const batch = Array.isArray(body?.data) ? body.data : [];
      all.push(...batch);
      if (!body?.has_more || batch.length === 0) break;
      offset += limit;
    }

    return all;
  }

  function pushBadgeCount(count) {
    if (!chrome.runtime?.id) return;
    try {
      const sent = chrome.runtime.sendMessage({ type: "set-badge", count });
      if (sent && typeof sent.then === "function") {
        sent.catch(() => {
          /* offscreen/SW race or invalidated context */
        });
      }
    } catch {
      /* extension context invalidated */
    }
  }

  /**
   * @param {HTMLButtonElement} btn
   * @param {string} label
   * @param {{ failing?: boolean, title?: string, loading?: boolean, disabled?: boolean }} [opts]
   */
  function setButtonState(btn, label, opts = {}) {
    btn.textContent = label;
    btn.classList.toggle("claudisk-failing", Boolean(opts.failing));
    btn.classList.toggle("claudisk-loading", Boolean(opts.loading));
    const disabled = Boolean(opts.loading || opts.disabled);
    btn.disabled = disabled;
    btn.setAttribute("aria-busy", opts.loading ? "true" : "false");
    btn.title = opts.title || label;
  }

  async function loadSetup() {
    const data = await chrome.storage.local.get(MIRROR_SETUP_KEY);
    const raw = data[MIRROR_SETUP_KEY];
    if (!raw || typeof raw !== "object") {
      return { ready: false, folderName: null };
    }
    return {
      ready: Boolean(raw.ready),
      folderName: raw.folderName ? String(raw.folderName) : null,
    };
  }

  async function refreshBadge(btn, opts = {}) {
    await syncLocaleFromSettings();
    const showLoading = opts.showLoading !== false;
    if (showLoading) {
      setButtonState(btn, t("content.loading"), {
        loading: true,
        title: t("content.loadingTitle"),
      });
    }

    const setup = await loadSetup();
    const syncBag = await chrome.storage.local.get(MIRROR_SYNC_KEY);
    const sync = syncBag[MIRROR_SYNC_KEY];

    if (!setup.ready) {
      pushBadgeCount(0);
      if (setup.folderName) {
        setButtonState(btn, t("content.reconfirm"), {
          title: t("content.reconfirmTitle", { folder: setup.folderName }),
        });
      } else if (sync?.lastSuccessAt || sync?.vistoIlByChat) {
        setButtonState(btn, t("content.openMirror"), {
          title: t("content.openMirrorTitle"),
        });
      } else {
        setButtonState(btn, t("content.configure"), {
          title: t("content.configureTitle"),
        });
      }
      return;
    }

    const map = sync?.vistoIlByChat;
    const failing = (sync?.consecutiveFailures || 0) >= 2;

    if (!map || typeof map !== "object" || Object.keys(map).length === 0) {
      pushBadgeCount(0);
      setButtonState(btn, t("content.updateNever"), { failing });
      return;
    }

    const orgId = readOrgIdFromCookie();
    if (!orgId) {
      pushBadgeCount(0);
      setButtonState(btn, t("content.updateNever"), { failing });
      return;
    }

    try {
      const list = await fetchAllConversationSummaries(orgId);
      let changed = 0;
      for (const item of list) {
        if (!item?.uuid) continue;
        if (isStrictlyNewer(item.updated_at, map[item.uuid])) changed += 1;
      }

      pushBadgeCount(changed);
      const ago = formatAgo(sync.lastSuccessAt);
      if (changed === 0) {
        setButtonState(btn, ago ? t("content.updateOk", { ago }) : t("btn.update"), {
          failing,
        });
      } else {
        const label = ago
          ? t("content.updateNewAgo", { n: changed, ago })
          : t("content.updateNew", { n: changed });
        setButtonState(btn, label, { failing });
      }
    } catch (err) {
      console.warn("[claudisk] badge:", err);
      const ago = formatAgo(sync.lastSuccessAt);
      setButtonState(btn, ago ? t("content.updateOk", { ago }) : t("btn.update"), {
        failing,
      });
    }
  }

  function buildButton() {
    const btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.type = "button";
    btn.textContent = t("content.loading");
    btn.title = t("content.loadingTitle");
    btn.disabled = true;
    btn.classList.add("claudisk-loading");
    btn.setAttribute("aria-busy", "true");
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (btn.disabled || btn.classList.contains("claudisk-loading")) return;
      openMirrorTab();
    });
    return btn;
  }

  function ensureButton() {
    let btn = document.getElementById(BUTTON_ID);
    if (btn) return /** @type {HTMLButtonElement} */ (btn);
    if (!document.body) return null;
    btn = buildButton();
    document.body.appendChild(btn);
    return btn;
  }

  function onDomChanged() {
    if (document.getElementById(BUTTON_ID)) return;
    const btn = ensureButton();
    if (btn) refreshBadge(btn).catch(() => {});
  }

  async function start() {
    await syncLocaleFromSettings();
    const btn = ensureButton();
    if (btn) refreshBadge(btn).catch(() => {});

    const observer = new MutationObserver(onDomChanged);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    setInterval(onDomChanged, 2000);
    setInterval(() => {
      const current = document.getElementById(BUTTON_ID);
      if (current) refreshBadge(current, { showLoading: false }).catch(() => {});
    }, REFRESH_MS);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (
        !changes[MIRROR_SYNC_KEY] &&
        !changes[MIRROR_SETUP_KEY] &&
        !changes[SETTINGS_KEY]
      ) {
        return;
      }
      const current = document.getElementById(BUTTON_ID);
      if (current) refreshBadge(current, { showLoading: false }).catch(() => {});
    });
  }

  if (document.body) {
    await start();
  } else {
    await new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
    await start();
  }
})().catch((err) => {
  console.error("[claudisk] content script failed:", err);
});
