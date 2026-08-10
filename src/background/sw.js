/**
 * Service worker: crea e mantiene l'offscreen document.
 * Non tocca FileSystemHandle. Manda solo ordini di scrittura.
 */

import { setActionBadge } from "../lib/badge.js";

const ALARM_NAME = "health-probe";
const STORAGE_KEY = "swExperiment";
const OFFSCREEN_URL = "src/background/offscreen.html";

/** Contatore in-memory del SW (si azzera alla sospensione). */
let swGeneration = 0;
let swBootedAt = Date.now();

swGeneration += 1;

async function readLog() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] ?? {
    notify: null,
    lastPermission: null,
    writes: [],
    alarmFires: 0,
    offscreen: null,
  };
}

async function writeLog(patch) {
  const current = await readLog();
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

async function appendWriteResult(entry) {
  const current = await readLog();
  const writes = [...(current.writes ?? []), entry].slice(-20);
  const lastPermission =
    entry.permission != null
      ? {
          value: entry.permission,
          at: entry.at,
          via: entry.via,
          folder: entry.folder,
          offscreenAliveMs: entry.offscreenAliveMs,
          source: entry.source,
        }
      : current.lastPermission;
  return writeLog({
    writes,
    lastPermission,
    alarmFires: current.alarmFires ?? 0,
  });
}

/** Evita createDocument concorrenti (boot + ping + alarm). */
let ensuringOffscreen = null;

async function hasOffscreenDocument() {
  if (chrome.offscreen.hasDocument) {
    return chrome.offscreen.hasDocument();
  }
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  });
  return contexts.length > 0;
}

function isAlreadyExistsError(err) {
  const msg = err?.message || String(err);
  return /single offscreen document/i.test(msg);
}

async function ensureOffscreen() {
  if (ensuringOffscreen) return ensuringOffscreen;

  ensuringOffscreen = (async () => {
    if (await hasOffscreenDocument()) {
      return { created: false };
    }

    try {
      await chrome.offscreen.createDocument({
        url: OFFSCREEN_URL,
        reasons: ["LOCAL_STORAGE"],
        justification:
          "Documento persistente per mantenere il permesso File System Access e leggere gli handle da IndexedDB.",
      });
    } catch (err) {
      // Race: un altro percorso l'ha creato tra hasDocument e createDocument.
      if (isAlreadyExistsError(err) || (await hasOffscreenDocument())) {
        return { created: false };
      }
      throw err;
    }

    await writeLog({
      offscreen: {
        createdAt: new Date().toISOString(),
        note: "Offscreen document creato.",
      },
    });
    return { created: true };
  })();

  try {
    return await ensuringOffscreen;
  } finally {
    ensuringOffscreen = null;
  }
}

/**
 * Chiede all'offscreen di scrivere. Nessun handle nel messaggio.
 * @param {string} via
 */
async function requestOffscreenWrite(via) {
  await ensureOffscreen();

  let result;
  try {
    result = await chrome.runtime.sendMessage({
      target: "offscreen",
      type: "offscreen-write",
      via,
    });
  } catch (err) {
    result = {
      ok: false,
      source: "offscreen",
      permission: null,
      via,
      at: new Date().toISOString(),
      error: err?.message || String(err),
    };
  }

  if (!result || typeof result !== "object") {
    result = {
      ok: false,
      source: "offscreen",
      permission: null,
      via,
      at: new Date().toISOString(),
      error: "Nessuna risposta dall'offscreen.",
    };
  }

  await appendWriteResult({
    ...result,
    via: result.via ?? via,
    at: result.at ?? new Date().toISOString(),
    source: result.source ?? "offscreen",
  });

  return result;
}

async function pingOffscreen() {
  try {
    if (!(await hasOffscreenDocument())) {
      return { ok: false, exists: false };
    }
    const status = await chrome.runtime.sendMessage({
      target: "offscreen",
      type: "offscreen-status",
    });
    return { ok: true, exists: true, ...status };
  } catch (err) {
    return {
      ok: false,
      exists: await hasOffscreenDocument(),
      error: err?.message || String(err),
    };
  }
}

async function ensureAlarm() {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) {
    await chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
  }
}

async function boot() {
  await ensureAlarm();
  await ensureOffscreen();
}

chrome.runtime.onInstalled.addListener(() => {
  boot().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  boot().catch(console.error);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  (async () => {
    const current = await readLog();
    await writeLog({ alarmFires: (current.alarmFires ?? 0) + 1 });
    // Ricrea l'offscreen se Chrome l'ha chiuso; altrimenti riusa lo stesso documento
    // (è questo che deve superare i 3 minuti di vita del SW).
    await requestOffscreenWrite("alarm");
  })().catch(console.error);
});

async function openMirrorTab() {
  const url = chrome.runtime.getURL("src/ui/claudisk.html");

  // Prefer getContexts: works for our own extension pages without the "tabs"
  // permission (tabs.query({ url }) needs it and can fail/race with offscreen).
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["TAB"],
      documentUrls: [url],
    });
    const existing = contexts.find((ctx) => ctx.tabId >= 0);
    if (existing) {
      await chrome.tabs.update(existing.tabId, { active: true });
      if (existing.windowId >= 0) {
        await chrome.windows.update(existing.windowId, { focused: true });
      }
      return { ok: true, tabId: existing.tabId, reused: true };
    }
  } catch {
    /* fall through to create */
  }

  const tab = await chrome.tabs.create({ url, active: true });
  return { ok: true, tabId: tab.id, reused: false };
}

chrome.action.onClicked.addListener(() => {
  openMirrorTab().catch(console.error);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;
  // Messaggi destinati all'offscreen: non gestirli qui.
  if (message.target === "offscreen") return;

  if (message.type === "open-mirror") {
    // Fire-and-forget: do not return true / sendResponse.
    // Offscreen also listens on onMessage; keeping the port open races and
    // surfaces "The message port closed before a response was received"
    // at the content-script sendMessage call site.
    openMirrorTab().catch(console.error);
    return false;
  }

  if (message.type === "set-badge") {
    setActionBadge(message.count).catch(console.error);
    return false;
  }

  if (message.type === "fetch-binary") {
    (async () => {
      try {
        const url = String(message.url || "");
        if (!/^https?:\/\//i.test(url)) {
          sendResponse({ ok: false, error: "URL non valido" });
          return;
        }
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          sendResponse({
            ok: false,
            error: `HTTP ${res.status}`,
            status: res.status,
          });
          return;
        }
        const buffer = await res.arrayBuffer();
        // Structured clone supporta ArrayBuffer; base64 come fallback.
        sendResponse({
          ok: true,
          buffer,
          contentType: res.headers.get("content-type") || "",
          bytes: buffer.byteLength,
        });
      } catch (err) {
        sendResponse({
          ok: false,
          error: err?.message || String(err),
        });
      }
    })();
    return true;
  }

  if (message.type === "directory-handle-saved") {
    (async () => {
      try {
        await ensureAlarm();
        await ensureOffscreen();
        const notify = {
          ok: true,
          at: new Date().toISOString(),
          note: "Ping ricevuto. Ordine di scrittura inviato all'offscreen (handle solo in IDB).",
        };
        await writeLog({ notify });
        const result = await requestOffscreenWrite("notify-reload");
        sendResponse({
          ok: true,
          notify,
          permission: result.permission ?? null,
          result,
        });
      } catch (err) {
        const detail = {
          ok: false,
          error: err?.message || String(err),
          errorName: err?.name,
        };
        await writeLog({
          notify: { ...detail, at: new Date().toISOString() },
        });
        sendResponse(detail);
      }
    })();
    return true;
  }

  if (message.type === "sw-write-now" || message.type === "offscreen-write-now") {
    (async () => {
      await ensureAlarm();
      const result = await requestOffscreenWrite("manual");
      sendResponse(result);
    })();
    return true;
  }

  if (message.type === "sw-get-status") {
    (async () => {
      const log = await readLog();
      const alarm = await chrome.alarms.get(ALARM_NAME);
      const offscreen = await pingOffscreen();
      sendResponse({
        ok: true,
        log,
        alarm: alarm
          ? {
              name: alarm.name,
              periodInMinutes: alarm.periodInMinutes,
              scheduledTime: alarm.scheduledTime,
            }
          : null,
        swAliveMs: Date.now() - swBootedAt,
        swGeneration,
        offscreen,
      });
    })();
    return true;
  }
});

boot().catch(console.error);
