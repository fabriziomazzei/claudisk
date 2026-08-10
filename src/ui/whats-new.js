/**
 * In-app What's new feed (Settings). Keep concise; bump when shipping.
 * Versioning: patch for polish, minor for features/UX, major for breaking.
 */

/**
 * @typedef {{
 *   version: string,
 *   date: string,
 *   title: { en: string, it: string },
 *   bullets: { en: string[], it: string[] },
 * }} WhatsNewRelease
 */

/** @type {WhatsNewRelease[]} */
export const WHATS_NEW = [
  {
    version: "1.2.0",
    date: "2026-08-10",
    title: {
      en: "Sync controls & transparency",
      it: "Controlli sync e trasparenza",
    },
    bullets: {
      en: [
        "Default dry-run for Update, desktop notification when a sync finishes",
        "Auto-purge of `_deleted/` after N days (default 30) for privacy",
        "Skip attachments larger than a size you choose (default 25 MB)",
        "New Settings pages: What's new and About",
      ],
      it: [
        "Dry-run di default per Update, notifica desktop a fine sync",
        "Pulizia automatica di `_deleted/` dopo N giorni (default 30) per privacy",
        "Salta allegati oltre una soglia MB (default 25)",
        "Nuove pagine Impostazioni: Novità e Informazioni",
      ],
    },
  },
  {
    version: "1.1.0",
    date: "2026-08-09",
    title: {
      en: "Settings IA & deeper stats",
      it: "Impostazioni riorganizzate e stats più ricche",
    },
    bullets: {
      en: [
        "Settings as a full page with Vault / Capture / Sync / App / History",
        "Statistics as its own page (not a cramped modal)",
        "Rankings: longest idle, most messages, most files, files by project",
        "Model field stored on sync; concentration copy fixed",
      ],
      it: [
        "Impostazioni a pagina intera: Vault / Cattura / Sync / App / Cronologia",
        "Statistiche in pagina dedicata (niente più modal stretta)",
        "Classifiche: più ferme, più messaggi, più file, file per progetto",
        "Campo modello salvato al sync; testo Concentrazione sistemato",
      ],
    },
  },
  {
    version: "1.0.0",
    date: "2026-08-10",
    title: {
      en: "Initial public release",
      it: "Prima release pubblica",
    },
    bullets: {
      en: [
        "Living mirror of Claude.ai projects to a local folder you choose",
        "Incremental Update + Full sync, dry-run plan, soft-delete to `_deleted/`",
        "Markdown chats, knowledge, artifacts, attachments, memory, indexes",
        "EN default UI (IT available), onboarding tour, MIT, local-only privacy",
      ],
      it: [
        "Mirror live dei progetti Claude.ai in una cartella locale a scelta",
        "Update incrementale + sync completo, piano dry-run, soft-delete in `_deleted/`",
        "Chat Markdown, knowledge, artefatti, allegati, memoria, indici",
        "UI in inglese di default (IT disponibile), tour, MIT, solo dati locali",
      ],
    },
  },
];

/**
 * @param {HTMLElement} root
 * @param {"en" | "it"} locale
 */
export function renderWhatsNew(root, locale = "en") {
  if (!root) return;
  const lang = locale === "it" ? "it" : "en";
  root.innerHTML = WHATS_NEW.map((rel) => {
    const bullets = (rel.bullets[lang] || rel.bullets.en)
      .map((b) => `<li>${escapeHtml(b)}</li>`)
      .join("");
    return (
      `<article class="whats-card">` +
      `<header class="whats-card-head">` +
      `<strong>v${escapeHtml(rel.version)}</strong>` +
      `<span class="muted">${escapeHtml(rel.date)}</span>` +
      `</header>` +
      `<h3>${escapeHtml(rel.title[lang] || rel.title.en)}</h3>` +
      `<ul>${bullets}</ul>` +
      `</article>`
    );
  }).join("");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
