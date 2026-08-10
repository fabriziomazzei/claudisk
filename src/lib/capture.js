/**
 * Orchestratore cattura.
 */

import {
  resolveOrgId,
  setRequestGapMs,
  setRequestTimeoutMs,
  setMaxRetries,
  throwIfAborted,
} from "./api.js";
import { loadIndex, INDEX_FILE } from "./index-store.js";
import { writeJsonFile, readJsonFile } from "./fs-write.js";
import { writeHealthProbe } from "./fs-store.js";
import { captureProjectDocs } from "./capture-docs.js";
import { captureConversations } from "./capture-chats.js";
import { captureMemory } from "./capture-memory.js";
import { processDeletions } from "./deletions.js";
import { writeAllIndici } from "./write-indici.js";
import { ensureMirrorGuides } from "./mirror-guides.js";
import { ensureWikiSeed } from "./wiki-seed.js";
import { writeMirrorSync } from "./mirror-sync.js";
import { loadSettings } from "./settings.js";
import { loadSyncMeta, saveSyncMeta } from "./sync-meta.js";
import { createProgressBus, createPauseController } from "./progress.js";
import { purgeDeletedOlderThan } from "./fs-path.js";

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {{
 *   force?: boolean,
 *   signal?: AbortSignal,
 *   onlyChatUuids?: string[],
 *   onlyProjectIds?: string[],
 *   onLog?: (s: string) => void,
 *   onStatus?: (s: string) => void,
 *   onProgress?: (p: object) => void,
 *   pause?: ReturnType<typeof createPauseController>,
 * }} [options]
 */
export async function runFullCapture(root, options = {}) {
  const {
    force = false,
    signal,
    onlyChatUuids = null,
    onlyProjectIds = null,
    onLog = () => {},
    onStatus = () => {},
    onProgress = () => {},
    pause = null,
  } = options;

  const settings = await loadSettings();
  setRequestGapMs(settings.requestGapMs);
  setRequestTimeoutMs(settings.requestTimeoutMs);
  setMaxRetries(settings.maxRetries);

  const syncMeta = await loadSyncMeta();
  const firstSyncDoneAtStart = Boolean(syncMeta.firstSyncDone);

  const progress = createProgressBus(onProgress);
  const pauseCtrl = pause || createPauseController(signal);
  const pauseGate = () => pauseCtrl.gate();

  const log = (msg) => {
    onLog(msg);
  };
  const status = (msg) => {
    onStatus(msg);
  };

  throwIfAborted(signal);
  const targeted =
    onlyChatUuids != null || onlyProjectIds != null;
  const chatRetryCount = Array.isArray(onlyChatUuids) ? onlyChatUuids.length : null;
  const projectRetryCount = Array.isArray(onlyProjectIds)
    ? onlyProjectIds.length
    : null;

  status(
    targeted
      ? "Ritento pezzi falliti…"
      : force
        ? "Avvio sync completo…"
        : "Avvio aggiornamento…",
  );
  if (targeted) {
    log(
      `Retry mirato: ${projectRetryCount ?? "—"} progetti, ` +
        `${chatRetryCount ?? "—"} chat (ricattura forzata solo di questi).`,
    );
  } else {
    log(
      force
        ? "Sync completo: ignoro indice (hash e visto_il)."
        : "Aggiornamento delta.",
    );
  }

  const index = await loadIndex(root, log);

  status("Risolvo orgId…");
  const orgId = await resolveOrgId(signal);
  log(`orgId: ${orgId}`);

  const docsStats = await captureProjectDocs(root, index, orgId, {
    force,
    signal,
    onlyProjectIds,
    skipProjectsByUpdatedAt: true,
    captureProjectFiles: settings.captureProjectFiles !== false,
    onLog,
    progress,
    pauseGate,
  });

  throwIfAborted(signal);
  await pauseGate();

  const chatStats = await captureConversations(root, index, orgId, {
    force,
    signal,
    onlyChatUuids,
    captureArtifacts: settings.captureArtifacts,
    captureAttachments: settings.captureAttachments,
    maxAttachmentBytes:
      Number(settings.maxAttachmentMb) > 0
        ? Number(settings.maxAttachmentMb) * 1024 * 1024
        : 0,
    writeTags: settings.writeTags !== false,
    writeRelated: settings.writeRelated !== false,
    onLog,
    progress,
    pauseGate,
  });

  throwIfAborted(signal);
  await pauseGate();

  let memoryStats = {
    status: "skipped_retry",
    written: false,
  };
  if (!targeted) {
    status("Memoria…");
    memoryStats = await captureMemory(root, index, orgId, {
      force,
      signal,
      onLog,
      progress,
      pauseGate,
    });
  } else {
    log("Memoria: saltata (retry mirato).");
    progress?.beginPhase("memory", 1, "Memoria");
    progress?.step("saltata");
  }

  throwIfAborted(signal);
  await pauseGate();

  // Soft-delete: solo se abilitato e non è il primo sync.
  // Se only* è un retry mirato, non fare deletions globali.
  let deletionStats = {
    moved: 0,
    moved_titles: [],
    candidates: 0,
    confirmed_missing: 0,
    skipped_uncertain: 0,
    skipped_unconfirmed: 0,
    skipped_disabled: 0,
  };
  if (!targeted) {
    status("Verifico cancellazioni…");
    deletionStats = await processDeletions(
      root,
      index,
      orgId,
      chatStats.listedUuids || [],
      {
        force,
        signal,
        firstSyncDone: firstSyncDoneAtStart,
        detectDeletions: true,
        onLog,
        pauseGate,
        progress,
      },
    );
  } else {
    log("Cancellazioni: saltate (retry mirato).");
    progress?.beginPhase("deletions", 1, "Cancellazioni");
    progress?.step("saltate");
  }

  let deletedPurge = { removed: 0, bytes: 0 };
  if (!targeted && Number(settings.deletedRetentionDays) > 0) {
    throwIfAborted(signal);
    await pauseGate();
    status("Pulizia _deleted/…");
    deletedPurge = await purgeDeletedOlderThan(
      root,
      settings.deletedRetentionDays,
    );
    if (deletedPurge.removed > 0) {
      log(
        `Pulizia _deleted/: rimossi ${deletedPurge.removed} file più vecchi di ${settings.deletedRetentionDays} giorni.`,
      );
    }
  }

  throwIfAborted(signal);
  await pauseGate();

  status("Rigenero INDICE.md…");
  progress.beginPhase("indici", 2, "INDICE.md");
  await writeAllIndici(root, index, log);
  progress.step("INDICE.md");

  await pauseGate();
  await ensureMirrorGuides(root, log);
  await ensureWikiSeed(root, log);

  status("Scrivo index.json…");
  index.updated_at = new Date().toISOString();
  index.org_id = orgId;
  await writeJsonFile(root, INDEX_FILE, index);
  progress.step("index.json");

  const prevHealth = (await readJsonFile(root, "_health.json")) || {};
  const structuredErrors = [
    ...(docsStats.errors || []),
    ...(chatStats.errors || []),
  ];
  const errCount = structuredErrors.length;
  const captureFailed =
    errCount > 0 &&
    docsStats.docs_written === 0 &&
    chatStats.conversations_captured === 0 &&
    docsStats.projects === 0;

  const consecutiveFailures = captureFailed
    ? (prevHealth.consecutive_failures || 0) + 1
    : 0;

  const summary = {
    at: new Date().toISOString(),
    org_id: orgId,
    force,
    docs: docsStats,
    chats: chatStats,
    memory: memoryStats,
    deletions: deletionStats,
    deleted_purge: deletedPurge,
  };

  status("Aggiorno _health.json…");
  await writeHealthProbe(root, {
    source: "mirror-tab",
    via: targeted ? "retry" : force ? "full-sync" : "update",
    last_capture: summary,
    last_success_at: captureFailed
      ? prevHealth.last_success_at || null
      : summary.at,
    last_error: captureFailed
      ? structuredErrors[0]?.message || "cattura fallita"
      : null,
    consecutive_failures: consecutiveFailures,
  });

  await writeMirrorSync(index, {
    ok: !captureFailed,
    consecutiveFailures,
  });

  if (!captureFailed) {
    await saveSyncMeta({ firstSyncDone: true });
  }

  progress.complete("Completato");
  status(captureFailed ? "Cattura fallita." : "Completato.");

  return {
    orgId,
    docs: docsStats,
    chats: chatStats,
    memory: memoryStats,
    deletions: deletionStats,
    errors: structuredErrors,
    captureFailed,
    force,
    targeted,
    settings,
  };
}

export { createPauseController };
