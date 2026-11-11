/**
 * Fetta 8: rilevamento cancellazioni (soft-delete).
 *
 * REGOLE NON NEGOZIABILI:
 * 1. Non cancella mai davvero. Sposta in _deleted/<percorso-originale>
 *    conservando la struttura. Se il file esiste già lì, aggiunge un
 *    suffisso con la data.
 * 2. Sposta solo su risposta esplicita di inesistenza (404 dall'endpoint
 *    della singola conversazione). Mai su errore di rete, timeout, 5xx,
 *    429, o risposta di forma inattesa. In dubbio: non tocca niente.
 * 3. Non si attiva mai durante il primo sync dopo l'installazione.
 * 4. Dopo 404 certi, sposta subito in _deleted/ (niente dialog di conferma).
 *    Soft-delete: i file restano recuperabili da _deleted/.
 */

import {
  gap,
  throwIfAborted,
  probeConversationExistence,
  probeThreadExistence,
} from "./api.js";
import {
  softDeleteRelativePath,
  softDeleteDirectoryRelative,
} from "./fs-path.js";

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Thread di canale (cmsg_…). L'elenco thread restituisce solo una finestra
 * recente: l'assenza dalla lista non indica una cancellazione.
 */
function isThreadEntry(uuid, entry) {
  return entry?.tipo === "thread" || String(uuid).startsWith("cmsg_");
}

/**
 * @param {any} index
 * @param {Iterable<string>} listedUuids
 * Nel delta i thread sono esclusi (lista parziale); nel sync completo
 * entrano e vengono verificati sull'endpoint del singolo thread.
 * @param {{ force?: boolean, now?: number }} [opts]
 * @returns {{ uuid: string, titolo: string, percorso: string, visto_il: string, channel_id: string | null }[]}
 */
export function listMissingFromIndex(index, listedUuids, opts = {}) {
  const force = Boolean(opts.force);
  const now = opts.now ?? Date.now();
  const listed = new Set(
    [...listedUuids].map((u) => String(u)).filter(Boolean),
  );
  const chats = index.chats && typeof index.chats === "object" ? index.chats : {};
  /** @type {{ uuid: string, titolo: string, percorso: string, visto_il: string, channel_id: string | null }[]} */
  const out = [];

  for (const [uuid, entry] of Object.entries(chats)) {
    if (!entry?.percorso) continue;
    if (listed.has(uuid)) continue;
    const thread = isThreadEntry(uuid, entry);
    if (thread && !force) continue;

    if (!force) {
      const visto = entry.visto_il ? Date.parse(entry.visto_il) : NaN;
      if (!Number.isFinite(visto) || now - visto > WINDOW_MS) continue;
    }

    out.push({
      uuid,
      titolo: entry.titolo || uuid,
      percorso: entry.percorso,
      visto_il: entry.visto_il || "",
      channel_id: thread ? entry.channel_id || null : null,
    });
  }

  return out;
}

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {any} index
 * @param {string} orgId
 * @param {Iterable<string>} listedUuids
 * @param {{
 *   force?: boolean,
 *   signal?: AbortSignal,
 *   firstSyncDone?: boolean,
 *   detectDeletions?: boolean,
 *   onLog?: (s: string) => void,
 *   pauseGate?: () => Promise<void>,
 *   progress?: { beginPhase: Function, step: Function },
 * }} [options]
 */
export async function processDeletions(
  root,
  index,
  orgId,
  listedUuids,
  options = {},
) {
  const {
    force = false,
    signal,
    firstSyncDone = false,
    detectDeletions = true,
    onLog = () => {},
    pauseGate = async () => {},
    progress = null,
  } = options;

  const log = (msg) => {
    onLog(msg);
  };

  const stats = {
    candidates: 0,
    confirmed_missing: 0,
    moved: 0,
    skipped_uncertain: 0,
    skipped_unconfirmed: 0,
    skipped_disabled: 0,
    moved_titles: /** @type {string[]} */ ([]),
  };

  // Regola 3: mai al primo sync dopo installazione.
  if (!detectDeletions) {
    stats.skipped_disabled = 1;
    log("Rilevamento cancellazioni disattivato.");
    return stats;
  }
  if (!firstSyncDone) {
    stats.skipped_disabled = 1;
    log("Primo sync: salto rilevamento cancellazioni.");
    return stats;
  }

  const listed = new Set([...listedUuids].map((u) => String(u)).filter(Boolean));
  const missingFromList = listMissingFromIndex(index, listed, { force });
  if (!missingFromList.length) {
    log("Nessuna chat assente dalla lista da verificare.");
    return stats;
  }

  stats.candidates = missingFromList.length;
  progress?.beginPhase("deletions", missingFromList.length, "Cancellazioni");
  log(
    `Verifico esistenza di ${missingFromList.length} chat assenti dalla lista` +
      (force ? " (sync completo)" : " (viste negli ultimi 30 giorni)"),
  );

  // Controllo di sanità per i thread: un thread presente in lista deve
  // risultare "exists". Se no, l'endpoint non è affidabile e nessun thread
  // viene spostato (un 404 generalizzato non è una cancellazione).
  let threadProbeTrusted = false;
  if (missingFromList.some((item) => item.channel_id)) {
    const chats = index.chats || {};
    const canary = [...listed].find(
      (uuid) => isThreadEntry(uuid, chats[uuid]) && chats[uuid]?.channel_id,
    );
    if (canary) {
      await gap(signal);
      const verdict = await probeThreadExistence(
        chats[canary].channel_id,
        canary,
        signal,
      );
      threadProbeTrusted = verdict === "exists";
    }
    if (!threadProbeTrusted) {
      log("Verifica thread non affidabile: nessun thread verrà spostato.");
    }
  }

  /** @type {typeof missingFromList} */
  const confirmedGone = [];

  for (const item of missingFromList) {
    throwIfAborted(signal);
    await pauseGate();
    try {
      await gap(signal);
      const isThread = isThreadEntry(item.uuid, index.chats?.[item.uuid]);
      let verdict = isThread
        ? await probeThreadExistence(item.channel_id, item.uuid, signal)
        : await probeConversationExistence(orgId, item.uuid, signal);
      if (isThread && verdict === "missing" && !threadProbeTrusted) {
        verdict = "uncertain";
      }
      if (verdict === "missing") {
        confirmedGone.push(item);
        stats.confirmed_missing += 1;
        log(`404 confermato: ${item.titolo} (${item.uuid.slice(0, 8)}…)`);
      } else if (verdict === "exists") {
        log(`Ancora presente sul server: ${item.titolo}`);
      } else {
        // Regola 2: in dubbio non tocca niente.
        stats.skipped_uncertain += 1;
        log(
          `Esito incerto su ${item.titolo}: non sposto (rete/timeout/5xx/forma).`,
        );
      }
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      stats.skipped_uncertain += 1;
      log(
        `Errore probe ${item.titolo}: ${err?.message || err} - non sposto.`,
      );
    } finally {
      progress?.step(item.titolo);
    }
  }

  if (!confirmedGone.length) {
    log("Nessuna chat con 404 esplicito da spostare.");
    return stats;
  }

  log(
    `Sposto in _deleted/ ${confirmedGone.length} chat con 404 confermato.`,
  );

  for (const item of confirmedGone) {
    throwIfAborted(signal);
    await pauseGate();
    try {
      await softDeleteRelativePath(root, item.percorso);
      // Cartelle collegate alla chat (best-effort, stesso soft-delete).
      const folder = item.percorso.split("/").slice(0, -2).join("/");
      const uuid = item.uuid;
      if (folder) {
        await softDeleteDirectoryRelative(
          root,
          `${folder}/artifacts/${uuid}`,
        ).catch(() => {});
        await softDeleteDirectoryRelative(
          root,
          `${folder}/attachments/${uuid}`,
        ).catch(() => {});
      }
      delete index.chats[item.uuid];
      stats.moved += 1;
      stats.moved_titles.push(item.titolo);
      log(`Spostato in _deleted/: ${item.percorso}`);
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      log(`Impossibile spostare ${item.percorso}: ${err?.message || err}`);
    }
  }

  return stats;
}
