/**
 * Fetta 3: documenti di progetto.
 */

import {
  listAllProjects,
  fetchProjectMeta,
  fetchProjectDocs,
  fetchProjectFiles,
  gap,
  throwIfAborted,
} from "./api.js";
import {
  sanitizeFileName,
  ensureExtension,
  uniquifyFileName,
  sha256Hex,
  buildProgettoMarkdown,
} from "./names.js";
import {
  ensureDir,
  writeTextFile,
  writeJsonFile,
  writeBinaryFile,
} from "./fs-write.js";
import { isStrictlyNewer } from "./index-store.js";
import {
  fetchBinaryFromCandidates,
  resolveProjectFileDownloadUrls,
} from "./download-binary.js";

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {any} index
 * @param {string} orgId
 * @param {{
 *   force?: boolean,
 *   signal?: AbortSignal,
 *   onlyProjectIds?: string[],
 *   skipProjectsByUpdatedAt?: boolean,
 *   captureProjectFiles?: boolean,
 *   onLog?: (s: string) => void,
 *   progress?: { beginPhase: Function, step: Function },
 *   pauseGate?: () => Promise<void>,
 * }} [options]
 */
export async function captureProjectDocs(root, index, orgId, options = {}) {
  const {
    force = false,
    signal,
    onlyProjectIds = null,
    skipProjectsByUpdatedAt = true,
    captureProjectFiles = true,
    onLog = () => {},
    progress = null,
    pauseGate = async () => {},
  } = options;

  const log = (msg) => {
    onLog(msg);
  };

  if (!index.docs || typeof index.docs !== "object") index.docs = {};
  if (!index.files || typeof index.files !== "object") index.files = {};
  if (!index.projects || typeof index.projects !== "object") index.projects = {};

  const docsIndex = index.docs;
  const filesIndex = index.files;
  const projectsIndex = index.projects;

  log(
    force
      ? "Sync completo docs: ignoro updated_at e hash"
      : `Salta progetti invariati (updated_at)=${skipProjectsByUpdatedAt}; file progetto=${captureProjectFiles ? "sì" : "no"}`,
  );

  if (onlyProjectIds != null && onlyProjectIds.length === 0) {
    log("Nessun progetto nel retry: salto fase docs.");
    progress?.beginPhase("docs", 1, "Progetti");
    progress?.step("saltata");
    return {
      projectCount: 0,
      projects: 0,
      projects_skipped: 0,
      docs_written: 0,
      docs_skipped: 0,
      docs_written_titles: [],
      files_written: 0,
      files_skipped: 0,
      files_bytes: 0,
      files_written_titles: [],
      errors: [],
    };
  }

  log("Scarico lista progetti…");
  let projects = await listAllProjects(
    orgId,
    ({ totalSoFar }) => log(`Progetti elencati: ${totalSoFar}`),
    signal,
  );

  if (onlyProjectIds != null) {
    const set = new Set(onlyProjectIds);
    projects = projects.filter((p) => set.has(p.uuid));
  }

  log(`Progetti totali: ${projects.length}`);
  progress?.beginPhase("docs", Math.max(projects.length, 1), "Progetti");

  const usedProjectFolders = new Set(
    Object.values(projectsIndex)
      .map((p) => p?.percorso)
      .filter(Boolean)
      .map((p) => String(p).toLowerCase()),
  );

  const stats = {
    projectCount: projects.length,
    projects: 0,
    projects_skipped: 0,
    docs_written: 0,
    docs_skipped: 0,
    docs_written_titles: [],
    files_written: 0,
    files_skipped: 0,
    files_bytes: 0,
    files_written_titles: [],
    errors: /** @type {{ kind: string, id: string, title: string, message: string }[]} */ ([]),
  };

  let hashDiagLeft = 3;
  const rawDir = await ensureDir(root, "_raw");

  for (let i = 0; i < projects.length; i += 1) {
    throwIfAborted(signal);
    await pauseGate();
    const summary = projects[i];
    const projectId = summary.uuid;
    const label = summary.name || projectId;

    try {
      log(`[${i + 1}/${projects.length}] Meta: ${label}`);
      await gap(signal);
      const meta = await fetchProjectMeta(orgId, projectId, signal);
      const currentUpdated = meta.updated_at || null;
      const prevProject = projectsIndex[projectId];
      const savedUpdated = prevProject?.updated_at || null;
      const wouldSkip =
        !force &&
        Boolean(savedUpdated) &&
        !isStrictlyNewer(currentUpdated, savedUpdated);

      log(
        `[project-updated_at] nome=${label}` +
          ` | salvato=${savedUpdated ?? "(assente)"}` +
          ` | attuale=${currentUpdated ?? "(assente)"}` +
          ` | piùRecente=${isStrictlyNewer(currentUpdated, savedUpdated) ? "sì" : "no"}` +
          ` | force=${force}`,
      );

      const folderName = prevProject?.percorso
        ? prevProject.percorso
        : uniquifyFileName(
            sanitizeFileName(meta.name || summary.name || projectId),
            usedProjectFolders,
          );

      const projectDir = await ensureDir(root, folderName);
      await writeTextFile(
        projectDir,
        "_progetto.md",
        buildProgettoMarkdown(meta),
      );

      projectsIndex[projectId] = {
        uuid: projectId,
        nome: meta.name || summary.name || "",
        descrizione: meta.description || "",
        percorso: folderName,
        updated_at: currentUpdated,
        visto_il: new Date().toISOString(),
      };

      if (skipProjectsByUpdatedAt && wouldSkip) {
        stats.projects_skipped += 1;
        log(`[${i + 1}/${projects.length}] Salto /docs: ${label}`);
        continue;
      }

      log(`[${i + 1}/${projects.length}] Docs: ${label}`);
      await pauseGate();
      await gap(signal);
      const docs = await fetchProjectDocs(orgId, projectId, signal);

      const knowledgeDir = await ensureDir(projectDir, "knowledge");
      await writeJsonFile(rawDir, `docs-${projectId}.json`, docs);

      const usedDocNames = new Set();
      for (const doc of docs) {
        throwIfAborted(signal);
        if (!doc?.uuid) continue;

        const content = doc.content == null ? "" : String(doc.content);
        const hash = await sha256Hex(content);
        const prev = docsIndex[doc.uuid];
        const knowledgePrefix = `${folderName}/knowledge/`;
        const foundInIndex = Boolean(prev);
        const skip = !force && foundInIndex && prev.hash === hash;

        if (hashDiagLeft > 0) {
          hashDiagLeft -= 1;
          log(
            `[hash] uuid=${doc.uuid} trovatoInIndice=${foundInIndex ? "sì" : "no"}` +
              ` | hashIndice=${prev?.hash ?? "(assente)"}` +
              ` | hashCalcolato=${hash}` +
              ` | decisione=${skip ? "salto" : "scrivo"}`,
          );
        }

        if (skip) {
          if (prev.percorso?.startsWith(knowledgePrefix)) {
            usedDocNames.add(
              prev.percorso.slice(knowledgePrefix.length).toLowerCase(),
            );
          }
          stats.docs_skipped += 1;
          continue;
        }

        let fileName;
        if (prev?.percorso?.startsWith(knowledgePrefix)) {
          fileName = prev.percorso.slice(knowledgePrefix.length);
          usedDocNames.add(fileName.toLowerCase());
        } else {
          fileName = uniquifyFileName(
            ensureExtension(doc.file_name || `${doc.uuid}.md`),
            usedDocNames,
          );
        }

        await writeTextFile(knowledgeDir, fileName, content);

        docsIndex[doc.uuid] = {
          uuid: doc.uuid,
          percorso: `${folderName}/knowledge/${fileName}`,
          visto_il: new Date().toISOString(),
          hash,
          project_uuid: projectId,
          tipo: "doc",
        };
        stats.docs_written += 1;
        stats.docs_written_titles.push(doc.file_name || fileName);
      }

      log(`[${i + 1}/${projects.length}] Files: ${label}`);
      await pauseGate();
      if (!captureProjectFiles) {
        log(`[${i + 1}/${projects.length}] File progetto saltati (impostazione off)`);
      } else {
      await gap(signal);
      const projectFiles = await fetchProjectFiles(orgId, projectId, signal);
      await writeJsonFile(rawDir, `files-${projectId}.json`, projectFiles);

      for (const file of projectFiles) {
        throwIfAborted(signal);
        const fileUuid = file?.file_uuid || file?.uuid;
        if (!fileUuid) continue;

        const createdAt = file.created_at || null;
        const prevFile = filesIndex[fileUuid];
        const knowledgePrefix = `${folderName}/knowledge/`;

        if (
          !force &&
          prevFile?.created_at &&
          createdAt &&
          prevFile.created_at === createdAt
        ) {
          if (prevFile.percorso?.startsWith(knowledgePrefix)) {
            usedDocNames.add(
              prevFile.percorso.slice(knowledgePrefix.length).toLowerCase(),
            );
          }
          stats.files_skipped += 1;
          continue;
        }

        const urls = resolveProjectFileDownloadUrls(file, orgId);
        if (urls.length === 0) {
          stats.errors.push({
            kind: "project-file",
            id: projectId,
            title: file.file_name || fileUuid,
            message:
              file?.file_kind === "blob"
                ? "blob senza URL scaricabile (Claude non espone document_asset)"
                : "document_asset.url assente",
          });
          log(`File senza URL: ${file.file_name || fileUuid}`);
          continue;
        }

        let fileName;
        if (prevFile?.percorso?.startsWith(knowledgePrefix)) {
          fileName = prevFile.percorso.slice(knowledgePrefix.length);
          usedDocNames.add(fileName.toLowerCase());
        } else {
          fileName = uniquifyFileName(
            sanitizeFileName(file.file_name || `${fileUuid}.bin`),
            usedDocNames,
          );
        }

        try {
          await gap(signal);
          const buffer = await fetchBinaryFromCandidates(urls, { signal });
          await writeBinaryFile(knowledgeDir, fileName, buffer);

          filesIndex[fileUuid] = {
            uuid: fileUuid,
            percorso: `${folderName}/knowledge/${fileName}`,
            created_at: createdAt,
            visto_il: new Date().toISOString(),
            project_uuid: projectId,
            tipo: "file",
            bytes: buffer.byteLength,
          };
          stats.files_written += 1;
          stats.files_bytes += buffer.byteLength;
          stats.files_written_titles.push(file.file_name || fileName);
        } catch (err) {
          if (err?.name === "AbortError") throw err;
          let message = err?.message || String(err);
          if (err?.status === 404 && file?.file_kind === "blob") {
            message =
              "HTTP 404: file blob (es. xlsx/docx) senza endpoint scaricabile su Claude. " +
              "I PDF con document_asset funzionano; questo tipo spesso no.";
          }
          stats.errors.push({
            kind: "project-file",
            id: projectId,
            title: file.file_name || fileUuid,
            message,
          });
          log(`Errore file ${file.file_name || fileUuid}: ${message}`);
        }
      }
      }

      stats.projects += 1;
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      const message = err?.message || String(err);
      console.error("[capture-docs]", label, message);
      stats.errors.push({
        kind: "project",
        id: projectId,
        title: label,
        message,
      });
      log(`Errore su ${label}: ${message}`);
    } finally {
      progress?.step(label);
    }
  }

  log(
    `Docs: processati ${stats.projects}/${stats.projectCount}, saltati ${stats.projects_skipped}, ` +
      `docs scritti ${stats.docs_written}, invariati ${stats.docs_skipped}, ` +
      `file scritti ${stats.files_written} (${formatMb(stats.files_bytes)}), ` +
      `file saltati ${stats.files_skipped}, errori ${stats.errors.length}.`,
  );

  return stats;
}

function formatMb(bytes) {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.01 && bytes > 0) return `${bytes} B`;
  return `${mb.toFixed(2)} MB`;
}
