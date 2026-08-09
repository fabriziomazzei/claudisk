/**
 * Traduce i log tecnici in messaggi leggibili per la UI (en | it).
 * La copia "Copia log" resta sul testo grezzo originale.
 */

/**
 * @param {"en" | "it"} locale
 * @param {string} en
 * @param {string} it
 * @returns {string}
 */
function t(locale, en, it) {
  return locale === "it" ? it : en;
}

/**
 * @param {string} line
 * @param {"en" | "it"} [locale="en"]
 * @returns {string}
 */
export function humanizeLogLine(line, locale = "en") {
  const loc = locale === "it" ? "it" : "en";
  const s = String(line || "").trim();
  if (!s) return s;

  let m;

  if (/^orgId:/i.test(s)) {
    return t(loc, "Claude account connected.", "Account Claude collegato.");
  }
  if (s === "Aggiornamento delta.") {
    return t(
      loc,
      "Update: downloading only what changed.",
      "Aggiornamento: scarico solo ciò che è cambiato.",
    );
  }
  if (/^Dry-run:\s*sync completo/i.test(s)) {
    return t(loc, "Dry-run: full sync.", "Dry-run: sync completo.");
  }
  if (/^Dry-run:\s*aggiornamento delta/i.test(s)) {
    return t(loc, "Dry-run: delta update.", "Dry-run: aggiornamento delta.");
  }
  if (/^Sync completo: ignoro indice/i.test(s)) {
    return t(
      loc,
      "Full sync: rechecking everything from scratch.",
      "Sync completo: ricontrollo tutto da capo.",
    );
  }
  if (/^Retry mirato:/i.test(s)) {
    const proj = s.match(/(\d+)\s+progetti/);
    const chat = s.match(/(\d+)\s+chat/);
    const p = proj ? proj[1] : "0";
    const c = chat ? chat[1] : "0";
    return t(
      loc,
      `Retrying only failed items: ${p} projects, ${c} chats.`,
      `Riprovo solo i pezzi falliti: ${p} progetti, ${c} chat.`,
    );
  }
  if (/^Avvio sync completo/i.test(s)) {
    return t(loc, "Starting full sync…", "Avvio sync completo…");
  }
  if (/^Avvio aggiornamento/i.test(s)) {
    return t(loc, "Starting update…", "Avvio aggiornamento…");
  }
  if (/^Ritento pezzi falliti/i.test(s)) {
    return t(loc, "Retrying failed items…", "Riprovo i pezzi andati in errore…");
  }

  if (/^Scarico lista progetti/i.test(s)) {
    return t(loc, "Listing projects…", "Elenco i progetti…");
  }
  if (/^Progetti elencati:\s*(\d+)/i.test(s)) {
    return t(
      loc,
      `Projects found so far: ${RegExp.$1}`,
      `Progetti trovati finora: ${RegExp.$1}`,
    );
  }
  if (/^Progetti totali:\s*(\d+)/i.test(s)) {
    return t(
      loc,
      `Projects to check: ${RegExp.$1}`,
      `Progetti da controllare: ${RegExp.$1}`,
    );
  }
  if (/^Scarico lista conversazioni/i.test(s)) {
    return t(loc, "Listing conversations…", "Elenco le conversazioni…");
  }
  if (/^Conversazioni elencate:\s*(\d+)/i.test(s)) {
    return t(
      loc,
      `Conversations found so far: ${RegExp.$1}`,
      `Conversazioni trovate finora: ${RegExp.$1}`,
    );
  }
  if (/^Conversazioni totali in lista:\s*(\d+)/i.test(s)) {
    return t(
      loc,
      `Conversations to check: ${RegExp.$1}`,
      `Conversazioni da controllare: ${RegExp.$1}`,
    );
  }

  m = s.match(/^\[project-updated_at\]\s*nome=(.+?)\s*\|[\s\S]*piùRecente=(\S+)/i);
  if (m) {
    const name = m[1].trim();
    const newer =
      m[2].toLowerCase().startsWith("sì") || m[2].toLowerCase() === "si";
    return newer
      ? t(
          loc,
          `Project «${name}»: there are updates.`,
          `Progetto «${name}»: ci sono novità.`,
        )
      : t(
          loc,
          `Project «${name}»: unchanged, skipping documents.`,
          `Progetto «${name}»: invariato, salto i documenti.`,
        );
  }

  if (/^\[hash\]/i.test(s)) {
    if (/decisione=salto/i.test(s)) {
      return t(
        loc,
        "Document already up to date, skipping.",
        "Documento già aggiornato, lo salto.",
      );
    }
    if (/decisione=scrivo/i.test(s)) {
      return t(
        loc,
        "Document changed, updating it.",
        "Documento cambiato, lo aggiorno.",
      );
    }
    return t(
      loc,
      "Checking whether the document changed…",
      "Controllo se il documento è cambiato…",
    );
  }

  m = s.match(/^\[(\d+)\/(\d+)\]\s*Meta:\s*(.+)$/i);
  if (m) {
    return t(
      loc,
      `[${m[1]}/${m[2]}] Checking project: ${m[3]}`,
      `[${m[1]}/${m[2]}] Controllo progetto: ${m[3]}`,
    );
  }

  m = s.match(/^\[(\d+)\/(\d+)\]\s*Salto \/docs:\s*(.+)$/i);
  if (m) {
    return t(
      loc,
      `[${m[1]}/${m[2]}] «${m[3]}» unchanged: documents already in place.`,
      `[${m[1]}/${m[2]}] «${m[3]}» senza novità: documenti già a posto.`,
    );
  }

  m = s.match(/^\[(\d+)\/(\d+)\]\s*Docs:\s*(.+)$/i);
  if (m) {
    return t(
      loc,
      `[${m[1]}/${m[2]}] Downloading documents for «${m[3]}»`,
      `[${m[1]}/${m[2]}] Scarico i documenti di «${m[3]}»`,
    );
  }

  m = s.match(/^\[(\d+)\/(\d+)\]\s*Files:\s*(.+)$/i);
  if (m) {
    return t(
      loc,
      `[${m[1]}/${m[2]}] Downloading files for «${m[3]}»`,
      `[${m[1]}/${m[2]}] Scarico i file di «${m[3]}»`,
    );
  }

  m = s.match(
    /^\[(\d+)\/(\d+)\]\s*File progetto saltati \(impostazione off\)$/i,
  );
  if (m) {
    return t(
      loc,
      `[${m[1]}/${m[2]}] Project files not downloaded (option off).`,
      `[${m[1]}/${m[2]}] File di progetto non scaricati (opzione disattivata).`,
    );
  }

  m = s.match(/^\[(\d+)\/(\d+)\]\s*Catturo chat:\s*(.+?)\s*\([0-9a-f-]{8,}…?\)$/i);
  if (m) {
    return t(
      loc,
      `[${m[1]}/${m[2]}] Downloading chat: ${m[3]}`,
      `[${m[1]}/${m[2]}] Scarico la chat: ${m[3]}`,
    );
  }

  m = s.match(/^\[(\d+)\/(\d+)\]\s*Catturo chat:\s*(.+)$/i);
  if (m) {
    return t(
      loc,
      `[${m[1]}/${m[2]}] Downloading chat: ${m[3]}`,
      `[${m[1]}/${m[2]}] Scarico la chat: ${m[3]}`,
    );
  }

  if (/^Salta progetti invariati \(updated_at\)=true/i.test(s)) {
    return t(
      loc,
      "Unchanged projects will be skipped (faster).",
      "I progetti senza novità verranno saltati (più veloce).",
    );
  }
  if (/file progetto=sì/i.test(s) && /Salta progetti/i.test(s)) {
    return t(
      loc,
      "Unchanged projects will be skipped; project files will be downloaded.",
      "I progetti senza novità verranno saltati; i file di progetto si scaricano.",
    );
  }
  if (/file progetto=no/i.test(s) && /Salta progetti/i.test(s)) {
    return t(
      loc,
      "Unchanged projects will be skipped; project files will not.",
      "I progetti senza novità verranno saltati; i file di progetto no.",
    );
  }
  if (/^Force:|^Sync completo docs:/i.test(s)) {
    return t(
      loc,
      "Full project sync: re-downloading even what looks unchanged.",
      "Sync completo sui progetti: riscarico anche ciò che sembra invariato.",
    );
  }

  if (/^Memoria: saltata/i.test(s)) {
    return t(
      loc,
      "Memory: skipping this step (targeted retry).",
      "Memoria: salto questo passaggio (retry mirato).",
    );
  }
  if (/^Memoria invariata/i.test(s)) {
    return t(loc, "Memory: no changes.", "Memoria: nessuna modifica.");
  }
  if (/^Memoria aggiornata/i.test(s)) {
    return t(loc, "Memory: updated.", "Memoria: aggiornata.");
  }
  if (/^Memoria: endpoint errore/i.test(s)) {
    return t(
      loc,
      "Memory: unreachable right now, keeping the saved copy.",
      "Memoria: non raggiungibile ora, lascio quella già salvata.",
    );
  }
  if (/^Memoria: forma inattesa/i.test(s)) {
    return t(
      loc,
      "Memory: invalid response, keeping the saved copy.",
      "Memoria: risposta non valida, lascio quella già salvata.",
    );
  }
  if (/^Memoria: errore/i.test(s)) {
    return t(
      loc,
      "Memory: minor error, continuing without blocking.",
      "Memoria: piccolo errore, continuo senza bloccare.",
    );
  }

  if (/^Cancellazioni: saltate/i.test(s)) {
    return t(
      loc,
      "Deletions: skipping this step (targeted retry).",
      "Cancellazioni: salto questo passaggio (retry mirato).",
    );
  }
  if (/^Rilevamento cancellazioni disattivato/i.test(s)) {
    return t(
      loc,
      "Deletion detection is disabled.",
      "Controllo cancellazioni disattivato.",
    );
  }
  if (/^Primo sync: salto rilevamento/i.test(s)) {
    return t(
      loc,
      "First sync: not moving anything to _deleted/ yet.",
      "Primo sync: non sposto ancora nulla in _deleted/.",
    );
  }
  if (/^Nessuna chat assente/i.test(s)) {
    return t(
      loc,
      "No chats to check for deletions.",
      "Nessuna chat da verificare per le cancellazioni.",
    );
  }
  if (/^Candidati:/i.test(s)) {
    return t(
      loc,
      "Candidates: missing from the list. Moves to _deleted/ happen only after a confirmed 404.",
      "Candidati: assenti dalla lista. Lo spostamento in _deleted/ avviene solo dopo 404 certo.",
    );
  }
  if (/^Cancellazioni disattivate al primo sync/i.test(s)) {
    return t(
      loc,
      "Deletions disabled on the first sync.",
      "Cancellazioni disattivate al primo sync.",
    );
  }
  if (/^404 confermato:/i.test(s)) {
    return loc === "it"
      ? s.replace(/^404 confermato:/i, "Confermata cancellazione su Claude:")
      : s.replace(/^404 confermato:/i, "Confirmed deletion on Claude:");
  }
  if (/^Sposto in _deleted\//i.test(s)) {
    return loc === "it"
      ? s.replace(/^Sposto in _deleted\//i, "Sposto nella cartella _deleted/")
      : s.replace(/^Sposto in _deleted\//i, "Moving to _deleted/ folder ");
  }
  if (/^Spostato in _deleted\//i.test(s)) {
    return loc === "it"
      ? s.replace(/^Spostato in _deleted\//i, "Spostata in _deleted/")
      : s.replace(/^Spostato in _deleted\//i, "Moved to _deleted/");
  }
  if (/^Verifico esistenza di/i.test(s)) {
    if (loc === "it") {
      return s
        .replace(/\(sync completo\)/i, "(controllo completo)")
        .replace(/\(viste negli ultimi 30 giorni\)/i, "(viste di recente)");
    }
    return s
      .replace(/^Verifico esistenza di/i, "Checking existence of")
      .replace(/chat assenti dalla lista/i, "chats missing from the list")
      .replace(/\(sync completo\)/i, "(full sync)")
      .replace(/\(viste negli ultimi 30 giorni\)/i, "(seen recently)");
  }

  if (/^Rigenero INDICE/i.test(s)) {
    return t(loc, "Updating indexes…", "Aggiorno gli indici…");
  }
  if (/^INDICE\.md/i.test(s)) {
    return loc === "it"
      ? s.replace(/INDICE\.md/g, "indice")
      : s
          .replace(/INDICE\.md\s+aggiornato:/i, "Index updated:")
          .replace(/INDICE\.md\s+radice aggiornato/i, "Root index updated")
          .replace(/INDICE\.md/g, "index");
  }
  if (/^AGENTS\.md|^CLAUDE\.md/i.test(s)) {
    if (loc === "it") {
      return s.replace(/alla radice/i, "nella cartella");
    }
    return s
      .replace(/creato alla radice/i, "created at the root")
      .replace(/aggiornato \(guide v/i, "updated (guides v")
      .replace(
        /personalizzato o già aggiornato: non sovrascritto/i,
        "customized or already current: not overwritten",
      );
  }
  if (/^Scrivo index\.json/i.test(s)) {
    return t(loc, "Saving the internal index…", "Salvo l’indice interno…");
  }
  if (/^Completato\. Artefatti scritti/i.test(s)) {
    const n = s.match(/(\d+)/);
    const count = n ? Number(n[1]) : 0;
    if (count > 0) {
      return t(
        loc,
        `Done. Artifacts saved: ${count}.`,
        `Completato. Artefatti salvati: ${count}.`,
      );
    }
    return t(loc, "Done.", "Completato.");
  }
  if (/^Cattura fallita/i.test(s)) {
    return t(
      loc,
      "Capture failed. Check the errors.",
      "Cattura non riuscita. Controlla gli errori.",
    );
  }

  if (/^Errore chat /i.test(s)) {
    return loc === "it"
      ? s.replace(/^Errore chat /i, "Errore sulla chat ")
      : s.replace(/^Errore chat /i, "Chat error ");
  }
  if (/^Errore su /i.test(s)) {
    return loc === "it"
      ? s.replace(/^Errore su /i, "Errore sul progetto ")
      : s.replace(/^Errore su /i, "Project error ");
  }
  if (/^Errore file /i.test(s)) {
    return loc === "it"
      ? s.replace(/^Errore file /i, "Errore sul file ")
      : s.replace(/^Errore file /i, "File error ");
  }
  if (/^File senza URL:/i.test(s)) {
    return loc === "it"
      ? s.replace(/^File senza URL:/i, "File non scaricabile (manca il link):")
      : s.replace(/^File senza URL:/i, "File not downloadable (missing link):");
  }
  if (/^Rinomino\/sposto /i.test(s)) {
    return loc === "it"
      ? s.replace(/^Rinomino\/sposto [0-9a-f-]+:\s*/i, "Sposto o rinomino: ")
      : s.replace(/^Rinomino\/sposto [0-9a-f-]+:\s*/i, "Moving or renaming: ");
  }
  if (/^Rename\/move fallita/i.test(s)) {
    return t(
      loc,
      "Could not rename or move a chat.",
      "Non sono riuscito a rinominare o spostare una chat.",
    );
  }

  if (/^Impostazioni salvate:/i.test(s) || /^Settings saved:/i.test(s)) {
    if (loc === "it") {
      return s
        .replace(/^Settings saved:/i, "Impostazioni salvate:")
        .replace(/artefatti=/gi, "artefatti ")
        .replace(/artifacts=/gi, "artefatti ")
        .replace(/allegati=/gi, "allegati ")
        .replace(/attachments=/gi, "allegati ")
        .replace(/fileProgetto=/gi, "file di progetto ")
        .replace(/projectFiles=/gi, "file di progetto ")
        .replace(/locale=/gi, "lingua ")
        .replace(/true/gi, "sì")
        .replace(/false/gi, "no");
    }
    return s
      .replace(/^Impostazioni salvate:/i, "Settings saved:")
      .replace(/artefatti=/gi, "artifacts=")
      .replace(/allegati=/gi, "attachments=")
      .replace(/fileProgetto=/gi, "projectFiles=")
      .replace(/\bsì\b/gi, "yes")
      .replace(/\bno\b/gi, "no");
  }

  if (/^Nessun progetto nel retry/i.test(s)) {
    return t(
      loc,
      "No projects to retry in this phase.",
      "Nessun progetto da ritentare in questa fase.",
    );
  }
  if (/^Nessuna chat nel retry/i.test(s)) {
    return t(
      loc,
      "No chats to retry in this phase.",
      "Nessuna chat da ritentare in questa fase.",
    );
  }

  if (/^Piano:/i.test(s)) {
    if (loc === "it") return s;
    return s
      .replace(/^Piano:/i, "Plan:")
      .replace(/chat da scrivere/i, "chats to write")
      .replace(/nuove/i, "new")
      .replace(/agg\./i, "upd.")
      .replace(/progetti/i, "projects")
      .replace(/nuovi/i, "new")
      .replace(/cancellazioni candidate/i, "deletion candidates");
  }

  if (/^Docs:/i.test(s)) {
    if (loc === "it") {
      return s
        .replace(/^Docs:\s*/i, "Progetti: ")
        .replace(/processati/i, "controllati")
        .replace(/docs scritti/i, "documenti aggiornati")
        .replace(/invariati/i, "documenti già a posto")
        .replace(/file scritti/i, "file salvati")
        .replace(/file saltati/i, "file già presenti")
        .replace(/errori/i, "errori");
    }
    return s
      .replace(/^Docs:\s*/i, "Projects: ")
      .replace(/processati/i, "checked")
      .replace(/saltati/i, "skipped")
      .replace(/docs scritti/i, "documents updated")
      .replace(/invariati/i, "unchanged documents")
      .replace(/file scritti/i, "files saved")
      .replace(/file saltati/i, "files already present")
      .replace(/errori/i, "errors");
  }

  // Unmatched: leave as-is (no invented translations).
  return s;
}
