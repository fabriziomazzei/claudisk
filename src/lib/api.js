/**
 * Client HTTP verso claude.ai (decisione 10).
 */

const BASE = "https://claude.ai";

/** Intervallo tra chiamate (impostazioni). */
let gapMs = 200;
/** Timeout per richiesta. */
let requestTimeoutMs = 30_000;
/** Tentativi massimi. */
let maxRetriesDefault = 5;

export function setRequestGapMs(ms) {
  const n = Number(ms);
  gapMs = Number.isFinite(n) ? Math.max(0, Math.min(5000, n)) : 200;
}

export function setRequestTimeoutMs(ms) {
  const n = Number(ms);
  requestTimeoutMs = Number.isFinite(n)
    ? Math.max(5000, Math.min(120_000, n))
    : 30_000;
}

export function setMaxRetries(n) {
  const v = Number(n);
  maxRetriesDefault = Number.isFinite(v) ? Math.max(1, Math.min(10, v)) : 5;
}

export function getRequestGapMs() {
  return gapMs;
}

export function sleep(ms, signal) {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function gap(signal) {
  await sleep(gapMs, signal);
}

export function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

function backoffMs(attempt) {
  const base = Math.min(15_000, 400 * 2 ** (attempt - 1));
  const jitter = Math.random() * 0.5 * base;
  return Math.floor(base * 0.75 + jitter);
}

function shouldRetryStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

function mergeSignals(timeoutMs, outer) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onOuter = () => controller.abort();
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener("abort", onOuter, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
      outer?.removeEventListener("abort", onOuter);
    },
  };
}

/**
 * @param {string} path
 * @param {{ maxAttempts?: number, signal?: AbortSignal }} [opts]
 */
export async function claudeFetchJson(path, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? maxRetriesDefault;
  let attempt = 0;

  while (true) {
    throwIfAborted(opts.signal);
    attempt += 1;
    const merged = mergeSignals(requestTimeoutMs, opts.signal);

    try {
      const res = await fetch(`${BASE}${path}`, {
        method: "GET",
        credentials: "include",
        signal: merged.signal,
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        return await res.json();
      }

      const retriable = shouldRetryStatus(res.status);
      const bodyText = await res.text().catch(() => "");
      if (!retriable || attempt >= maxAttempts) {
        throw new Error(
          `HTTP ${res.status} su ${path}${bodyText ? `: ${bodyText.slice(0, 180)}` : ""}`,
        );
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        throwIfAborted(opts.signal);
        // timeout locale: ritenta se possibile
      } else if (err?.message?.startsWith("HTTP ")) {
        throw err;
      }
      if (attempt >= maxAttempts) {
        if (err?.name === "AbortError" && opts.signal?.aborted) throw err;
        throw new Error(
          `Rete/timeout su ${path} (tentativo ${attempt}): ${err?.message || err}`,
        );
      }
    } finally {
      merged.cleanup();
    }

    await sleep(backoffMs(attempt), opts.signal);
  }
}

export async function resolveOrgId(signal) {
  throwIfAborted(signal);
  const cookie = await chrome.cookies.get({
    url: "https://claude.ai/",
    name: "lastActiveOrg",
  });
  if (cookie?.value) {
    return decodeURIComponent(cookie.value);
  }

  const orgs = await claudeFetchJson("/api/organizations", { signal });
  const list = Array.isArray(orgs) ? orgs : orgs?.data || [];
  if (list.length === 1 && list[0]?.uuid) {
    return list[0].uuid;
  }
  if (list.length > 1) {
    throw new Error(
      "Cookie lastActiveOrg assente e ci sono più organizzazioni: impossibile scegliere in modo sicuro.",
    );
  }
  throw new Error("Impossibile determinare orgId (cookie e /api/organizations vuoti).");
}

export async function listAllProjects(orgId, onPage, signal) {
  const all = [];
  let offset = 0;
  const limit = 100;

  for (;;) {
    throwIfAborted(signal);
    if (offset > 0) await gap(signal);
    const body = await claudeFetchJson(
      `/api/organizations/${orgId}/projects_v2?limit=${limit}&offset=${offset}`,
      { signal },
    );
    const batch = Array.isArray(body?.data) ? body.data : [];
    all.push(...batch);
    onPage?.({ offset, totalSoFar: all.length });

    const hasMore = Boolean(body?.pagination?.has_more ?? body?.has_more);
    if (!hasMore || batch.length === 0) break;
    offset += limit;
  }

  return all;
}

export async function fetchProjectMeta(orgId, projectId, signal) {
  return claudeFetchJson(
    `/api/organizations/${orgId}/projects/${projectId}`,
    { signal },
  );
}

export async function fetchProjectDocs(orgId, projectId, signal) {
  const body = await claudeFetchJson(
    `/api/organizations/${orgId}/projects/${projectId}/docs`,
    { signal },
  );
  return Array.isArray(body) ? body : body?.data || body?.docs || [];
}

export async function fetchProjectFiles(orgId, projectId, signal) {
  const body = await claudeFetchJson(
    `/api/organizations/${orgId}/projects/${projectId}/files`,
    { signal },
  );
  return Array.isArray(body) ? body : body?.data || body?.files || [];
}

export async function listAllConversations(orgId, onPage, signal) {
  const all = [];
  let offset = 0;
  const limit = 30;

  for (;;) {
    throwIfAborted(signal);
    if (offset > 0) await gap(signal);
    const body = await claudeFetchJson(
      `/api/organizations/${orgId}/chat_conversations_v2?limit=${limit}&offset=${offset}&consistency=eventual`,
      { signal },
    );
    const batch = Array.isArray(body?.data) ? body.data : [];
    all.push(...batch);
    onPage?.({ offset, totalSoFar: all.length });

    const hasMore = Boolean(body?.has_more);
    if (!hasMore || batch.length === 0) break;
    offset += limit;
  }

  return all;
}

export async function fetchConversation(orgId, chatId, signal) {
  return claudeFetchJson(
    `/api/organizations/${orgId}/chat_conversations/${chatId}` +
      `?tree=True&rendering_mode=messages&render_all_tools=true&consistency=eventual`,
    { signal },
  );
}

/**
 * Esistenza chat per soft-delete.
 * Ritorna solo "missing" su HTTP 404 esplicito.
 * Rete/timeout/5xx/429/altro → "uncertain" (non spostare).
 * @param {string} orgId
 * @param {string} chatId
 * @param {AbortSignal} [signal]
 * @returns {Promise<"exists" | "missing" | "uncertain">}
 */
export async function probeConversationExistence(orgId, chatId, signal) {
  throwIfAborted(signal);
  const path =
    `/api/organizations/${orgId}/chat_conversations/${chatId}` +
    `?tree=True&rendering_mode=messages&render_all_tools=true&consistency=eventual`;

  // Un solo tentativo: niente retry su 5xx qui (sarebbe "incerto" comunque).
  const merged = mergeSignals(requestTimeoutMs, signal);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "GET",
      credentials: "include",
      signal: merged.signal,
      headers: { Accept: "application/json" },
    });

    if (res.status === 404) {
      return "missing";
    }
    if (res.ok) {
      try {
        const body = await res.json();
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return "uncertain";
        }
        if (!body.uuid && !body.chat_messages) {
          return "uncertain";
        }
        return "exists";
      } catch {
        return "uncertain";
      }
    }
    // 408, 429, 5xx, altri 4xx → dubbio
    return "uncertain";
  } catch (err) {
    if (err?.name === "AbortError") {
      throwIfAborted(signal);
      return "uncertain";
    }
    return "uncertain";
  } finally {
    merged.cleanup();
  }
}
