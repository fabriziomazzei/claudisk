/**
 * ClauDisk UI strings. English is the default / source language.
 */

/** @typedef {"en" | "it"} Locale */

/** @type {Record<Locale, Record<string, string>>} */
export const MESSAGES = {
  en: {
    "meta.lede":
      "Free local mirror of your Claude.ai projects - always current, across every project",
    "meta.versionTitle": "Extension version",
    "nav.home": "Home",
    "nav.backSync": "Sync",
    "nav.history": "History",
    "nav.stats": "Statistics",
    "nav.settings": "Settings",
    "settings.nav.whatsnew": "What's new",
    "settings.nav.about": "About",
    "settings.whatsnew.title": "What's new",
    "settings.whatsnew.lead": "Short release notes for this extension. Newest first.",
    "settings.about.title": "About",
    "settings.about.lead": "Product info, privacy, and credits.",
    "settings.about.author": "Author",
    "settings.about.website": "Website",
    "settings.about.license": "License",
    "settings.about.privacy": "Privacy",
    "settings.about.libs": "Open source / runtime",
    "settings.about.libsBody":
      "No bundled third-party UI libraries. Chrome Extension APIs and the File System Access API.",
    "settings.about.disclaimer":
      "Not affiliated with Anthropic. Claude is a trademark of Anthropic PBC. Use at your own risk.",
    "settings.retention": "Keep _deleted/ for",
    "settings.retention.never": "Never auto-purge",
    "settings.retentionHint":
      "Soft-deleted files older than this are removed automatically after each sync. Default 30 days balances recovery and privacy.",
    "settings.maxAttachment": "Skip attachments larger than",
    "settings.maxAttachmentHint":
      "Large binaries stay out of the vault. Applies when message attachments are enabled.",
    "setup.title": "Connect a folder",
    "setup.body":
      "Choose the local folder where ClauDisk will write projects, chats, and indexes. Open Settings and finish setup.",
    "setup.goSettings": "Open Settings",
    "stat.folder": "Folder",
    "stat.permission": "Permission",
    "stat.last": "Last update",
    "stat.disk": "On disk",
    "insights.summary": "Archive overview",
    "insights.loading": "Loading stats…",
    "stats.title": "Archive statistics",
    "stats.lead":
      "A wider look at your vault: volume, projects, freshness, and recent syncs.",
    "stats.empty": "Connect a folder and run at least one sync to see statistics.",
    "stats.concentration": "Concentration",
    "stats.models": "Models seen",
    "stats.oldest": "Longest idle chats",
    "stats.byMessages": "Most messages",
    "stats.byFiles": "Most files attached",
    "stats.filesByProject": "Files by project",
    "btn.refreshStats": "Refresh",
    "settings.nav.vault": "Vault",
    "settings.nav.capture": "Capture",
    "settings.nav.app": "App",
    "settings.vaultLead":
      "Local folder for the mirror, plus housekeeping for chats removed on Claude.ai.",
    "settings.appLead":
      "Language, how this tab behaves when it opens, and the optional product tour.",
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
    "settings.folderLead":
      "Pick the local folder ClauDisk uses as your vault. Everything stays on this machine.",
    "settings.folderHint":
      "Required. ClauDisk saves markdown, knowledge, and indexes here.",
    "settings.folderNone": "No folder connected.",
    "settings.download": "What to include",
    "settings.downloadLead":
      "Chats, project docs, and indexes are always mirrored. Toggle heavier optional payloads here.",
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
    "settings.maintenanceLead":
      "Housekeeping for chats removed on Claude.ai. Safe deletes land in _deleted/ first.",
    "settings.deletedHint":
      "Chats deleted on Claude are moved into the _deleted/ folder.",
    "settings.sync": "Sync",
    "settings.syncLead":
      "Control the dry-run confirm step and how chat Markdown is enriched on disk.",
    "settings.confirmWrite": "Default dry-run for Update",
    "settings.confirmWriteHint":
      "Show the plan and ask before writing. Turn off to write immediately on Update.",
    "settings.notifySync": "Desktop notification when sync finishes",
    "settings.notifySyncHint": "Uses Chrome notifications. Off by default.",
    "settings.writeTags": "Heuristic tags in chat frontmatter",
    "settings.writeTagsHint":
      "project/…, starred, model/…, month. No external API.",
    "settings.writeRelated": "Links to related chats in the same project",
    "settings.writeRelatedHint":
      "“Related” section + YAML field. Local heuristics only.",
    "settings.ui": "Interface",
    "settings.uiLead":
      "How this tab behaves when it opens, and the optional product tour.",
    "settings.language": "Language",
    "settings.languageLead":
      "Choose the language for this ClauDisk tab. English is the default.",
    "settings.autostart": "Start update when this tab opens",
    "settings.closeTab": "Close tab after a successful capture",
    "settings.tour": "Product tour",
    "settings.tourHint": "Replay the spotlight walkthrough of the main controls.",
    "settings.saveHint": "Changes apply after you save.",
    "btn.replayTour": "Show tour again",
    "btn.openHistory": "Open sync history",
    "settings.history": "Sync history",
    "settings.historyHint":
      "Recent successful and failed sync runs stored on this browser.",
    "settings.historyLead":
      "Recent successful and failed sync runs stored in this browser (last 10).",
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
      "Open Settings anytime for a full page of options: language, downloads, sync behaviour, and history.",
    "tour.folderTitle": "Connect a folder",
    "tour.folderBody":
      "Pick (or reconfirm) the local folder where chats, docs, and indexes will be written. Nothing leaves your machine.",
    "tour.languageTitle": "Language",
    "tour.languageBody":
      "English is the default. Switch to Italian here whenever you like.",
    "tour.statsTitle": "Statistics",
    "tour.statsBody":
      "Open Statistics for a full-page view of chats by project, freshness, and recent syncs.",
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
    "meta.lede":
      "Mirror locale gratuito dei tuoi progetti Claude.ai - sempre aggiornato, attraverso tutti i progetti",
    "meta.versionTitle": "Versione extension",
    "nav.home": "Home",
    "nav.backSync": "Sync",
    "nav.history": "Cronologia",
    "nav.stats": "Statistiche",
    "nav.settings": "Impostazioni",
    "settings.nav.whatsnew": "Novità",
    "settings.nav.about": "Informazioni",
    "settings.whatsnew.title": "Novità",
    "settings.whatsnew.lead": "Note di rilascio sintetiche. Dalla più recente.",
    "settings.about.title": "Informazioni",
    "settings.about.lead": "Prodotto, privacy e crediti.",
    "settings.about.author": "Autore",
    "settings.about.website": "Sito web",
    "settings.about.license": "Licenza",
    "settings.about.privacy": "Privacy",
    "settings.about.libs": "Open source / runtime",
    "settings.about.libsBody":
      "Nessuna libreria UI di terze parti inclusa. Chrome Extension API e File System Access API.",
    "settings.about.disclaimer":
      "Non affiliato ad Anthropic. Claude è un marchio di Anthropic PBC. Uso a tuo rischio.",
    "settings.retention": "Mantieni _deleted/ per",
    "settings.retention.never": "Mai auto-pulizia",
    "settings.retentionHint":
      "I file soft-deleted più vecchi di questa soglia vengono rimossi dopo ogni sync. Default 30 giorni: recupero e privacy.",
    "settings.maxAttachment": "Salta allegati più grandi di",
    "settings.maxAttachmentHint":
      "I binari grandi restano fuori dal vault. Vale se gli allegati messaggio sono attivi.",
    "setup.title": "Collega una cartella",
    "setup.body":
      "Scegli la cartella locale dove ClauDisk scriverà progetti, chat e indici. Apri Impostazioni e completa il collegamento.",
    "setup.goSettings": "Apri Impostazioni",
    "stat.folder": "Cartella",
    "stat.permission": "Permesso",
    "stat.last": "Ultimo aggiornamento",
    "stat.disk": "Su disco",
    "insights.summary": "Panoramica archivio",
    "insights.loading": "Caricamento statistiche…",
    "stats.title": "Statistiche archivio",
    "stats.lead":
      "Una vista ampia del vault: volume, progetti, freschezza e sync recenti.",
    "stats.empty":
      "Collega la cartella e fai almeno un sync per vedere le statistiche.",
    "stats.concentration": "Concentrazione",
    "stats.models": "Modelli visti",
    "stats.oldest": "Chat più ferme",
    "stats.byMessages": "Più messaggi",
    "stats.byFiles": "Più file allegati",
    "stats.filesByProject": "File per progetto",
    "btn.refreshStats": "Aggiorna",
    "settings.nav.vault": "Vault",
    "settings.nav.capture": "Cattura",
    "settings.nav.app": "App",
    "settings.vaultLead":
      "Cartella locale del mirror e pulizia delle chat rimosse su Claude.ai.",
    "settings.appLead":
      "Lingua, comportamento all’apertura della tab e tour prodotto opzionale.",
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
    "settings.folderLead":
      "Scegli la cartella locale usata come vault. Tutto resta su questa macchina.",
    "settings.folderHint":
      "Obbligatoria. Qui ClauDisk salva markdown, knowledge e indici.",
    "settings.folderNone": "Nessuna cartella collegata.",
    "settings.download": "Cosa includere nel download",
    "settings.downloadLead":
      "Chat, documenti di progetto e indici sono sempre nel mirror. Qui attivi i payload opzionali più pesanti.",
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
    "settings.maintenanceLead":
      "Pulizia delle chat rimosse su Claude.ai. Prima finiscono in _deleted/.",
    "settings.deletedHint":
      "Le chat cancellate su Claude vengono spostate nella cartella _deleted/",
    "settings.sync": "Sync",
    "settings.syncLead":
      "Controlla il dry-run di conferma e come arricchire il Markdown delle chat.",
    "settings.confirmWrite": "Dry-run di default per Update",
    "settings.confirmWriteHint":
      "Mostra il piano e chiede conferma prima di scrivere. Disattiva per scrivere subito all’Update.",
    "settings.notifySync": "Notifica desktop a fine sync",
    "settings.notifySyncHint": "Usa le notifiche Chrome. Disattivata di default.",
    "settings.writeTags": "Tag euristici nel frontmatter delle chat",
    "settings.writeTagsHint":
      "progetto/…, starred, modello/…, mese. Nessuna API esterna.",
    "settings.writeRelated": "Link a chat correlate nello stesso progetto",
    "settings.writeRelatedHint":
      "Sezione «Correlate» + campo YAML. Solo euristiche locali.",
    "settings.ui": "Interfaccia",
    "settings.uiLead":
      "Come si comporta questa tab all’apertura, e il tour prodotto opzionale.",
    "settings.language": "Lingua",
    "settings.languageLead":
      "Lingua di questa tab ClauDisk. L’inglese è il predefinito.",
    "settings.autostart": "Avvia aggiornamento all’apertura di questa tab",
    "settings.closeTab": "Chiudi la tab a cattura riuscita",
    "settings.tour": "Tour guidato",
    "settings.tourHint": "Rivedi il percorso a occhio di bue sui controlli principali.",
    "settings.saveHint": "Le modifiche valgono dopo il salvataggio.",
    "btn.replayTour": "Mostra di nuovo il tour",
    "btn.openHistory": "Apri cronologia sync",
    "settings.history": "Cronologia sync",
    "settings.historyHint":
      "Sync riuscite e fallite recenti, salvate in questo browser.",
    "settings.historyLead":
      "Sync riuscite e fallite recenti salvate in questo browser (ultime 10).",
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
      "Apri Impostazioni per una pagina dedicata: lingua, download, sync e cronologia.",
    "tour.folderTitle": "Collega una cartella",
    "tour.folderBody":
      "Scegli (o riconferma) la cartella locale dove verranno scritti chat, docs e indici. Niente esce dal tuo PC.",
    "tour.languageTitle": "Lingua",
    "tour.languageBody":
      "L’inglese è la lingua predefinita. Puoi passare all’italiano quando vuoi.",
    "tour.statsTitle": "Statistiche",
    "tour.statsBody":
      "Apri Statistiche per una pagina intera: chat per progetto, freschezza e sync recenti.",
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
