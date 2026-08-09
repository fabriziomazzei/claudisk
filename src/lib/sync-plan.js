/**
 * Piano sync (dry-run): elenca cosa verrebbe toccato senza scrivere.
 */

import {
  resolveOrgId,
  listAllProjects,
  listAllConversations,
  setRequestGapMs,
  setRequestTimeoutMs,
  setMaxRetries,
  throwIfAborted,
} from "./api.js";
import { loadIndex } from "./index-store.js";
import { isStrictlyNewer } from "./index-store.js";
import { listMissingFromIndex } from "./deletions.js";
import { loadSettings } from "./settings.js";
import { loadSyncMeta } from "./sync-meta.js";
import { sanitizeFileName } from "./names.js";

function resolveProjectFolder(index, projectUuid, projectEmbed) {
  if (!projectUuid) return "no-project";
  const known = index.projects?.[projectUuid]?.percorso;
  if (known) return known;
  const name = projectEmbed?.name || projectUuid;
  return sanitizeFileName(name);
}

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {{
 *   force?: boolean,
 *   signal?: AbortSignal,
 *   onLog?: (s: string) => void,
 *   onStatus?: (s: string) => void,
 * }} [options]
 */
export async function planCapture(root, options = {}) {
  const {
    force = false,
    signal,
    onLog = () => {},
    onStatus = () => {},
  } = options;

  const settings = await loadSettings();
  setRequestGapMs(settings.requestGapMs);
  setRequestTimeoutMs(settings.requestTimeoutMs);
  setMaxRetries(settings.maxRetries);

  const syncMeta = await loadSyncMeta();
  const firstSyncDone = Boolean(syncMeta.firstSyncDone);

  const log = (msg) => {
    onLog(msg);
  };

  onStatus("Pianifico sync (nessuna scrittura)…");
  log(force ? "Dry-run: sync completo." : "Dry-run: aggiornamento delta.");

  const index = await loadIndex(root, log);
  throwIfAborted(signal);

  onStatus("Risolvo orgId…");
  const orgId = await resolveOrgId(signal);
  log(`orgId: ${orgId}`);

  onStatus("Elenco progetti…");
  const projects = await listAllProjects(
    orgId,
    ({ totalSoFar }) => log(`Progetti elencati: ${totalSoFar}`),
    signal,
  );
  throwIfAborted(signal);

  /** @type {{ id: string, titolo: string, kind: "new" | "known" }[]} */
  const projectRows = [];
  let projectsNew = 0;
  let projectsKnown = 0;
  for (const p of projects) {
    const id = p?.uuid;
    if (!id) continue;
    const known = Boolean(index.projects?.[id]);
    if (known) {
      projectsKnown += 1;
      projectRows.push({
        id,
        titolo: p.name || id,
        kind: "known",
      });
    } else {
      projectsNew += 1;
      projectRows.push({
        id,
        titolo: p.name || id,
        kind: "new",
      });
    }
  }

  onStatus("Elenco conversazioni…");
  const list = await listAllConversations(
    orgId,
    ({ totalSoFar }) => log(`Conversazioni elencate: ${totalSoFar}`),
    signal,
  );
  throwIfAborted(signal);

  /** @type {{ id: string, titolo: string, kind: "new" | "updated", progetto: string }[]} */
  const chatRows = [];
  let chatsNew = 0;
  let chatsUpdated = 0;
  let chatsUnchanged = 0;

  for (const item of list) {
    const uuid = item?.uuid;
    if (!uuid) continue;
    const prev = index.chats?.[uuid];
    const title = item.name || prev?.titolo || uuid.slice(0, 8);
    const folder = resolveProjectFolder(index, item.project_uuid, item.project);
    const needs =
      force ||
      !prev?.visto_il ||
      isStrictlyNewer(item.updated_at, prev.visto_il);

    if (!needs) {
      chatsUnchanged += 1;
      continue;
    }

    const isNew = !prev?.visto_il;
    if (isNew) {
      chatsNew += 1;
      chatRows.push({
        id: uuid,
        titolo: title,
        kind: "new",
        progetto: folder,
      });
    } else {
      chatsUpdated += 1;
      chatRows.push({
        id: uuid,
        titolo: title,
        kind: "updated",
        progetto: folder,
      });
    }
  }

  const deletionCandidates = firstSyncDone
    ? listMissingFromIndex(
        index,
        list.map((c) => c?.uuid).filter(Boolean),
        { force },
      )
    : [];

  const locale = settings.locale === "it" ? "it" : "en";
  const note = (en, it) => (locale === "it" ? it : en);

  const plan = {
    at: new Date().toISOString(),
    orgId,
    force,
    firstSyncDone,
    projects: {
      total: projects.length,
      new: projectsNew,
      known: projectsKnown,
      note: force
        ? note(
            "Full sync: every project will be rechecked (docs/files).",
            "Sync completo: ogni progetto verrà ricontrollato (docs/file).",
          )
        : note(
            "Known projects may be skipped after the updated_at check.",
            "I progetti già noti possono essere saltati dopo il controllo updated_at.",
          ),
      sample: projectRows
        .filter((p) => p.kind === "new")
        .slice(0, 12)
        .concat(
          projectRows.filter((p) => p.kind === "known").slice(0, 8),
        )
        .slice(0, 16),
    },
    chats: {
      total: list.length,
      new: chatsNew,
      updated: chatsUpdated,
      unchanged: chatsUnchanged,
      toWrite: chatsNew + chatsUpdated,
      sample: chatRows.slice(0, 24),
    },
    deletions: {
      candidates: deletionCandidates.length,
      sample: deletionCandidates.slice(0, 12).map((d) => ({
        id: d.uuid,
        titolo: d.titolo,
        percorso: d.percorso,
      })),
      note: firstSyncDone
        ? note(
            "Candidates: missing from the list. Moves into _deleted/ only after a definite 404.",
            "Candidati: assenti dalla lista. Lo spostamento in _deleted/ avviene solo dopo 404 certo.",
          )
        : note(
            "Deletions are disabled on the first sync.",
            "Cancellazioni disattivate al primo sync.",
          ),
    },
    settings: {
      captureArtifacts: settings.captureArtifacts,
      captureAttachments: settings.captureAttachments,
      captureProjectFiles: settings.captureProjectFiles,
    },
  };

  log(
    `Piano: chat da scrivere ${plan.chats.toWrite} ` +
      `(+${chatsNew} nuove, ${chatsUpdated} agg.), ` +
      `progetti ${projects.length} (${projectsNew} nuovi), ` +
      `cancellazioni candidate ${deletionCandidates.length}.`,
  );
  onStatus("Piano pronto. Conferma per scrivere.");

  return plan;
}
