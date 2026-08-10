/**
 * Fetta 4: conversazioni.
 */

import {
  listAllConversations,
  fetchConversation,
  gap,
  throwIfAborted,
} from "./api.js";
import { sanitizeFileName, chatMarkdownFileName } from "./names.js";
import { writeTextAt, moveFileAt } from "./fs-path.js";
import { ensureDir, writeJsonFile, writeTextFile } from "./fs-write.js";
import { conversationToMarkdown, activeBranchMessages } from "./chat-md.js";
import {
  buildChatTags,
  findRelatedChats,
  relativeVaultHref,
} from "./chat-enrich.js";
import { collectArtifacts } from "./artifacts.js";
import { captureMessageAttachments } from "./attachments.js";
import { isStrictlyNewer } from "./index-store.js";

function resolveProjectFolder(index, projectUuid, projectEmbed) {
  if (!projectUuid) return "no-project";
  const known = index.projects?.[projectUuid]?.percorso;
  if (known) return known;
  const name = projectEmbed?.name || projectUuid;
  return sanitizeFileName(name);
}

function chatPath(folder, title, uuid) {
  return `${folder}/chats/${chatMarkdownFileName(title, uuid)}`;
}

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {any} index
 * @param {string} orgId
 * @param {{
 *   force?: boolean,
 *   signal?: AbortSignal,
 *   onlyChatUuids?: string[],
 *   captureArtifacts?: boolean,
 *   captureAttachments?: boolean,
 *   maxAttachmentBytes?: number,
 *   writeTags?: boolean,
 *   writeRelated?: boolean,
 *   onLog?: (s: string) => void,
 *   progress?: { beginPhase: Function, step: Function },
 *   pauseGate?: () => Promise<void>,
 * }} [options]
 */
export async function captureConversations(root, index, orgId, options = {}) {
  const {
    force = false,
    signal,
    onlyChatUuids = null,
    captureArtifacts = true,
    captureAttachments = false,
    maxAttachmentBytes = 0,
    writeTags = true,
    writeRelated = true,
    onLog = () => {},
    progress = null,
    pauseGate = async () => {},
  } = options;

  const log = (msg) => {
    onLog(msg);
  };

  if (!index.chats || typeof index.chats !== "object") index.chats = {};
  if (!index.projects || typeof index.projects !== "object") index.projects = {};

  const chatsIndex = index.chats;
  const rawDir = await ensureDir(root, "_raw");

  if (onlyChatUuids != null && onlyChatUuids.length === 0) {
    log("Nessuna chat nel retry: salto fase chat.");
    progress?.beginPhase("chats", 1, "Chat");
    progress?.step("saltata");
    return {
      conversations_total: 0,
      conversations_to_update: 0,
      conversations_captured: 0,
      conversations_skipped: 0,
      conversations_moved: 0,
      conversations_renamed: 0,
      conversations_new: 0,
      conversations_updated: 0,
      captured_titles: [],
      new_titles: [],
      updated_titles: [],
      renamed_titles: [],
      artifacts_written: 0,
      attachments_written: 0,
      attachments_skipped: 0,
      attachments_stubbed: 0,
      attachments_skipped_size: 0,
      attachments_bytes: 0,
      listedUuids: [],
      errors: [],
    };
  }

  log("Scarico lista conversazioni…");
  let list = await listAllConversations(
    orgId,
    ({ totalSoFar }) => log(`Conversazioni elencate: ${totalSoFar}`),
    signal,
  );

  if (onlyChatUuids != null) {
    const set = new Set(onlyChatUuids);
    list = list.filter((c) => set.has(c.uuid));
  }

  log(`Conversazioni totali in lista: ${list.length}`);

  const listedUuids = list.map((c) => c?.uuid).filter(Boolean);

  const stats = {
    conversations_total: list.length,
    conversations_to_update: 0,
    conversations_captured: 0,
    conversations_skipped: 0,
    conversations_moved: 0,
    conversations_renamed: 0,
    conversations_new: 0,
    conversations_updated: 0,
    captured_titles: /** @type {string[]} */ ([]),
    new_titles: /** @type {string[]} */ ([]),
    updated_titles: /** @type {string[]} */ ([]),
    renamed_titles: /** @type {string[]} */ ([]),
    artifacts_written: 0,
    attachments_written: 0,
    attachments_skipped: 0,
    attachments_stubbed: 0,
    attachments_skipped_size: 0,
    attachments_bytes: 0,
    errors: /** @type {{ kind: string, id: string, title: string, message: string }[]} */ ([]),
  };

  // Prima passata leggera: conta quanti andranno scaricati (per la barra).
  let toFetch = 0;
  if (!force) {
    for (const item of list) {
      const prev = chatsIndex[item?.uuid];
      if (!prev?.visto_il || isStrictlyNewer(item.updated_at, prev.visto_il)) {
        toFetch += 1;
      }
    }
  } else {
    toFetch = list.length;
  }

  progress?.beginPhase(
    "chats",
    toFetch,
    force ? "Sync completo chat" : "Chat da aggiornare",
  );

  let fetched = 0;

  for (let i = 0; i < list.length; i += 1) {
    throwIfAborted(signal);
    await pauseGate();
    const item = list[i];
    const uuid = item?.uuid;
    if (!uuid) continue;

    const prev = chatsIndex[uuid];
    const title = item.name || prev?.titolo || "";
    const updatedAt = item.updated_at;
    const projectUuid = item.project_uuid ?? prev?.project_uuid ?? null;
    const folder = resolveProjectFolder(index, projectUuid, item.project);
    const relativePath = chatPath(folder, title, uuid);
    const isNew = !prev?.visto_il;

    if (prev?.percorso && prev.percorso !== relativePath) {
      try {
        log(`Rinomino/sposto ${uuid.slice(0, 8)}: ${prev.percorso} → ${relativePath}`);
        await moveFileAt(root, prev.percorso, relativePath);
        const oldName = prev.percorso.split("/").pop();
        const newName = relativePath.split("/").pop();
        if (oldName !== newName) {
          stats.conversations_renamed += 1;
          stats.renamed_titles.push(title || uuid.slice(0, 8));
        } else stats.conversations_moved += 1;
        prev.percorso = relativePath;
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        const message = err?.message || String(err);
        log(`Rename/move fallita per ${uuid.slice(0, 8)}: ${message}`);
        stats.errors.push({
          kind: "chat-rename",
          id: uuid,
          title: title || uuid,
          message,
        });
      }
    }

    const needsFetch =
      force || !prev?.visto_il || isStrictlyNewer(updatedAt, prev.visto_il);

    if (!needsFetch) {
      chatsIndex[uuid] = {
        ...prev,
        uuid,
        percorso: relativePath,
        project_uuid: projectUuid,
        titolo: item.name || prev?.titolo || "",
        tipo: "chat",
      };
      stats.conversations_skipped += 1;
      continue;
    }

    stats.conversations_to_update += 1;
    const displayTitle = title || "senza-titolo";

    try {
      log(`[${i + 1}/${list.length}] Catturo chat: ${displayTitle} (${uuid.slice(0, 8)}…)`);
      await pauseGate();
      await gap(signal);
      const full = await fetchConversation(orgId, uuid, signal);

      await writeJsonFile(rawDir, `${uuid}.json`, full);

      const fullProjectUuid = full.project_uuid ?? projectUuid ?? null;
      const fullFolder = resolveProjectFolder(
        index,
        fullProjectUuid,
        full.project || item.project,
      );
      const fullTitle = full.name || item.name || title;
      const finalPath = chatPath(fullFolder, fullTitle, uuid);

      if (
        chatsIndex[uuid]?.percorso &&
        chatsIndex[uuid].percorso !== finalPath
      ) {
        try {
          await moveFileAt(root, chatsIndex[uuid].percorso, finalPath);
          stats.conversations_moved += 1;
        } catch {
          /* ignore */
        }
      }

      const projectLabel = fullProjectUuid
        ? index.projects?.[fullProjectUuid]?.nome ||
          full.project?.name ||
          item.project?.name ||
          fullFolder
        : "no-project";

      const capturedAt = new Date().toISOString();
      const branch = activeBranchMessages(full);

      /** @type {string[]} */
      let artifactPaths = [];
      /** @type {Map<string, { name: string, href: string }>} */
      const artifactLinkByBlockId = new Map();
      /** @type {{ name: string, href: string }[]} */
      const artifactLinkByOrder = [];

      if (captureArtifacts) {
        const collected = collectArtifacts(branch);
        if (collected.files.length) {
          const artDir = await ensureDir(
            await ensureDir(
              await ensureDir(root, fullFolder),
              "artifacts",
            ),
            uuid,
          );

          for (const file of collected.files) {
            await writeTextFile(artDir, file.fileName, file.content);
            stats.artifacts_written += 1;
          }

          artifactPaths = collected.files.map(
            (f) => `artifacts/${uuid}/${f.fileName}`,
          );

          for (const occ of collected.occurrences) {
            const href = `../artifacts/${uuid}/${occ.fileName}`;
            const link = { name: occ.displayName || occ.fileName, href };
            artifactLinkByOrder.push(link);
            if (occ.blockId) artifactLinkByBlockId.set(occ.blockId, link);
          }
        }
      }

      // stubOnly = !captureAttachments: se "cattura" è off, solo riferimenti.
      const attResult = await captureMessageAttachments(full, branch, {
        root,
        orgId,
        projectFolder: fullFolder,
        chatUuid: uuid,
        force,
        stubOnly: !captureAttachments,
        maxAttachmentBytes,
        index,
        signal,
        onLog: log,
      });
      stats.attachments_written += attResult.stats.attachments_written;
      stats.attachments_skipped += attResult.stats.attachments_skipped;
      stats.attachments_stubbed += attResult.stats.attachments_stubbed;
      stats.attachments_skipped_size =
        (stats.attachments_skipped_size || 0) +
        (attResult.stats.attachments_skipped_size || 0);
      stats.attachments_bytes += attResult.stats.bytes_written;
      if (attResult.stats.errors?.length) {
        stats.errors.push(...attResult.stats.errors);
      }

      const tags = writeTags
        ? buildChatTags({
            projectLabel,
            projectUuid: fullProjectUuid,
            isStarred: Boolean(full.is_starred ?? item.is_starred),
            model: full.model || item.model || null,
            createdAt: full.created_at || item.created_at || null,
          })
        : [];

      /** @type {{ id: string, titolo: string, href: string }[]} */
      let correlati = [];
      if (writeRelated) {
        const related = findRelatedChats({
          uuid,
          title: fullTitle,
          projectUuid: fullProjectUuid,
          chatsIndex,
          listItems: list,
          limit: 8,
        });
        correlati = related.map((r) => ({
          id: r.id,
          titolo: r.titolo,
          href: relativeVaultHref(finalPath, r.percorso),
        }));
      }

      const markdown = conversationToMarkdown(full, {
        projectLabel,
        capturedAt,
        artifactPaths,
        artifactLinkByBlockId,
        artifactLinkByOrder,
        attachmentPaths: attResult.attachmentPaths,
        attachmentLinksByMessage: attResult.linksByMessage,
        tags,
        correlati,
      });

      await writeTextAt(root, finalPath, markdown);

      const messaggi = branch.length;

      chatsIndex[uuid] = {
        uuid,
        percorso: finalPath,
        visto_il: updatedAt || full.updated_at || capturedAt,
        project_uuid: fullProjectUuid,
        tipo: "chat",
        titolo: fullTitle || "",
        messaggi,
        model: full.model || item.model || null,
        isStarred: Boolean(full.is_starred ?? item.is_starred),
      };

      const shownTitle = fullTitle || displayTitle;
      stats.conversations_captured += 1;
      stats.captured_titles.push(shownTitle);
      if (isNew) {
        stats.conversations_new += 1;
        stats.new_titles.push(shownTitle);
      } else {
        stats.conversations_updated += 1;
        stats.updated_titles.push(shownTitle);
      }
      fetched += 1;
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      const message = err?.message || String(err);
      console.error("[capture-chats]", message);
      stats.errors.push({
        kind: "chat",
        id: uuid,
        title: displayTitle,
        message,
      });
      log(`Errore chat ${displayTitle}: ${message}`);
      fetched += 1;
    } finally {
      progress?.step(displayTitle);
    }
  }

  log(
    `Chat: totali ${stats.conversations_total}, da aggiornare ${stats.conversations_to_update}, ` +
      `catturate ${stats.conversations_captured} (nuove ${stats.conversations_new}, aggiornate ${stats.conversations_updated}), ` +
      `saltate ${stats.conversations_skipped}, ` +
      `rinominate ${stats.conversations_renamed}, spostate ${stats.conversations_moved}, ` +
      `artefatti ${stats.artifacts_written}, ` +
      `allegati scritti ${stats.attachments_written} (${(stats.attachments_bytes / (1024 * 1024)).toFixed(2)} MB), ` +
      `allegati riferiti ${stats.attachments_stubbed}` +
      (stats.attachments_skipped_size
        ? `, allegati saltati per dimensione ${stats.attachments_skipped_size}`
        : "") +
      `, errori ${stats.errors.length}.`,
    );

  return { ...stats, listedUuids };
}
