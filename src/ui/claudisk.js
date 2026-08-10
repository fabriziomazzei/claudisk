/**
 * UI mirror: setup gate, pannello impostazioni, sync.
 */

import {
  loadDirectoryHandle,
  saveDirectoryHandle,
  queryWritePermission,
  requestWritePermission,
} from "../lib/fs-store.js";
import { loadIndex } from "../lib/index-store.js";
import { readJsonFile } from "../lib/fs-write.js";
import { runFullCapture, createPauseController } from "../lib/capture.js";
import { planCapture } from "../lib/sync-plan.js";
import { verifyVault } from "../lib/vault-verify.js";
import { bumpMirrorSyncFailure, MIRROR_SYNC_KEY } from "../lib/mirror-sync.js";
import { loadSettings, saveSettings } from "../lib/settings.js";
import { renderWhatsNew } from "./whats-new.js";
import { measureDiskStats, formatBytes } from "../lib/disk-stats.js";
import { loadSyncHistory, pushSyncHistory } from "../lib/sync-history.js";
import { writeMirrorSetup } from "../lib/setup-store.js";
import {
  emptyDeletedFolder,
  measureDeletedStats,
} from "../lib/fs-path.js";
import { humanizeLogLine } from "../lib/log-humanize.js";
import { buildArchiveStats, renderInsights } from "../lib/mirror-stats.js";
import { applyDomI18n, setLocale, t } from "./i18n.js";
import { startOnboarding, isOnboardingActive } from "./onboarding.js";
import { clearActionBadge } from "../lib/badge.js";

const hero = document.getElementById("hero");
const heroNote = document.getElementById("hero-note");
const insightsBody = document.getElementById("insights-body");
const setupBanner = document.getElementById("setup-banner");
const statFolder = document.getElementById("stat-folder");
const statPermission = document.getElementById("stat-permission");
const statLast = document.getElementById("stat-last");
const statDisk = document.getElementById("stat-disk");

const btnUpdate = document.getElementById("btn-update");
const btnFullSync = document.getElementById("btn-full-sync");
const btnStats = document.getElementById("btn-stats");
const btnStatsRefresh = document.getElementById("btn-stats-refresh");
const btnHome = document.getElementById("btn-home");
const btnSetupGo = document.getElementById("btn-setup-go");
const btnVerify = document.getElementById("btn-verify");
const btnReconfirm = document.getElementById("btn-reconfirm");
const btnChooseFolder = document.getElementById("btn-choose-folder");
const btnPause = document.getElementById("btn-pause");
const btnAbort = document.getElementById("btn-abort");
const btnSettings = document.getElementById("btn-settings");
const btnCopyLog = document.getElementById("btn-copy-log");
const btnRetryErrors = document.getElementById("btn-retry-errors");
const btnPlanConfirm = document.getElementById("btn-plan-confirm");
const btnPlanCancel = document.getElementById("btn-plan-cancel");
const btnVerifyHide = document.getElementById("btn-verify-hide");

const viewHome = document.getElementById("view-home");
const viewSettings = document.getElementById("view-settings");
const viewStats = document.getElementById("view-stats");
const settingsSaveBar = document.getElementById("settings-save-bar");
const setFolderStatus = document.getElementById("set-folder-status");
const setFolderFeedback = document.getElementById("set-folder-feedback");

const phaseTimeline = document.getElementById("phase-timeline");
const progressWrap = document.getElementById("progress-wrap");
const progressLabel = document.getElementById("progress-label");
const progressEta = document.getElementById("progress-eta");
const progressFill = document.getElementById("progress-fill");
const progressCount = document.getElementById("progress-count");

const planPanel = document.getElementById("plan-panel");
const planKind = document.getElementById("plan-kind");
const planNote = document.getElementById("plan-note");
const planChips = document.getElementById("plan-chips");
const planBody = document.getElementById("plan-body");

const summaryPanel = document.getElementById("summary-panel");
const summaryBody = document.getElementById("summary-body");
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const settingsForm = document.getElementById("settings-form");
const settingsPanel = viewSettings;
const verifyPanel = document.getElementById("verify-panel");
const verifyBody = document.getElementById("verify-body");
const errorsPanel = document.getElementById("errors-panel");
const errorsList = document.getElementById("errors-list");
const logEl = document.getElementById("log");
const toastEl = document.getElementById("toast");

const btnReplayTour = document.getElementById("btn-replay-tour");
const setArtifacts = document.getElementById("set-artifacts");
const setAttachments = document.getElementById("set-attachments");
const setProjectFiles = document.getElementById("set-project-files");
const setConfirmWrite = document.getElementById("set-confirm-write");
const setNotifySync = document.getElementById("set-notify-sync");
const setWriteTags = document.getElementById("set-write-tags");
const setWriteRelated = document.getElementById("set-write-related");
const setAutostart = document.getElementById("set-autostart");
const setCloseTab = document.getElementById("set-close-tab");
const setLocaleEl = document.getElementById("set-locale");
const setDeletedRetention = document.getElementById("set-deleted-retention");
const setMaxAttachment = document.getElementById("set-max-attachment");
const deletedStatsEl = document.getElementById("deleted-stats");
const btnEmptyDeleted = document.getElementById("btn-empty-deleted");

/** @type {FileSystemDirectoryHandle | null} */
let directoryHandle = null;
/** @type {AbortController | null} */
let activeAbort = null;
/** @type {ReturnType<typeof createPauseController> | null} */
let activePause = null;
/** @type {{ kind: string, id: string, title: string, message: string }[]} */
let lastErrors = [];
/** @type {number | null} */
let lastDiskBytes = null;
/** @type {boolean} */
let setupReady = false;
/** @type {"home" | "settings" | "stats"} */
let currentView = "home";
/** @type {string} */
let currentSettingsSection = "vault";
/** @type {{ force?: boolean } | null} */
let pendingPlanOpts = null;
/** @type {boolean} */
let planning = false;

let settings = await loadSettings();
const logMaxLines = settings.logMaxLines || 500;

const logLines = [];
/** @type {{ time: string, text: string, level: string, full: string }[]} */
let pendingLog = [];
let logFlushTimer = null;
let logRaf = 0;
let stickToBottom = true;

let pendingStatus = "";
let statusFlushTimer = null;

let pendingProgress = null;
let progressFlushTimer = null;
let progressStartedAt = 0;
let progressSamples = [];

let toastTimer = null;

const PHASE_ORDER = ["docs", "chats", "memory", "deletions", "indici", "done"];

function isNearBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 48;
}

logEl.addEventListener("scroll", () => {
  stickToBottom = isNearBottom(logEl);
});

function classifyLogLine(line) {
  const s = String(line);
  if (/errore|error|fallit|fail|HTTP\s*[45]\d\d/i.test(s)) return "error";
  if (
    /^Interrotto|^In pausa|^Ripresa\.|^Richiesta interruzione|^Aborted|^Paused|^Resumed\.|^Abort requested/i.test(
      s,
    )
  ) {
    return "warn";
  }
  if (
    /^(Avvio|Completato|Sync completo|Aggiornamento|Riprovo|Retry|Ritento|Account|Elenco|Progetti|Conversazioni|Memoria|Cancellazioni|Salvo|Aggiorno|I progetti|Starting|Done\.|Full sync|Update:|Claude account|Listing|Projects|Conversations|Memory|Deletions|Saving|Updating)/i.test(
      s,
    )
  ) {
    return "phase";
  }
  return "info";
}

function queueLog(line) {
  const time = new Date().toLocaleTimeString(
    settings.locale === "it" ? "it-IT" : "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  );
  const raw = String(line);
  const display = humanizeLogLine(raw, settings.locale === "it" ? "it" : "en");
  const full = `[${time}] ${raw}`;
  const level = classifyLogLine(display);
  logLines.push(full);
  pendingLog.push({ time, text: display, level, full });
  if (!logFlushTimer) {
    logFlushTimer = setTimeout(flushLog, 250);
  }
}

function queueStatus(msg) {
  // Solo messaggi di avanzamento “in corso”, non i riepiloghi finali.
  const s = String(msg || "");
  if (
    /^Completato/i.test(s) ||
    /^Cattura fallita/i.test(s) ||
    /Artefatti scritti/i.test(s)
  ) {
    return;
  }
  pendingStatus = s;
  if (!statusFlushTimer) {
    statusFlushTimer = setTimeout(() => {
      statusFlushTimer = null;
      heroNote.textContent = pendingStatus;
    }, 250);
  }
}

function flushLog() {
  logFlushTimer = null;
  if (!pendingLog.length) return;
  const batch = pendingLog;
  pendingLog = [];

  if (logRaf) cancelAnimationFrame(logRaf);
  logRaf = requestAnimationFrame(() => {
    logRaf = 0;
    const frag = document.createDocumentFragment();
    for (const entry of batch) {
      const row = document.createElement("div");
      row.className = "log-row";
      row.dataset.level = entry.level;
      const timeEl = document.createElement("span");
      timeEl.className = "log-time";
      timeEl.textContent = entry.time;
      const msgEl = document.createElement("span");
      msgEl.className = "log-msg";
      msgEl.textContent = entry.text;
      row.appendChild(timeEl);
      row.appendChild(msgEl);
      frag.appendChild(row);
    }
    logEl.appendChild(frag);

    while (logEl.childElementCount > logMaxLines) {
      logEl.removeChild(logEl.firstChild);
    }

    if (stickToBottom) {
      logEl.scrollTop = logEl.scrollHeight;
    }
  });
}

function clearLogUi() {
  pendingLog = [];
  logLines.length = 0;
  if (logFlushTimer) {
    clearTimeout(logFlushTimer);
    logFlushTimer = null;
  }
  while (logEl.firstChild) logEl.removeChild(logEl.firstChild);
}

function setTimelinePhase(phase) {
  const idx = PHASE_ORDER.indexOf(phase);
  for (const li of phaseTimeline.querySelectorAll("li")) {
    const p = li.getAttribute("data-phase");
    const i = PHASE_ORDER.indexOf(p);
    if (idx < 0) {
      li.removeAttribute("data-state");
    } else if (i < idx) {
      li.dataset.state = "done";
    } else if (i === idx) {
      li.dataset.state = phase === "done" ? "done" : "active";
    } else {
      li.removeAttribute("data-state");
    }
  }
}

function queueProgress(p) {
  pendingProgress = p;
  if (!progressFlushTimer) {
    progressFlushTimer = setTimeout(flushProgress, 250);
  }
}

function flushProgress() {
  progressFlushTimer = null;
  const p = pendingProgress;
  if (!p) return;

  progressWrap.hidden = false;
  setTimelinePhase(p.phase || "docs");

  const total = Math.max(p.total || 1, 1);
  const current = Math.min(p.current || 0, total);
  const pct = Math.round((current / total) * 100);
  progressFill.style.width = `${pct}%`;
  progressLabel.textContent = p.label || p.phase || "In corso…";
  progressCount.textContent = `${current} / ${total} · ${pct}%`;

  const now = Date.now();
  if (!progressStartedAt) progressStartedAt = now;
  progressSamples.push({ t: now, current, total });
  if (progressSamples.length > 30) progressSamples.shift();

  let etaText = "";
  if (activePause?.paused) {
    etaText = "in pausa";
  } else if (current > 0 && current < total) {
    const elapsed = now - progressStartedAt;
    const rate = current / Math.max(elapsed, 1);
    const remainMs = (total - current) / Math.max(rate, 1e-9);
    if (Number.isFinite(remainMs) && remainMs < 24 * 3600_000) {
      etaText = `resta ~${formatDuration(remainMs)}`;
    }
  } else if (current >= total || p.phase === "done") {
    etaText = "quasi fatto";
  }
  progressEta.textContent = etaText;
}

function formatDuration(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}m ${rem}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatAgo(iso) {
  if (!iso) return "mai";
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  if (ms < 60_000) return "poco fa";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m fa`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h fa`;
  return `${Math.round(ms / 86_400_000)}g fa`;
}

function showToast(message, kind = "ok") {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  toastEl.hidden = false;
  toastEl.dataset.kind = kind;
  toastEl.textContent = message;
  // Forza reflow così il fade-in parte anche su toast consecutivi.
  toastEl.classList.remove("is-visible");
  void toastEl.offsetWidth;
  toastEl.classList.add("is-visible");

  toastTimer = setTimeout(() => {
    toastEl.classList.remove("is-visible");
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
      toastTimer = null;
    }, 240);
  }, 4200);

  if (document.hidden && typeof Notification !== "undefined") {
    const notify = () => {
      try {
        new Notification("ClauDisk", { body: message });
      } catch {
        /* ignore */
      }
    };
    if (Notification.permission === "granted") notify();
    else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") notify();
      });
    }
  }
}

/**
 * Optional desktop notification after a successful sync (Settings → Sync).
 * @param {string} message
 */
async function notifySyncDone(message) {
  if (!settings.notifyOnSyncDone) return;
  if (!chrome?.notifications?.create) return;
  try {
    await chrome.notifications.create(`claudisk-sync-${Date.now()}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
      title: "ClauDisk",
      message: String(message || "Sync finished."),
      priority: 0,
    });
  } catch {
    /* permission or API unavailable */
  }
}

function setFolderFeedbackEl(message, kind = "") {
  setFolderFeedback.textContent = message;
  if (kind) setFolderFeedback.dataset.kind = kind;
  else delete setFolderFeedback.dataset.kind;
}

/**
 * @param {"home" | "settings" | "stats"} view
 * @param {{ section?: string, force?: boolean }} [opts]
 */
function setView(view, opts = {}) {
  if (view === "home" && !setupReady && !opts.force) {
    view = "settings";
    opts = { ...opts, section: opts.section || "vault" };
  }
  if (view === "stats" && !setupReady) {
    view = "settings";
    opts = { section: "vault" };
  }

  currentView = view;
  document.body.dataset.view = view;

  viewHome.hidden = view !== "home";
  viewSettings.hidden = view !== "settings";
  viewStats.hidden = view !== "stats";

  btnSettings?.setAttribute("aria-current", view === "settings" ? "page" : "false");
  btnStats?.setAttribute("aria-current", view === "stats" ? "page" : "false");

  if (view === "settings") {
    setSettingsSection(opts.section || currentSettingsSection || "vault");
    fillSettingsForm();
  }
  if (view === "stats") {
    if (insightsBody) {
      insightsBody.innerHTML = `<p class="muted">${t("insights.loading")}</p>`;
    }
    refreshInsights().catch(console.error);
  }
}

/**
 * @param {string} section
 */
function setSettingsSection(section) {
  const allowed = ["vault", "capture", "sync", "app", "history"];
  if (!allowed.includes(section)) section = "vault";
  currentSettingsSection = section;
  document.body.dataset.settingsSection = section;

  document.querySelectorAll("[data-settings-nav]").forEach((el) => {
    el.classList.toggle("is-active", el.getAttribute("data-settings-nav") === section);
  });
  document.querySelectorAll("[data-settings-pane]").forEach((el) => {
    const on = el.getAttribute("data-settings-pane") === section;
    el.hidden = !on;
    el.classList.toggle("is-active", on);
  });

  if (settingsSaveBar) {
    settingsSaveBar.hidden =
      section === "vault" ||
      section === "history" ||
      section === "whatsnew" ||
      section === "about";
  }
  if (section === "whatsnew") {
    const body = document.getElementById("whats-new-body");
    if (body) renderWhatsNew(body, settings.locale === "it" ? "it" : "en");
  }
  if (section === "about") {
    const aboutVer = document.getElementById("about-version");
    if (aboutVer) {
      const v = chrome.runtime.getManifest().version || "";
      aboutVer.textContent = v ? `v${v}` : "";
    }
  }
  if (section === "history") {
    refreshHistory().catch(console.error);
  }
}

function openSettings(force = false) {
  setView("settings", {
    section: force || !setupReady ? "vault" : currentSettingsSection,
    force: true,
  });
}

function closeSettings() {
  if (isOnboardingActive()) return;
  if (!setupReady) return;
  setView("home");
}

function toggleSettings() {
  if (currentView === "settings" && setupReady) closeSettings();
  else openSettings();
}

function applyMode(ready) {
  setupReady = ready;
  document.body.dataset.mode = ready ? "ready" : "setup";
  setupBanner.hidden = ready;
  if (!ready) {
    setView("settings", { section: "vault", force: true });
  } else if (currentView === "settings" && document.body.dataset.view === "settings") {
    /* stay on settings if user is configuring */
  } else {
    setView("home");
  }
}

function fillSettingsForm() {
  setArtifacts.checked = Boolean(settings.captureArtifacts);
  setAttachments.checked = Boolean(settings.captureAttachments);
  setProjectFiles.checked = Boolean(settings.captureProjectFiles);
  setConfirmWrite.checked = settings.confirmBeforeWrite !== false;
  if (setNotifySync) setNotifySync.checked = Boolean(settings.notifyOnSyncDone);
  setWriteTags.checked = settings.writeTags !== false;
  setWriteRelated.checked = settings.writeRelated !== false;
  setAutostart.checked = Boolean(settings.autoStartOnOpen);
  setCloseTab.checked = Boolean(settings.closeTabWhenDone);
  if (setLocaleEl) setLocaleEl.value = settings.locale === "it" ? "it" : "en";
  if (setDeletedRetention) {
    const d = String(settings.deletedRetentionDays ?? 30);
    setDeletedRetention.value = ["0", "7", "14", "30", "90"].includes(d) ? d : "30";
  }
  if (setMaxAttachment) {
    const m = String(settings.maxAttachmentMb ?? 25);
    setMaxAttachment.value = ["0", "5", "10", "25", "50", "100"].includes(m)
      ? m
      : "25";
  }
  refreshDeletedStats().catch(() => {});
}

function applyUiLocale() {
  setLocale(settings.locale || "en");
  applyDomI18n(document);
  if (!activePause?.paused && btnPause) {
    btnPause.textContent = t("btn.pause");
  } else if (activePause?.paused && btnPause) {
    btnPause.textContent = t("btn.resume");
  }
}

/** Runtime UI string: English default, Italian when locale is it. */
function tr(en, it) {
  return settings.locale === "it" ? it : en;
}

function hidePlanPanel() {
  planPanel.hidden = true;
  pendingPlanOpts = null;
  planChips.innerHTML = "";
  planBody.innerHTML = "";
  planNote.textContent = "";
}

/**
 * @param {Awaited<ReturnType<typeof planCapture>>} plan
 * @param {{ force?: boolean }} opts
 */
function renderPlan(plan, opts) {
  pendingPlanOpts = { force: Boolean(opts.force) };
  planKind.textContent = plan.force
    ? tr("Plan: full sync (dry-run)", "Piano: sync completo (dry-run)")
    : tr("Plan: update (dry-run)", "Piano: aggiornamento (dry-run)");
  planNote.textContent = tr(
    "No files were written. Review the summary and confirm to start the capture.",
    "Nessun file è stato scritto. Controlla il riepilogo e conferma per avviare la cattura.",
  );

  const chips = [];
  const chip = (label, cls = "") =>
    `<span class="sum-chip ${cls}">${escapeHtml(label)}</span>`;

  chips.push(
    chip(
      tr(
        `${plan.chats.toWrite} chats to write`,
        `${plan.chats.toWrite} chat da scrivere`,
      ),
    ),
  );
  chips.push(chip(tr(`+${plan.chats.new} new`, `+${plan.chats.new} nuove`)));
  chips.push(
    chip(
      tr(
        `${plan.chats.updated} updated`,
        `${plan.chats.updated} aggiornate`,
      ),
    ),
  );
  chips.push(
    chip(
      tr(
        `${plan.chats.unchanged} unchanged`,
        `${plan.chats.unchanged} invariate`,
      ),
      "sum-chip-muted",
    ),
  );
  chips.push(
    chip(
      tr(
        `${plan.projects.total} projects (${plan.projects.new} new)`,
        `${plan.projects.total} progetti (${plan.projects.new} nuovi)`,
      ),
    ),
  );
  if (plan.deletions.candidates) {
    chips.push(
      chip(
        tr(
          `${plan.deletions.candidates} deletion candidates`,
          `${plan.deletions.candidates} canc. candidate`,
        ),
        "sum-chip-warn",
      ),
    );
  } else {
    chips.push(
      chip(
        tr("no deletion candidates", "nessuna canc. candidata"),
        "sum-chip-muted",
      ),
    );
  }
  if (!plan.settings.captureArtifacts) {
    chips.push(chip(tr("no artifacts", "senza artefatti"), "sum-chip-muted"));
  }
  if (!plan.settings.captureAttachments) {
    chips.push(
      chip(tr("attachments: refs only", "allegati solo rif."), "sum-chip-muted"),
    );
  }

  planChips.innerHTML = chips.join("");

  const groups = [];
  const pushGroup = (label, items, mapFn) => {
    if (!items?.length) return;
    const shown = items.slice(0, 12);
    const more = items.length - shown.length;
    groups.push(
      `<div class="sum-group"><span class="plan-group-label">${escapeHtml(label)}</span>` +
        `<ul class="plan-list">` +
        shown.map(mapFn).join("") +
        (more > 0
          ? `<li class="muted">${escapeHtml(tr(`…and ${more} more`, `…e altre ${more}`))}</li>`
          : "") +
        `</ul></div>`,
    );
  };

  pushGroup(
    tr("New chats", "Chat nuove"),
    plan.chats.sample.filter((c) => c.kind === "new"),
    (c) =>
      `<li>${escapeHtml(c.titolo)} <span class="muted">(${escapeHtml(c.progetto)})</span></li>`,
  );
  pushGroup(
    tr("Updated chats", "Chat aggiornate"),
    plan.chats.sample.filter((c) => c.kind === "updated"),
    (c) =>
      `<li>${escapeHtml(c.titolo)} <span class="muted">(${escapeHtml(c.progetto)})</span></li>`,
  );
  pushGroup(
    tr("New projects", "Progetti nuovi"),
    plan.projects.sample.filter((p) => p.kind === "new"),
    (p) => `<li>${escapeHtml(p.titolo)}</li>`,
  );
  pushGroup(
    tr("Deletion candidates", "Cancellazioni candidate"),
    plan.deletions.sample,
    (d) => `<li>${escapeHtml(d.titolo)}</li>`,
  );

  planBody.innerHTML =
    groups.join("") +
    `<p class="muted tight">${escapeHtml(plan.projects.note)}</p>` +
    `<p class="muted tight">${escapeHtml(plan.deletions.note)}</p>`;

  planPanel.hidden = false;
}

/**
 * @param {Awaited<ReturnType<typeof verifyVault>>} report
 */
function renderVerify(report) {
  const issues = report.issues;
  const issueCount =
    issues.missingChats.length +
    issues.missingDocs.length +
    issues.missingFiles.length +
    issues.idMismatch.length +
    issues.orphans.length +
    issues.pathDrift.length;

  const bits = [
    `<p class="${issueCount ? "verify-warn" : "verify-ok"}">` +
      (issueCount
        ? tr(`${issueCount} issues found.`, `${issueCount} problemi rilevati.`)
        : tr(
            "Vault looks consistent: no issues found.",
            "Vault coerente: nessun problema rilevato.",
          )) +
      `</p>`,
    `<p class="muted">${tr("Index", "Indice")}: ${report.totals.chats} chat · ${report.totals.docs} docs · ` +
      `${report.totals.files} file · ${report.totals.projects} ${tr("projects", "progetti")} · ` +
      `${report.totals.chatFilesOnDisk} chat .md ${tr("on disk", "sul disco")}.</p>`,
  ];

  if (report.health) {
    bits.push(
      `<p class="muted">Health: last success ${escapeHtml(String(report.health.last_success_at || "-"))}` +
        ` · ${tr("consecutive failures", "fail consecutivi")} ${report.health.consecutive_failures}` +
        (report.health.last_error
          ? ` · ${tr("last error", "ultimo errore")}: ${escapeHtml(String(report.health.last_error))}`
          : "") +
        `</p>`,
    );
  }

  const block = (title, rows) => {
    if (!rows.length) return "";
    return (
      `<div class="verify-block"><h3>${escapeHtml(title)} (${rows.length})</h3>` +
      `<ul>${rows
        .slice(0, 40)
        .map((r) => `<li>${escapeHtml(r)}</li>`)
        .join("")}` +
      (rows.length > 40
        ? `<li class="muted">${escapeHtml(tr(`…and ${rows.length - 40} more`, `…e altre ${rows.length - 40}`))}</li>`
        : "") +
      `</ul></div>`
    );
  };

  bits.push(
    block(
      tr("Chats in index but missing on disk", "Chat in indice ma assenti sul disco"),
      issues.missingChats,
    ),
  );
  bits.push(block(tr("Missing docs", "Docs mancanti"), issues.missingDocs));
  bits.push(
    block(tr("Missing project files", "File progetto mancanti"), issues.missingFiles),
  );
  bits.push(
    block(
      tr("Frontmatter id ≠ index", "Id frontmatter ≠ indice"),
      issues.idMismatch.map(
        (m) =>
          `${m.percorso}: index=${m.indexId} file=${m.fileId || "(missing)"}`,
      ),
    ),
  );
  bits.push(
    block(
      tr("Chats on disk not in index (orphans)", "Chat sul disco non in indice (orfani)"),
      issues.orphans.map(
        (o) => `${o.percorso}${o.id ? ` (id ${o.id})` : ""}`,
      ),
    ),
  );
  bits.push(
    block(
      tr("Path drift (same id, different paths)", "Path drift (stesso id, path diversi)"),
      issues.pathDrift,
    ),
  );
  verifyBody.innerHTML = bits.join("");
  verifyPanel.hidden = false;
}

async function refreshDeletedStats() {
  if (!directoryHandle || !deletedStatsEl) {
    if (deletedStatsEl) deletedStatsEl.textContent = "_deleted/: -";
    return;
  }
  try {
    const st = await measureDeletedStats(directoryHandle);
    if (!st.exists) {
      deletedStatsEl.textContent = tr("_deleted/: empty", "_deleted/: vuota");
      return;
    }
    deletedStatsEl.textContent = `_deleted/: ${st.files} file · ${formatBytes(st.bytes)}`;
  } catch (err) {
    deletedStatsEl.textContent = tr(
      `_deleted/: error (${err?.message || err})`,
      `_deleted/: errore (${err?.message || err})`,
    );
  }
}

function setRunningUi(running) {
  const busy = running || planning;
  btnUpdate.disabled = busy || !setupReady || !directoryHandle;
  btnFullSync.disabled = busy || !setupReady || !directoryHandle;
  if (btnVerify) {
    btnVerify.disabled = busy || !setupReady || !directoryHandle;
  }
  btnAbort.hidden = !running;
  btnPause.hidden = !running;
  progressWrap.dataset.paused = "false";
  if (!running) {
    btnPause.textContent = t("btn.pause");
    progressWrap.hidden = true;
    progressFill.style.width = "0%";
    progressStartedAt = 0;
    progressSamples = [];
    setTimelinePhase("");
  }
}

async function syncSetupFlag(ready, folderName) {
  await writeMirrorSetup({
    ready,
    folderName: folderName || null,
  });
}

async function refreshInsights(index = null, diskLabel = "") {
  if (!insightsBody) return;
  if (!directoryHandle || !setupReady) {
    renderInsights(insightsBody, null, {
      locale: settings.locale,
      t,
    });
    return;
  }
  try {
    const idx = index || (await loadIndex(directoryHandle, () => {}));
    const history = await loadSyncHistory();
    const stats = buildArchiveStats(idx, history);
    let label = diskLabel;
    if (!label && lastDiskBytes != null) label = formatBytes(lastDiskBytes);
    renderInsights(insightsBody, stats, {
      diskLabel: label,
      locale: settings.locale,
      t,
    });
  } catch (err) {
    insightsBody.innerHTML = `<p class="muted">${
      settings.locale === "it"
        ? `Statistiche non disponibili (${err?.message || err}).`
        : `Statistics unavailable (${err?.message || err}).`
    }</p>`;
  }
}

async function openStatsPage() {
  setView("stats");
}

async function refreshHistory() {
  const list = await loadSyncHistory();
  while (historyList.firstChild) historyList.removeChild(historyList.firstChild);

  if (!list.length) {
    historyEmpty.hidden = false;
    return;
  }
  historyEmpty.hidden = true;

  for (const entry of list) {
    const li = document.createElement("li");
    const left = document.createElement("span");
    const right = document.createElement("span");
    const when = entry.at ? new Date(entry.at).toLocaleString() : "?";
    const kind = entry.targeted
      ? tr("targeted retry", "retry mirato")
      : entry.force
        ? tr("full sync", "sync completo")
        : tr("update", "aggiornamento");
    left.innerHTML = `<span class="${entry.ok ? "hist-ok" : "hist-fail"}">${
      entry.ok ? "ok" : tr("error", "errore")
    }</span> · ${escapeHtml(kind)} · ${escapeHtml(when)}`;
    const bits = [
      `+${entry.chatsNew || 0} ${tr("new", "nuove")}`,
      `${entry.chatsUpdated || 0} ${tr("upd.", "agg.")}`,
      `${entry.docsWritten || 0} docs`,
    ];
    if (entry.chatsRenamed) bits.push(`${entry.chatsRenamed} ${tr("ren.", "rin.")}`);
    if (entry.artifacts) bits.push(`${entry.artifacts} art.`);
    if (entry.errors) bits.push(`${entry.errors} err.`);
    if (entry.durationMs) bits.push(formatDuration(entry.durationMs));
    right.textContent = bits.join(" · ");
    right.className = "muted";
    li.appendChild(left);
    li.appendChild(right);
    historyList.appendChild(li);
  }
}

/**
 * @returns {Promise<"none" | "needs-permission" | "ready">}
 */
async function refreshHero() {
  if (!directoryHandle) {
    hero.dataset.state = "none";
    statFolder.textContent = tr("None", "Nessuna");
    statPermission.textContent = "-";
    statLast.textContent = "-";
    statDisk.textContent = "-";
    lastDiskBytes = null;
    heroNote.textContent = "";
    setFolderStatus.textContent = t("settings.folderNone");
    btnReconfirm.hidden = true;
    btnUpdate.disabled = true;
    btnFullSync.disabled = true;
    if (btnVerify) btnVerify.disabled = true;
    applyMode(false);
    await syncSetupFlag(false, null);
    if (currentView === "stats") await refreshInsights(null);
    return "none";
  }

  statFolder.textContent = directoryHandle.name;

  let permission = "unknown";
  try {
    permission = await queryWritePermission(directoryHandle);
  } catch {
    permission = tr("error", "errore");
  }

  if (permission !== "granted") {
    hero.dataset.state = "needs-permission";
    statPermission.textContent = permission;
    btnReconfirm.hidden = false;
    btnUpdate.disabled = true;
    btnFullSync.disabled = true;
    if (btnVerify) btnVerify.disabled = true;
    heroNote.textContent =
      settings.locale === "it"
        ? "Serve riconfermare il permesso di scrittura."
        : "Write permission needs to be reconfirmed.";
    setFolderStatus.textContent =
      settings.locale === "it"
        ? `Cartella: ${directoryHandle.name} (permesso da riconfermare)`
        : `Folder: ${directoryHandle.name} (permission needed)`;
    applyMode(false);
    await syncSetupFlag(false, directoryHandle.name);
    if (currentView === "stats") await refreshInsights(null);
    return "needs-permission";
  }

  hero.dataset.state = "ready";
  statPermission.textContent = tr("granted", "concesso");
  btnReconfirm.hidden = true;
  setFolderStatus.textContent =
    settings.locale === "it"
      ? `Collegata: ${directoryHandle.name}`
      : `Connected: ${directoryHandle.name}`;
  applyMode(true);
  await syncSetupFlag(true, directoryHandle.name);

  const sync = (await chrome.storage.local.get(MIRROR_SYNC_KEY))[MIRROR_SYNC_KEY];
  const health = await readJsonFile(directoryHandle, "_health.json");
  const last =
    sync?.lastSuccessAt || health?.last_success_at || health?.written_at || null;
  statLast.textContent = last
    ? `${formatAgo(last)} (${new Date(last).toLocaleString()})`
    : tr("never", "mai");

  try {
    const index = await loadIndex(directoryHandle, () => {});
    const projects = Object.keys(index.projects || {}).length;
    const chats = Object.keys(index.chats || {}).length;
    const docs = Object.keys(index.docs || {}).length;
    const counting = tr(
      `${projects} projects · ${chats} chats · ${docs} docs · sizing…`,
      `${projects} progetti · ${chats} chat · ${docs} docs · calcolo size…`,
    );
    statDisk.textContent = counting;
    const disk = await measureDiskStats(directoryHandle);
    lastDiskBytes = disk.bytes;
    const diskLabel = formatBytes(disk.bytes);
    statDisk.textContent = tr(
      `${projects} projects · ${chats} chats · ${docs} docs · ${diskLabel}`,
      `${projects} progetti · ${chats} chat · ${docs} docs · ${diskLabel}`,
    );
    if (currentView === "stats") await refreshInsights(index, diskLabel);
  } catch (err) {
    lastDiskBytes = null;
    statDisk.textContent = tr(
      `index unreadable (${err?.message || err})`,
      `indice non leggibile (${err?.message || err})`,
    );
    if (currentView === "stats") await refreshInsights(null);
  }

  setRunningUi(Boolean(activeAbort));
  return "ready";
}

function renderSummary(result) {
  const d = result.docs || {};
  const c = result.chats || {};
  const targeted = Boolean(result.targeted);
  const kind = targeted
    ? "Retry"
    : result.force
      ? tr("Full sync", "Sync completo")
      : tr("Update", "Aggiornamento");

  const nNew = c.conversations_new || 0;
  const nUpd = c.conversations_updated || 0;
  const nRen = c.conversations_renamed || 0;
  const docsW = d.docs_written || 0;
  const arts = c.artifacts_written || 0;
  const filesN = d.files_written || 0;
  const attN = c.attachments_written || 0;
  const delMoved = result.deletions?.moved || 0;
  const errN = (result.errors || []).length;
  const skipped =
    (d.projects_skipped || 0) +
    (d.docs_skipped || 0) +
    (c.conversations_skipped || 0);

  const chips = [];
  if (nNew) {
    chips.push(
      `<span class="sum-chip">${nNew} ${tr(nNew === 1 ? "new" : "new", nNew === 1 ? "nuova" : "nuove")}</span>`,
    );
  }
  if (nUpd) {
    chips.push(
      `<span class="sum-chip">${nUpd} ${tr("updated", nUpd === 1 ? "aggiornata" : "aggiornate")}</span>`,
    );
  }
  if (nRen) {
    chips.push(
      `<span class="sum-chip">${nRen} ${tr("renamed", nRen === 1 ? "rinominata" : "rinominate")}</span>`,
    );
  }
  if (docsW) chips.push(`<span class="sum-chip">${docsW} doc</span>`);
  if (arts) {
    chips.push(
      `<span class="sum-chip">${arts} ${tr(arts === 1 ? "artifact" : "artifacts", arts === 1 ? "artefatto" : "artefatti")}</span>`,
    );
  }
  if (filesN) chips.push(`<span class="sum-chip">${filesN} file</span>`);
  if (attN) {
    chips.push(
      `<span class="sum-chip">${attN} ${tr(attN === 1 ? "attachment" : "attachments", attN === 1 ? "allegato" : "allegati")}</span>`,
    );
  }
  if (delMoved) {
    chips.push(
      `<span class="sum-chip sum-chip-warn">${delMoved} ${tr("in", "in")} _deleted/</span>`,
    );
  }
  if (errN) {
    chips.push(
      `<span class="sum-chip sum-chip-err">${errN} ${tr(errN === 1 ? "error" : "errors", errN === 1 ? "errore" : "errori")}</span>`,
    );
  }
  if (!chips.length) {
    chips.push(
      `<span class="sum-chip sum-chip-muted">${escapeHtml(tr("No changes", "Nessuna novità"))}</span>`,
    );
  }
  if (skipped) {
    chips.push(
      `<span class="sum-chip sum-chip-muted">${skipped} ${escapeHtml(tr("already up to date", "già a posto"))}</span>`,
    );
  }

  const detailBlocks = [];
  const pushTitles = (label, titles) => {
    if (!titles?.length) return;
    const shown = titles.slice(0, 8);
    const more = titles.length - shown.length;
    detailBlocks.push(
      `<div class="sum-group"><span class="sum-group-label">${escapeHtml(label)}</span>` +
        `<ul class="sum-list">` +
        shown.map((title) => `<li>${escapeHtml(title)}</li>`).join("") +
        (more > 0
          ? `<li class="muted">${escapeHtml(tr(`…and ${more} more`, `…e altre ${more}`))}</li>`
          : "") +
        `</ul></div>`,
    );
  };

  pushTitles(tr("New", "Nuove"), c.new_titles);
  pushTitles(tr("Updated", "Aggiornate"), c.updated_titles);
  pushTitles(tr("Renamed", "Rinominate"), c.renamed_titles);
  pushTitles(tr("Documents", "Documenti"), d.docs_written_titles);
  pushTitles(
    tr("Moved to _deleted/", "Spostate in _deleted/"),
    result.deletions?.moved_titles,
  );

  const mem = result.memory;
  let memLine = "";
  if (mem?.status === "updated") {
    memLine = tr("Memory updated.", "Memoria aggiornata.");
  } else if (mem?.status === "unchanged") {
    memLine = tr("Memory unchanged.", "Memoria invariata.");
  }

  summaryBody.innerHTML =
    `<div class="sum-top">` +
    `<div class="sum-kind">${escapeHtml(tr(`${kind} finished`, `${kind} terminato`))}</div>` +
    `<button type="button" class="btn linkish sum-hide" id="btn-summary-hide">${escapeHtml(t("btn.verifyHide"))}</button>` +
    `</div>` +
    `<div class="sum-chips">${chips.join("")}</div>` +
    (memLine ? `<p class="sum-mem muted">${escapeHtml(memLine)}</p>` : "") +
    (detailBlocks.length
      ? `<details class="sum-details"><summary>${escapeHtml(tr("Title details", "Dettaglio titoli"))}</summary><div class="sum-groups">${detailBlocks.join("")}</div></details>`
      : "");

  summaryPanel.hidden = false;
  const hideBtn = document.getElementById("btn-summary-hide");
  if (hideBtn) {
    hideBtn.onclick = () => {
      summaryPanel.hidden = true;
    };
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderErrors(errors) {
  lastErrors = errors || [];
  while (errorsList.firstChild) errorsList.removeChild(errorsList.firstChild);

  if (!lastErrors.length) {
    errorsPanel.hidden = true;
    return;
  }

  errorsPanel.hidden = false;
  for (const err of lastErrors) {
    const li = document.createElement("li");
    const title = document.createElement("div");
    title.className = "error-title";
    title.textContent = `${err.title || err.id} (${err.kind})`;
    const msg = document.createElement("p");
    msg.className = "error-msg";
    msg.textContent = err.message;
    li.appendChild(title);
    li.appendChild(msg);
    errorsList.appendChild(li);
  }
}

/**
 * @param {{ force?: boolean, onlyChatUuids?: string[] | null, onlyProjectIds?: string[] | null, skipPlan?: boolean }} opts
 */
async function runCapture(opts = {}) {
  if (!directoryHandle || activeAbort || !setupReady || planning) return;

  const targeted =
    opts.onlyChatUuids != null || opts.onlyProjectIds != null;
  const wantPlan =
    settings.confirmBeforeWrite !== false && !targeted && !opts.skipPlan;

  if (wantPlan) {
    await runDryPlan({ force: Boolean(opts.force) });
    return;
  }

  await executeCapture(opts);
}

/**
 * @param {{ force?: boolean }} opts
 */
async function runDryPlan(opts = {}) {
  if (!directoryHandle || activeAbort || !setupReady || planning) return;

  hidePlanPanel();
  summaryPanel.hidden = true;
  clearLogUi();
  renderErrors([]);
  planning = true;
  setRunningUi(false);
  btnUpdate.disabled = true;
  btnFullSync.disabled = true;
  if (btnVerify) btnVerify.disabled = true;

  activeAbort = new AbortController();
  const { signal } = activeAbort;
  btnAbort.hidden = false;
  queueStatus(
    opts.force
      ? tr("Full sync dry-run…", "Dry-run sync completo…")
      : tr("Update dry-run…", "Dry-run aggiornamento…"),
  );

  try {
    const plan = await planCapture(directoryHandle, {
      force: Boolean(opts.force),
      signal,
      onLog: queueLog,
      onStatus: queueStatus,
    });
    flushLog();
    renderPlan(plan, { force: Boolean(opts.force) });
    showToast(
      tr("Plan ready: confirm to write.", "Piano pronto: conferma per scrivere."),
      "ok",
    );
  } catch (err) {
    if (err?.name === "AbortError") {
      queueLog(tr("Dry-run aborted.", "Dry-run interrotto."));
      queueStatus(tr("Aborted.", "Interrotto."));
      showToast(tr("Dry-run aborted.", "Dry-run interrotto."), "err");
    } else {
      console.error(err);
      queueLog(`ERRORE dry-run: ${err?.message || err}`);
      queueStatus(tr("Plan error.", "Errore nel piano."));
      showToast(tr("Dry-run error.", "Errore nel dry-run."), "err");
    }
    hidePlanPanel();
  } finally {
    activeAbort = null;
    planning = false;
    btnAbort.hidden = true;
    setRunningUi(false);
    flushLog();
  }
}

/**
 * @param {{ force?: boolean, onlyChatUuids?: string[] | null, onlyProjectIds?: string[] | null }} opts
 */
async function executeCapture(opts = {}) {
  if (!directoryHandle || activeAbort || !setupReady) return;

  const targeted =
    opts.onlyChatUuids != null || opts.onlyProjectIds != null;

  hidePlanPanel();
  clearLogUi();
  summaryPanel.hidden = true;
  renderErrors([]);
  setRunningUi(true);
  progressStartedAt = Date.now();
  queueStatus(
    targeted
      ? tr("Retrying failed items…", "Ritento pezzi falliti…")
      : opts.force
        ? tr("Full sync in progress…", "Sync completo in corso…")
        : tr("Update in progress…", "Aggiornamento in corso…"),
  );

  activeAbort = new AbortController();
  const { signal } = activeAbort;
  activePause = createPauseController(signal);
  btnPause.textContent = t("btn.pause");
  progressWrap.dataset.paused = "false";

  const startedAt = Date.now();

  try {
    const result = await runFullCapture(directoryHandle, {
      force: Boolean(opts.force),
      signal,
      onlyChatUuids: opts.onlyChatUuids ?? null,
      onlyProjectIds: opts.onlyProjectIds ?? null,
      onLog: queueLog,
      onStatus: queueStatus,
      onProgress: queueProgress,
      pause: activePause,
    });

    flushLog();
    flushProgress();
    if (statusFlushTimer) {
      clearTimeout(statusFlushTimer);
      statusFlushTimer = null;
    }
    heroNote.textContent = "";

    renderSummary(result);
    renderErrors(result.errors || []);

    const durationMs = Date.now() - startedAt;
    await pushSyncHistory({
      at: new Date().toISOString(),
      force: Boolean(result.force),
      ok: !result.captureFailed,
      chatsCaptured: result.chats?.conversations_captured || 0,
      chatsNew: result.chats?.conversations_new || 0,
      chatsUpdated: result.chats?.conversations_updated || 0,
      chatsRenamed: result.chats?.conversations_renamed || 0,
      docsWritten: result.docs?.docs_written || 0,
      artifacts: result.chats?.artifacts_written || 0,
      errors: (result.errors || []).length,
      durationMs,
      targeted,
    });
    await refreshHistory();
    await refreshHero();
    await refreshDeletedStats();

    const toastMsg = result.captureFailed
      ? tr(
          "Capture failed. Check the errors.",
          "Cattura fallita. Controlla gli errori.",
        )
      : targeted
        ? tr("Retry of failed items finished.", "Retry dei pezzi falliti terminato.")
        : result.force
          ? tr("Full sync finished.", "Sync completo terminato.")
          : tr("Update finished.", "Aggiornamento terminato.");
    showToast(toastMsg, result.captureFailed ? "err" : "ok");
    if (!result.captureFailed) {
      clearActionBadge().catch(() => {});
      notifySyncDone(toastMsg).catch(() => {});
    }

    if (
      !result.captureFailed &&
      result.settings?.closeTabWhenDone &&
      !opts.force &&
      !targeted
    ) {
      window.close();
    }
  } catch (err) {
    if (err?.name === "AbortError") {
      queueLog(tr("Aborted by user.", "Interrotto dall’utente."));
      queueStatus(tr("Aborted.", "Interrotto."));
      showToast(tr("Sync aborted.", "Sync interrotto."), "err");
    } else {
      console.error(err);
      queueLog(`ERRORE: ${err?.message || err}`);
      queueStatus(tr("Capture error.", "Errore durante la cattura."));
      await bumpMirrorSyncFailure().catch(() => {});
      renderErrors([
        {
          kind: "fatal",
          id: "run",
          title: tr("Capture interrupted", "Cattura interrotta"),
          message: err?.message || String(err),
        },
      ]);
      showToast(tr("Capture error.", "Errore durante la cattura."), "err");
    }
  } finally {
    activeAbort = null;
    activePause = null;
    setRunningUi(false);
    flushLog();
  }
}

btnChooseFolder.addEventListener("click", async () => {
  setFolderFeedbackEl("");
  try {
    const handle = await showDirectoryPicker({ mode: "readwrite" });
    await saveDirectoryHandle(handle);
    directoryHandle = handle;
    const state = await refreshHero();
    if (state === "ready") {
      setFolderFeedbackEl(
        tr(
          `Folder «${handle.name}» connected.`,
          `Cartella «${handle.name}» collegata.`,
        ),
        "ok",
      );
      showToast(tr("Setup complete.", "Configurazione completata."), "ok");
    } else {
      setFolderFeedbackEl(
        tr(
          "Folder saved, but write permission is still needed.",
          "Cartella salvata, ma serve ancora il permesso di scrittura.",
        ),
        "err",
      );
    }
  } catch (err) {
    if (err?.name === "AbortError") {
      setFolderFeedbackEl(tr("Selection cancelled.", "Selezione annullata."));
      return;
    }
    console.error(err);
    setFolderFeedbackEl(
      err?.message || tr("Could not choose folder.", "Impossibile scegliere la cartella."),
      "err",
    );
  }
});

btnReconfirm.addEventListener("click", async () => {
  setFolderFeedbackEl("");
  if (!directoryHandle) {
    await refreshHero();
    return;
  }
  try {
    const permission = await requestWritePermission(directoryHandle);
    const state = await refreshHero();
    if (permission === "granted" && state === "ready") {
      setFolderFeedbackEl(
        tr("Permission reconfirmed.", "Permesso riconfermato."),
        "ok",
      );
      showToast(
        tr("Permission active. You can update.", "Permesso attivo. Puoi aggiornare."),
        "ok",
      );
    } else {
      setFolderFeedbackEl(
        tr(
          "Permission not granted. Try again or pick another folder.",
          "Permesso non concesso. Riprova o scegli un’altra cartella.",
        ),
        "err",
      );
    }
  } catch (err) {
    console.error(err);
    setFolderFeedbackEl(
      err?.message ||
        tr("Permission request failed.", "Richiesta permesso fallita."),
      "err",
    );
    await refreshHero();
  }
});

btnUpdate.addEventListener("click", () => {
  runCapture({ force: false }).catch(console.error);
});

btnFullSync.addEventListener("click", async () => {
  if (!setupReady) return;
  if (settings.confirmBeforeWrite === false) {
    let sizeHint = "";
    if (lastDiskBytes != null) {
      sizeHint = tr(
        ` Current folder: ${formatBytes(lastDiskBytes)}.`,
        ` Cartella attuale: ${formatBytes(lastDiskBytes)}.`,
      );
    } else if (directoryHandle) {
      try {
        const disk = await measureDiskStats(directoryHandle);
        lastDiskBytes = disk.bytes;
        sizeHint = tr(
          ` Current folder: ${formatBytes(disk.bytes)}.`,
          ` Cartella attuale: ${formatBytes(disk.bytes)}.`,
        );
      } catch {
        /* ignore */
      }
    }

    const ok = confirm(
      tr(
        "Full sync: re-reads everything ignoring the index (hash and visto_il)." +
          " It can take many minutes and rewrite raw JSON." +
          sizeHint +
          " Continue?",
        "Sync completo: rilegge tutto ignorando l’indice (hash e visto_il)." +
          " Può richiedere molti minuti e riscrivere i raw JSON." +
          sizeHint +
          " Continuare?",
      ),
    );
    if (!ok) return;
  }
  runCapture({ force: true }).catch(console.error);
});

btnPlanCancel?.addEventListener("click", () => {
  hidePlanPanel();
  queueStatus(tr("Plan cancelled.", "Piano annullato."));
  showToast(tr("Nothing written.", "Nessuna scrittura."), "ok");
});

btnPlanConfirm?.addEventListener("click", () => {
  if (!pendingPlanOpts) return;
  const force = Boolean(pendingPlanOpts.force);
  hidePlanPanel();
  executeCapture({ force }).catch(console.error);
});

btnVerify?.addEventListener("click", async () => {
  if (!directoryHandle || !setupReady || activeAbort || planning) return;
  verifyPanel.hidden = true;
  clearLogUi();
  planning = true;
  setRunningUi(false);
  btnUpdate.disabled = true;
  btnFullSync.disabled = true;
  btnVerify.disabled = true;
  activeAbort = new AbortController();
  btnAbort.hidden = false;
  queueStatus(tr("Checking vault…", "Controllo vault…"));

  try {
    const report = await verifyVault(directoryHandle, {
      signal: activeAbort.signal,
      onLog: queueLog,
    });
    flushLog();
    renderVerify(report);
    showToast(
      report.issues.missingChats.length +
        report.issues.orphans.length +
        report.issues.idMismatch.length >
        0
        ? tr(
            "Check finished: issues found.",
            "Controllo terminato: ci sono problemi.",
          )
        : tr("Check finished: vault ok.", "Controllo terminato: vault ok."),
      report.issues.missingChats.length ||
        report.issues.orphans.length ||
        report.issues.idMismatch.length
        ? "err"
        : "ok",
    );
  } catch (err) {
    if (err?.name === "AbortError") {
      queueLog(tr("Check aborted.", "Controllo interrotto."));
      showToast(tr("Check aborted.", "Controllo interrotto."), "err");
    } else {
      console.error(err);
      queueLog(`ERRORE verify: ${err?.message || err}`);
      showToast(tr("Check failed.", "Controllo fallito."), "err");
    }
  } finally {
    activeAbort = null;
    planning = false;
    btnAbort.hidden = true;
    setRunningUi(false);
    flushLog();
  }
});

btnVerifyHide?.addEventListener("click", () => {
  verifyPanel.hidden = true;
});

btnPause.addEventListener("click", () => {
  if (!activePause) return;
  if (activePause.paused) {
    activePause.resume();
    btnPause.textContent = t("btn.pause");
    progressWrap.dataset.paused = "false";
    queueLog(tr("Resumed.", "Ripresa."));
    queueStatus(tr("In progress…", "In corso…"));
  } else {
    activePause.pause();
    btnPause.textContent = t("btn.resume");
    progressWrap.dataset.paused = "true";
    queueLog(tr("Paused.", "In pausa."));
    queueStatus(tr("Paused.", "In pausa."));
    progressEta.textContent = tr("paused", "in pausa");
  }
});

btnAbort.addEventListener("click", () => {
  if (activePause?.paused) activePause.resume();
  activeAbort?.abort();
  queueLog(tr("Abort requested…", "Richiesta interruzione…"));
});

btnRetryErrors.addEventListener("click", () => {
  if (!lastErrors.length || !setupReady) return;

  const chatIds = [
    ...new Set(
      lastErrors
        .filter((e) => e.kind === "chat" || e.kind === "chat-rename")
        .map((e) => e.id)
        .filter(Boolean),
    ),
  ];
  const projectIds = [
    ...new Set(
      lastErrors
        .filter((e) => e.kind === "project" || e.kind === "project-file")
        .map((e) => e.id)
        .filter(Boolean),
    ),
  ];

  if (!chatIds.length && !projectIds.length) {
    showToast(
      tr(
        "Nothing to retry individually. Use Update.",
        "Nessun pezzo ritentabile singolarmente. Usa Aggiorna.",
      ),
      "err",
    );
    return;
  }

  // force=true solo sui pezzi filtrati (liste only*), non sync globale.
  runCapture({
    force: true,
    onlyChatUuids: chatIds,
    onlyProjectIds: projectIds,
  }).catch(console.error);
});

btnCopyLog.addEventListener("click", async () => {
  flushLog();
  const text = logLines.join("\n");
  try {
    await navigator.clipboard.writeText(text);
    queueStatus(tr("Log copied to clipboard.", "Log copiato negli appunti."));
    showToast(tr("Log copied.", "Log copiato."), "ok");
  } catch {
    queueStatus(tr("Could not copy log.", "Impossibile copiare il log."));
  }
});

btnStats?.addEventListener("click", () => {
  openStatsPage().catch(console.error);
});

btnStatsRefresh?.addEventListener("click", () => {
  if (insightsBody) {
    insightsBody.innerHTML = `<p class="muted">${t("insights.loading")}</p>`;
  }
  refreshInsights().catch(console.error);
});

btnHome?.addEventListener("click", () => {
  if (!setupReady) {
    setView("settings", { section: "vault", force: true });
    return;
  }
  setView("home");
});

btnSetupGo?.addEventListener("click", () => {
  setView("settings", { section: "vault", force: true });
});

document.querySelectorAll("[data-back-home]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!setupReady) return;
    setView("home");
  });
});

document.querySelectorAll("[data-settings-nav]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const section = btn.getAttribute("data-settings-nav") || "vault";
    setSettingsSection(section);
  });
});

btnSettings.addEventListener("click", () => {
  toggleSettings();
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  settings = await saveSettings({
    captureArtifacts: setArtifacts.checked,
    captureAttachments: setAttachments.checked,
    captureProjectFiles: setProjectFiles.checked,
    confirmBeforeWrite: setConfirmWrite.checked,
    notifyOnSyncDone: Boolean(setNotifySync?.checked),
    writeTags: setWriteTags.checked,
    writeRelated: setWriteRelated.checked,
    autoStartOnOpen: setAutostart.checked,
    closeTabWhenDone: setCloseTab.checked,
    locale: setLocaleEl?.value === "it" ? "it" : "en",
    deletedRetentionDays: Number(setDeletedRetention?.value ?? 30),
    maxAttachmentMb: Number(setMaxAttachment?.value ?? 25),
  });
  fillSettingsForm();
  applyUiLocale();
  queueLog(
    `Settings saved: locale=${settings.locale}, artifacts=${settings.captureArtifacts}, ` +
      `attachments=${settings.captureAttachments}, projectFiles=${settings.captureProjectFiles}.`,
  );
  showToast(
    settings.locale === "it" ? "Opzioni salvate." : "Options saved.",
    "ok",
  );
});

setDeletedRetention?.addEventListener("change", async () => {
  settings = await saveSettings({
    deletedRetentionDays: Number(setDeletedRetention.value ?? 30),
  });
  showToast(
    settings.locale === "it"
      ? "Retention _deleted/ aggiornata."
      : "_deleted/ retention updated.",
    "ok",
  );
});

btnEmptyDeleted.addEventListener("click", async () => {
  if (!directoryHandle || !setupReady) return;
  let st = { files: 0, bytes: 0, exists: false };
  try {
    st = await measureDeletedStats(directoryHandle);
  } catch (err) {
    showToast(
      tr(
        `Cannot read _deleted/: ${err?.message || err}`,
        `Impossibile leggere _deleted/: ${err?.message || err}`,
      ),
      "err",
    );
    return;
  }
  if (!st.exists || st.files === 0) {
    showToast(tr("_deleted/ is already empty.", "_deleted/ è già vuota."), "ok");
    await refreshDeletedStats();
    return;
  }
  const ok = confirm(
    tr(
      `Empty _deleted/? This permanently deletes ${st.files} files (${formatBytes(st.bytes)}). Continue?`,
      `Svuotare _deleted/? Verranno eliminati definitivamente ${st.files} file (${formatBytes(st.bytes)}). Continuare?`,
    ),
  );
  if (!ok) return;
  try {
    await emptyDeletedFolder(directoryHandle);
    showToast(tr("_deleted/ emptied.", "_deleted/ svuotata."), "ok");
    queueLog(
      tr(
        `Emptied _deleted/: ${st.files} files, ${formatBytes(st.bytes)}.`,
        `Svuotata _deleted/: ${st.files} file, ${formatBytes(st.bytes)}.`,
      ),
    );
    await refreshDeletedStats();
  } catch (err) {
    showToast(
      tr(
        `Empty failed: ${err?.message || err}`,
        `Svuotamento fallito: ${err?.message || err}`,
      ),
      "err",
    );
  }
});

function launchTour() {
  if (isOnboardingActive()) return;
  startOnboarding({
    openSettings: (force) => openSettings(Boolean(force)),
    closeSettings: () => {
      if (!setupReady) return;
      setView("home");
    },
    canCloseSettings: () => setupReady,
    setSettingsSection: (section) => {
      setView("settings", { section, force: true });
    },
    goHome: () => {
      if (setupReady) setView("home");
    },
    onFinish: async () => {
      settings = await saveSettings({ onboardingDone: true });
      applyUiLocale();
    },
  });
}

async function boot() {
  const manifest = chrome.runtime.getManifest();
  const ver = manifest.version || "";
  const badge = document.getElementById("version-badge");
  const footerVer = document.getElementById("footer-version");
  if (badge) badge.textContent = ver ? `v${ver}` : "";
  if (footerVer) footerVer.textContent = ver ? `v${ver}` : "";

  applyUiLocale();
  setRunningUi(false);
  fillSettingsForm();
  directoryHandle = await loadDirectoryHandle();
  const state = await refreshHero();
  await refreshHistory();

  const shouldTour = settings.onboardingDone !== true;
  if (shouldTour) {
    requestAnimationFrame(() => launchTour());
  } else if (state === "ready" && settings.autoStartOnOpen) {
    runCapture({ force: false }).catch(console.error);
  }
}

btnReplayTour?.addEventListener("click", () => {
  launchTour();
});

boot().catch((err) => {
  console.error(err);
  heroNote.textContent = err?.message || String(err);
  applyMode(false);
});
