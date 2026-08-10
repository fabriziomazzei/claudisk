/**
 * Allegati messaggi umani → attachments/<chat-uuid>/ + riferimenti markdown.
 */

import { sanitizeFileName, ensureExtension, uniquifyFileName } from "./names.js";
import { ensureDir, writeTextFile, writeBinaryFile } from "./fs-write.js";
import {
  fetchBinaryFromCandidates,
  resolveAttachmentDownloadUrls,
} from "./download-binary.js";
import { gap, throwIfAborted } from "./api.js";

/**
 * @param {any} conversation
 * @param {any[]} branch
 * @param {{
 *   root: FileSystemDirectoryHandle,
 *   orgId: string,
 *   projectFolder: string,
 *   chatUuid: string,
 *   force?: boolean,
 *   stubOnly?: boolean,
 *   maxAttachmentBytes?: number,
 *   index: any,
 *   signal?: AbortSignal,
 *   onLog?: (s: string) => void,
 * }} opts
 */
export async function captureMessageAttachments(conversation, branch, opts) {
  const {
    root,
    orgId,
    projectFolder,
    chatUuid,
    force = false,
    stubOnly = false,
    maxAttachmentBytes = 0,
    index,
    signal,
    onLog = () => {},
  } = opts;

  if (!index.attachments || typeof index.attachments !== "object") {
    index.attachments = {};
  }
  const attIndex = index.attachments;

  /** @type {{ name: string, href: string, messageUuid: string }[]} */
  const links = [];
  /** @type {string[]} */
  const pathsForFrontmatter = [];

  const stats = {
    attachments_written: 0,
    attachments_skipped: 0,
    attachments_stubbed: 0,
    attachments_skipped_size: 0,
    bytes_written: 0,
    errors: /** @type {{ kind: string, id: string, title: string, message: string }[]} */ ([]),
  };

  const usedNames = new Set();
  /** @type {FileSystemDirectoryHandle | null} */
  let attDir = null;

  async function ensureAttDir() {
    if (attDir) return attDir;
    attDir = await ensureDir(
      await ensureDir(await ensureDir(root, projectFolder), "attachments"),
      chatUuid,
    );
    return attDir;
  }

  for (const msg of branch) {
    if (msg?.truncated === true) continue;
    if (msg?.sender !== "human") continue;

    const items = [
      ...(Array.isArray(msg.attachments) ? msg.attachments.map((a) => ({ kind: "attachment", raw: a })) : []),
      ...(Array.isArray(msg.files) ? msg.files.map((f) => ({ kind: "file", raw: f })) : []),
    ];

    for (const item of items) {
      throwIfAborted(signal);
      const raw = item.raw;
      const id =
        raw?.file_uuid || raw?.uuid || raw?.id || null;
      if (!id) continue;

      const displayName =
        (raw.file_name && String(raw.file_name).trim()) ||
        (item.kind === "attachment" && raw.file_type === "txt"
          ? `allegato-${String(id).slice(0, 8)}.txt`
          : `file-${String(id).slice(0, 8)}`);

      const indexKey = `${chatUuid}:${id}`;
      const prev = attIndex[indexKey];
      const createdAt = raw.created_at || null;
      const relativePath = `${projectFolder}/attachments/${chatUuid}/`;

      const isTxtInline =
        item.kind === "attachment" &&
        String(raw.file_type || "").toLowerCase() === "txt" &&
        raw.extracted_content != null;

      const unchanged =
        !force &&
        prev &&
        !prev.stub &&
        prev.created_at &&
        createdAt &&
        prev.created_at === createdAt &&
        prev.percorso;

      if (unchanged && !isTxtInline) {
        stats.attachments_skipped += 1;
        const fileName = prev.percorso.split("/").pop();
        if (fileName) usedNames.add(fileName.toLowerCase());
        const href = `../attachments/${chatUuid}/${fileName}`;
        links.push({
          name: displayName,
          href,
          messageUuid: msg.uuid,
        });
        pathsForFrontmatter.push(`attachments/${chatUuid}/${fileName}`);
        continue;
      }

      let fileName;
      if (prev?.percorso?.startsWith(relativePath)) {
        fileName = prev.percorso.slice(relativePath.length);
        usedNames.add(fileName.toLowerCase());
      } else if (isTxtInline) {
        fileName = uniquifyFileName(
          ensureExtension(displayName, ".txt"),
          usedNames,
        );
      } else {
        fileName = uniquifyFileName(sanitizeFileName(displayName), usedNames);
      }

      const href = `../attachments/${chatUuid}/${fileName}`;
      const percorso = `${relativePath}${fileName}`;

      const declaredSize = Number(
        raw.size ?? raw.file_size ?? raw.size_bytes ?? raw.bytes ?? NaN,
      );
      if (
        maxAttachmentBytes > 0 &&
        Number.isFinite(declaredSize) &&
        declaredSize > maxAttachmentBytes
      ) {
        stats.attachments_skipped_size += 1;
        onLog(
          `Allegato saltato (oltre ${Math.round(maxAttachmentBytes / (1024 * 1024))} MB): ${displayName}`,
        );
        continue;
      }

      if (isTxtInline) {
        // Contenuto già in JSON: non è un download binario.
        const text = String(raw.extracted_content);
        if (
          maxAttachmentBytes > 0 &&
          new TextEncoder().encode(text).length > maxAttachmentBytes
        ) {
          stats.attachments_skipped_size += 1;
          onLog(
            `Allegato saltato (oltre ${Math.round(maxAttachmentBytes / (1024 * 1024))} MB): ${displayName}`,
          );
          continue;
        }
        const dir = await ensureAttDir();
        await writeTextFile(dir, fileName, text);
        stats.attachments_written += 1;
        stats.bytes_written += new TextEncoder().encode(text).length;
      } else if (stubOnly) {
        stats.attachments_stubbed += 1;
      } else {
        const urls = resolveAttachmentDownloadUrls(raw, orgId);
        if (urls.length === 0) {
          stats.errors.push({
            kind: "attachment",
            id: String(id),
            title: displayName,
            message: "Nessun URL di download",
          });
          onLog(`Allegato senza URL: ${displayName}`);
          continue;
        }
        try {
          await gap(signal);
          const buffer = await fetchBinaryFromCandidates(urls, { signal });
          if (maxAttachmentBytes > 0 && buffer.byteLength > maxAttachmentBytes) {
            stats.attachments_skipped_size += 1;
            onLog(
              `Allegato saltato (oltre ${Math.round(maxAttachmentBytes / (1024 * 1024))} MB): ${displayName}`,
            );
            continue;
          }
          const dir = await ensureAttDir();
          await writeBinaryFile(dir, fileName, buffer);
          stats.attachments_written += 1;
          stats.bytes_written += buffer.byteLength;
        } catch (err) {
          if (err?.name === "AbortError") throw err;
          const message = err?.message || String(err);
          stats.errors.push({
            kind: "attachment",
            id: String(id),
            title: displayName,
            message,
          });
          onLog(`Errore allegato ${displayName}: ${message}`);
          continue;
        }
      }

      attIndex[indexKey] = {
        uuid: String(id),
        chat_uuid: chatUuid,
        percorso,
        created_at: createdAt,
        visto_il: new Date().toISOString(),
        tipo: "attachment",
        stub: Boolean(stubOnly && !isTxtInline),
      };

      links.push({ name: displayName, href, messageUuid: msg.uuid });
      pathsForFrontmatter.push(`attachments/${chatUuid}/${fileName}`);
    }
  }

  /** @type {Map<string, { name: string, href: string }[]>} */
  const linksByMessage = new Map();
  for (const link of links) {
    const list = linksByMessage.get(link.messageUuid) || [];
    list.push({ name: link.name, href: link.href });
    linksByMessage.set(link.messageUuid, list);
  }

  return {
    stats,
    attachmentPaths: [...new Set(pathsForFrontmatter)],
    linksByMessage,
  };
}
