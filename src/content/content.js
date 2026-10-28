/**
 * While claude.ai is open, count chats and projects newer than the last sync
 * and push that count to the toolbar badge. The page itself stays untouched:
 * Claude's layout has no room for an overlay button.
 */

(async () => {
  const MIRROR_SYNC_KEY = "mirrorSync";
  const MIRROR_SETUP_KEY = "mirrorSetup";
  const REFRESH_MS = 10 * 60 * 1000;

  document.getElementById("claudisk-aggiorna")?.remove();

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

  /** Login / OAuth callback: session API is unavailable; skip badge fetch. */
  function isAuthPage() {
    const path = location.pathname || "";
    return path === "/login" || path.startsWith("/login/");
  }

  function isExpectedBadgeFetchError(err) {
    const msg = err?.message || String(err || "");
    return (
      /Failed to fetch|NetworkError|Load failed|HTTP 401|HTTP 403/i.test(msg) ||
      err?.name === "TypeError"
    );
  }

  async function fetchAllConversationSummaries(orgId) {
    const all = [];
    let offset = 0;
    const limit = 30;

    for (;;) {
      const url =
        `https://claude.ai/api/organizations/${orgId}/chat_conversations_v2` +
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

  async function fetchAllProjects(orgId) {
    const all = [];
    const seen = new Set();
    let offset = 0;
    const limit = 30;

    for (;;) {
      const url =
        `https://claude.ai/api/organizations/${orgId}/projects` +
        `?include_harmony_projects=true&limit=${limit}&offset=${offset}` +
        `&creator_filter=is_creator&order_by=latest_activity`;
      const res = await fetch(url, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`project list HTTP ${res.status}`);
      }
      const body = await res.json();
      const batch = Array.isArray(body)
        ? body
        : (Array.isArray(body?.data) ? body.data : []);
      let fresh = 0;
      for (const project of batch) {
        const id = project?.uuid;
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        all.push(project);
        fresh += 1;
      }
      const hasMore = body?.pagination?.has_more ?? body?.has_more;
      if (batch.length === 0 || fresh === 0) break;
      if (hasMore === false) break;
      if (batch.length < limit) break;
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

  async function loadSetup() {
    const data = await chrome.storage.local.get(MIRROR_SETUP_KEY);
    const raw = data[MIRROR_SETUP_KEY];
    if (!raw || typeof raw !== "object") {
      return { ready: false };
    }
    return { ready: Boolean(raw.ready) };
  }

  async function refreshBadge() {
    const setup = await loadSetup();
    const syncBag = await chrome.storage.local.get(MIRROR_SYNC_KEY);
    const sync = syncBag[MIRROR_SYNC_KEY];

    if (!setup.ready) {
      pushBadgeCount(0);
      return;
    }

    const map = sync?.vistoIlByChat;
    if (!map || typeof map !== "object" || Object.keys(map).length === 0) {
      pushBadgeCount(0);
      return;
    }

    // Mid Google/OAuth login: cookie may still exist but API is unreachable.
    if (isAuthPage()) return;

    const orgId = readOrgIdFromCookie();
    if (!orgId) {
      pushBadgeCount(0);
      return;
    }

    try {
      const list = await fetchAllConversationSummaries(orgId);
      let changed = 0;
      for (const item of list) {
        if (!item?.uuid) continue;
        if (isStrictlyNewer(item.updated_at, map[item.uuid])) changed += 1;
      }

      const projectMap = sync?.updatedAtByProject;
      if (projectMap && typeof projectMap === "object") {
        try {
          const projects = await fetchAllProjects(orgId);
          for (const project of projects) {
            if (!project?.uuid) continue;
            if (isStrictlyNewer(project.updated_at, projectMap[project.uuid])) {
              changed += 1;
            }
          }
        } catch (err) {
          if (!isExpectedBadgeFetchError(err)) {
            console.warn("[claudisk] badge projects:", err);
          }
        }
      }

      pushBadgeCount(changed);
    } catch (err) {
      // Expected during logout, expired session, or navigation away mid-fetch.
      if (!isExpectedBadgeFetchError(err)) {
        console.warn("[claudisk] badge:", err);
      }
    }
  }

  refreshBadge().catch(() => {});

  setInterval(() => {
    refreshBadge().catch(() => {});
  }, REFRESH_MS);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!changes[MIRROR_SYNC_KEY] && !changes[MIRROR_SETUP_KEY]) return;
    refreshBadge().catch(() => {});
  });
})().catch((err) => {
  console.error("[claudisk] content script failed:", err);
});
