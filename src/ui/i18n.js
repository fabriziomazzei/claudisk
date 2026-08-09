/**
 * ClauDisk UI strings. English is the default / source language.
 */

/** @typedef {"en" | "it"} Locale */

/** @type {Record<Locale, Record<string, string>>} */
export const MESSAGES = {
  en: {
    "meta.lede": "Your Claude.ai projects, mirrored live to disk",
    "meta.versionTitle": "Extension version",
    "nav.history": "History",
    "nav.stats": "Statistics",
    "nav.settings": "Settings",
    "setup.title": "Connect a folder",
    "setup.body":
      "Choose the local folder where ClauDisk will write projects, chats, and indexes. Open Settings on the right and finish setup.",
    "stat.folder": "Folder",
    "stat.permission": "Permission",
    "stat.last": "Last update",
    "stat.disk": "On disk",
    "insights.summary": "Archive overview",
    "insights.loading": "Loading stats…",
    "stats.title": "Archive statistics",
    "stats.empty": "Connect a folder and run at least one sync to see statistics.",
    "stats.kpi.projects": "Projects",
    "stats.kpi.chats": "Chats",
    "stats.kpi.docs": "Documents",
    "stats.kpi.files": "Files",
    "stats.kpi.attachments": "Attachments",
    "stats.kpi.noProject": "Outside projects",
    "stats.onDisk": "On disk: {size}",
    "stats.chatsByProject": "Chats by project",
    "stats.docsByProject": "Documents by project",
    "stats.noData": "No data",
    "stats.noDocs": "No indexed documents",
    "stats.freshness": "Chat freshness",
    "stats.last7": "Last 7 days",
    "stats.last30": "Last 30 days",
    "stats.last90": "Last 90 days",
    "stats.freshnessHint":
      "Based on last read in the mirror (visto_il), not creation date on Claude.",
    "stats.activity": "Activity over time",
    "stats.fewTemporal": "Not enough time data yet",
    "stats.activityHint": "Chats touched per month (last read).",
    "stats.recentSyncs": "Recent syncs",
    "stats.noSyncHistory": "No syncs in history yet",
    "stats.legend.update": "update",
    "stats.legend.full": "full sync",
    "stats.legend.error": "error",
    "btn.update": "Update",
    "btn.fullSync": "Full sync",
    "btn.verify": "Check vault",
    "btn.pause": "Pause",
    "btn.resume": "Resume",
    "btn.abort": "Stop",
    "btn.planCancel": "Cancel",
    "btn.planConfirm": "Confirm and write",
    "btn.verifyHide": "Hide",
    "btn.retryErrors": "Retry failed",
    "btn.copyLog": "Copy log",
    "btn.chooseFolder": "Choose folder",
    "btn.reconfirm": "Reconfirm permission",
    "btn.emptyDeleted": "Empty _deleted/",
    "btn.saveSettings": "Save options",
    "btn.close": "Close",
    "plan.defaultKind": "Sync plan",
    "phase.docs": "Projects",
    "phase.chats": "Chats",
    "phase.memory": "Memory",
    "phase.deletions": "Deletions",
    "phase.indici": "Indexes",
    "phase.done": "Done",
    "phase.aria": "Sync phases",
    "progress.inProgress": "In progress…",
    "verify.title": "Vault check",
    "errors.title": "Errors",
    "log.title": "Activity",
    "log.aria": "Sync activity",
    "settings.title": "Settings",
    "settings.folder": "Folder",
    "settings.folderHint":
      "Required. ClauDisk saves markdown, knowledge, and indexes here.",
    "settings.folderNone": "No folder connected.",
    "settings.download": "What to include",
    "settings.downloadHint":
      "Chats, project docs, and indexes are always included. Toggle optional pieces here.",
    "settings.artifacts": "Artifacts generated in chats",
    "settings.artifactsHint":
      "HTML, scripts, and files Claude produced (artifacts/ folder).",
    "settings.attachments": "Message attachments",
    "settings.attachmentsHint":
      "If off: chats keep references without downloading files.",
    "settings.projectFiles": "Files uploaded to projects",
    "settings.projectFilesHint":
      "PDFs and other files in knowledge/ (not inline text docs).",
    "settings.maintenance": "Maintenance",
    "settings.deletedHint":
      "Chats deleted on Claude are moved into the _deleted/ folder.",
    "settings.sync": "Sync",
    "settings.confirmWrite": "Show plan and ask before writing",
    "settings.confirmWriteHint":
      "Lists chats/projects to touch; writing starts only after Confirm.",
    "settings.writeTags": "Heuristic tags in chat frontmatter",
    "settings.writeTagsHint":
      "project/…, starred, model/…, month. No external API.",
    "settings.writeRelated": "Links to related chats in the same project",
    "settings.writeRelatedHint":
      "“Related” section + YAML field. Local heuristics only.",
    "settings.ui": "Interface",
    "settings.language": "Language",
    "settings.autostart": "Start update when this tab opens",
    "settings.closeTab": "Close tab after a successful capture",
    "settings.tour": "Product tour",
    "settings.tourHint": "Replay the spotlight walkthrough of the main controls.",
    "btn.replayTour": "Show tour again",
    "btn.openHistory": "Open sync history",
    "settings.history": "Sync history",
    "settings.historyHint":
      "Recent successful and failed sync runs stored on this browser.",
    "footer.by": "by",
    "footer.disclaimer":
      "Not affiliated with Anthropic. Use at your own risk. Data stays in the folder you choose.",
    "footer.privacy": "Privacy",
    "history.title": "Sync history",
    "history.empty": "No syncs yet.",
    "tour.stepOf": "{n} / {total}",
    "tour.skip": "Skip",
    "tour.back": "Back",
    "tour.next": "Next",
    "tour.done": "Done",
    "tour.welcomeTitle": "Welcome to ClauDisk",
    "tour.welcomeBody":
      "This tab is your control room. ClauDisk copies your Claude.ai projects into a local folder as Markdown for Cursor and Claude Code.",
    "tour.settingsTitle": "Settings",
    "tour.settingsBody":
      "Open Settings anytime to change language, what to download, and sync behaviour.",
    "tour.folderTitle": "Connect a folder",
    "tour.folderBody":
      "Pick (or reconfirm) the local folder where chats, docs, and indexes will be written. Nothing leaves your machine.",
    "tour.languageTitle": "Language",
    "tour.languageBody":
      "English is the default. Switch to Italian here whenever you like.",
    "tour.statsTitle": "Statistics",
    "tour.statsBody":
      "Open Statistics anytime for chats by project, freshness, and recent syncs - without crowding the main screen.",
    "tour.updateTitle": "Update",
    "tour.updateBody":
      "After the folder is connected, use Update for incremental sync or Full sync to rebuild everything. You can also open ClauDisk from the button on claude.ai.",
    "content.loading": "Loading…",
    "content.loadingTitle": "Checking mirror status…",
    "content.reconfirm": "Reconfirm",
    "content.reconfirmTitle":
      "Folder «{folder}» linked: open ClauDisk and reconfirm write permission",
    "content.openMirror": "Open ClauDisk",
    "content.openMirrorTitle": "Open ClauDisk to reconfirm folder and permission",
    "content.configure": "Set up",
    "content.configureTitle": "Connect a local folder in ClauDisk",
    "content.updateNever": "Update · never synced",
    "content.updateNew": "Update · {n} new",
    "content.updateNewAgo": "Update · {n} new · {ago}",
    "content.updateOk": "Update · {ago}",
    "content.agoNow": "just now",
    "content.agoMin": "{n}m ago",
    "content.agoHour": "{n}h ago",
    "content.agoDay": "{n}d ago",
  },
  it: {
    "meta.lede": "I tuoi progetti Claude.ai, specchiati live sul disco",
    "meta.versionTitle": "Versione extension",
    "nav.history": "Cronologia",
    "nav.stats": "Statistiche",
    "nav.settings": "Impostazioni",
    "setup.title": "Collega una cartella",
    "setup.body":
      "Scegli la cartella locale dove ClauDisk scriverà progetti, chat e indici. Apri Impostazioni a destra e completa il collegamento.",
    "stat.folder": "Cartella",
    "stat.permission": "Permesso",
    "stat.last": "Ultimo aggiornamento",
    "stat.disk": "Su disco",
    "insights.summary": "Panoramica archivio",
    "insights.loading": "Caricamento statistiche…",
    "stats.title": "Statistiche archivio",
    "stats.empty":
      "Collega la cartella e fai almeno un sync per vedere le statistiche.",
    "stats.kpi.projects": "Progetti",
    "stats.kpi.chats": "Chat",
    "stats.kpi.docs": "Documenti",
    "stats.kpi.files": "File",
    "stats.kpi.attachments": "Allegati",
    "stats.kpi.noProject": "Fuori progetto",
    "stats.onDisk": "Su disco: {size}",
    "stats.chatsByProject": "Chat per progetto",
    "stats.docsByProject": "Documenti per progetto",
    "stats.noData": "Nessun dato",
    "stats.noDocs": "Nessun documento indicizzato",
    "stats.freshness": "Freschezza chat",
    "stats.last7": "Ultimi 7 giorni",
    "stats.last30": "Ultimi 30 giorni",
    "stats.last90": "Ultimi 90 giorni",
    "stats.freshnessHint":
      "Basato sull’ultima lettura nel mirror (visto_il), non sulla data di creazione su Claude.",
    "stats.activity": "Attività nel tempo",
    "stats.fewTemporal": "Ancora pochi dati temporali",
    "stats.activityHint": "Chat toccate per mese (ultima lettura).",
    "stats.recentSyncs": "Ultime sync",
    "stats.noSyncHistory": "Nessuna sync in cronologia",
    "stats.legend.update": "aggiornamento",
    "stats.legend.full": "sync completo",
    "stats.legend.error": "errore",
    "btn.update": "Aggiorna",
    "btn.fullSync": "Sync completo",
    "btn.verify": "Controlla vault",
    "btn.pause": "Pausa",
    "btn.resume": "Riprendi",
    "btn.abort": "Interrompi",
    "btn.planCancel": "Annulla",
    "btn.planConfirm": "Conferma e scrivi",
    "btn.verifyHide": "Nascondi",
    "btn.retryErrors": "Ritenta falliti",
    "btn.copyLog": "Copia log",
    "btn.chooseFolder": "Scegli cartella",
    "btn.reconfirm": "Riconferma permesso",
    "btn.emptyDeleted": "Svuota _deleted/",
    "btn.saveSettings": "Salva opzioni",
    "btn.close": "Chiudi",
    "plan.defaultKind": "Piano sync",
    "phase.docs": "Progetti",
    "phase.chats": "Chat",
    "phase.memory": "Memoria",
    "phase.deletions": "Cancellazioni",
    "phase.indici": "Indici",
    "phase.done": "Fatto",
    "phase.aria": "Fasi sync",
    "progress.inProgress": "In corso…",
    "verify.title": "Controllo vault",
    "errors.title": "Errori",
    "log.title": "Attività",
    "log.aria": "Attività di sync",
    "settings.title": "Impostazioni",
    "settings.folder": "Cartella",
    "settings.folderHint":
      "Obbligatoria. Qui ClauDisk salva markdown, knowledge e indici.",
    "settings.folderNone": "Nessuna cartella collegata.",
    "settings.download": "Cosa includere nel download",
    "settings.downloadHint":
      "Chat, documenti di progetto e indici ci sono sempre. Qui scegli i pezzi opzionali.",
    "settings.artifacts": "Artefatti generati nelle chat",
    "settings.artifactsHint":
      "HTML, script e file prodotti da Claude (cartella artifacts/).",
    "settings.attachments": "Allegati dei messaggi",
    "settings.attachmentsHint":
      "Se spento: in chat restano i riferimenti, senza scaricare i file.",
    "settings.projectFiles": "File caricati nei progetti",
    "settings.projectFilesHint":
      "PDF e altri file in knowledge/ (non i documenti testo già inline).",
    "settings.maintenance": "Manutenzione",
    "settings.deletedHint":
      "Le chat cancellate su Claude vengono spostate nella cartella _deleted/",
    "settings.sync": "Sync",
    "settings.confirmWrite": "Mostra piano e chiedi conferma prima di scrivere",
    "settings.confirmWriteHint":
      "Elenca chat/progetti da toccare; la scrittura parte solo dopo Conferma.",
    "settings.writeTags": "Tag euristici nel frontmatter delle chat",
    "settings.writeTagsHint":
      "progetto/…, starred, modello/…, mese. Nessuna API esterna.",
    "settings.writeRelated": "Link a chat correlate nello stesso progetto",
    "settings.writeRelatedHint":
      "Sezione «Correlate» + campo YAML. Solo euristiche locali.",
    "settings.ui": "Interfaccia",
    "settings.language": "Lingua",
    "settings.autostart": "Avvia aggiornamento all’apertura di questa tab",
    "settings.closeTab": "Chiudi la tab a cattura riuscita",
    "settings.tour": "Tour guidato",
    "settings.tourHint": "Rivedi il percorso a occhio di bue sui controlli principali.",
    "btn.replayTour": "Mostra di nuovo il tour",
    "btn.openHistory": "Apri cronologia sync",
    "settings.history": "Cronologia sync",
    "settings.historyHint":
      "Sync riuscite e fallite recenti, salvate in questo browser.",
    "footer.by": "di",
    "footer.disclaimer":
      "Non affiliato ad Anthropic. Uso a proprio rischio. I dati restano nella cartella che scegli tu.",
    "footer.privacy": "Privacy",
    "history.title": "Cronologia sync",
    "history.empty": "Nessuna sync ancora.",
    "tour.stepOf": "{n} / {total}",
    "tour.skip": "Salta",
    "tour.back": "Indietro",
    "tour.next": "Avanti",
    "tour.done": "Fine",
    "tour.welcomeTitle": "Benvenuto in ClauDisk",
    "tour.welcomeBody":
      "Questa tab è la console. ClauDisk copia i tuoi progetti Claude.ai in una cartella locale in Markdown, per Cursor e Claude Code.",
    "tour.settingsTitle": "Impostazioni",
    "tour.settingsBody":
      "Apri Impostazioni quando vuoi per lingua, cosa scaricare e comportamento della sync.",
    "tour.folderTitle": "Collega una cartella",
    "tour.folderBody":
      "Scegli (o riconferma) la cartella locale dove verranno scritti chat, docs e indici. Niente esce dal tuo PC.",
    "tour.languageTitle": "Lingua",
    "tour.languageBody":
      "L’inglese è la lingua predefinita. Puoi passare all’italiano quando vuoi.",
    "tour.statsTitle": "Statistiche",
    "tour.statsBody":
      "Apri Statistiche quando vuoi: chat per progetto, freschezza e sync recenti, senza affollare la schermata principale.",
    "tour.updateTitle": "Aggiorna",
    "tour.updateBody":
      "Con la cartella collegata, usa Aggiorna per la sync incrementale o Sync completo per ricostruire tutto. Puoi aprire ClauDisk anche dal bottone su claude.ai.",
    "content.loading": "Caricamento…",
    "content.loadingTitle": "Sto controllando lo stato del mirror…",
    "content.reconfirm": "Riconferma",
    "content.reconfirmTitle":
      "Cartella «{folder}» collegata: apri ClauDisk e riconferma il permesso di scrittura",
    "content.openMirror": "Apri ClauDisk",
    "content.openMirrorTitle": "Apri ClauDisk per riconfermare cartella e permesso",
    "content.configure": "Configura",
    "content.configureTitle": "Collega la cartella locale in ClauDisk",
    "content.updateNever": "Aggiorna · mai aggiornato",
    "content.updateNew": "Aggiorna · {n} nuove",
    "content.updateNewAgo": "Aggiorna · {n} nuove · {ago}",
    "content.updateOk": "Aggiorna · {ago}",
    "content.agoNow": "ora",
    "content.agoMin": "{n}m fa",
    "content.agoHour": "{n}h fa",
    "content.agoDay": "{n}g fa",
  },
};

/** @type {Locale} */
let currentLocale = "en";

/**
 * @param {string} value
 * @returns {Locale}
 */
export function normalizeLocale(value) {
  const v = String(value || "").toLowerCase();
  if (v.startsWith("it")) return "it";
  return "en";
}

/** @returns {Locale} */
export function getLocale() {
  return currentLocale;
}

/**
 * @param {string} locale
 * @returns {Locale}
 */
export function setLocale(locale) {
  currentLocale = normalizeLocale(locale);
  return currentLocale;
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 */
export function t(key, vars = {}) {
  const table = MESSAGES[currentLocale] || MESSAGES.en;
  let out = table[key] ?? MESSAGES.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

/**
 * Apply data-i18n / data-i18n-attr / data-i18n-title on a subtree.
 * @param {ParentNode} [root]
 */
export function applyDomI18n(root = document) {
  const scope = root instanceof Element || root instanceof Document ? root : document;
  scope.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const attr = el.getAttribute("data-i18n-attr");
    if (attr) el.setAttribute(attr, t(key));
    else el.textContent = t(key);
  });
  scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.setAttribute("title", t(key));
  });
  if (scope.documentElement) {
    scope.documentElement.lang = currentLocale;
  } else if (scope === document.body || scope instanceof Document) {
    document.documentElement.lang = currentLocale;
  }
}
