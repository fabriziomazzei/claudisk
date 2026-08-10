/**
 * Archive stats for the ClauDisk UI (index.json + sync history).
 */

/**
 * @param {any} index
 * @param {any[]} syncHistory
 */
export function buildArchiveStats(index, syncHistory = []) {
  const projects = index?.projects && typeof index.projects === "object" ? index.projects : {};
  const chats = index?.chats && typeof index.chats === "object" ? index.chats : {};
  const docs = index?.docs && typeof index.docs === "object" ? index.docs : {};
  const files = index?.files && typeof index.files === "object" ? index.files : {};
  const attachments =
    index?.attachments && typeof index.attachments === "object"
      ? index.attachments
      : {};

  /** @type {Map<string, { id: string, nome: string, chats: number, docs: number, files: number }>} */
  const byProject = new Map();

  const ensure = (id, nome) => {
    const key = id || "no-project";
    if (!byProject.has(key)) {
      byProject.set(key, {
        id: key,
        nome: nome || (key === "no-project" ? "no-project" : key),
        chats: 0,
        docs: 0,
        files: 0,
      });
    }
    return byProject.get(key);
  };

  for (const [id, p] of Object.entries(projects)) {
    ensure(id, p?.nome || p?.percorso || id);
  }
  ensure("no-project", "no-project");

  for (const c of Object.values(chats)) {
    const pid = c?.project_uuid || "no-project";
    const row = ensure(pid, projects[pid]?.nome);
    row.chats += 1;
  }
  for (const d of Object.values(docs)) {
    const pid = d?.project_uuid || "no-project";
    const row = ensure(pid, projects[pid]?.nome);
    row.docs += 1;
  }
  for (const f of Object.values(files)) {
    const pid = f?.project_uuid || "no-project";
    const row = ensure(pid, projects[pid]?.nome);
    row.files += 1;
  }

  const projectRows = [...byProject.values()]
    .filter((p) => p.chats || p.docs || p.files || projects[p.id])
    .sort((a, b) => b.chats - a.chats || b.docs - a.docs);

  const now = Date.now();
  const day = 86_400_000;
  let fresh7 = 0;
  let fresh30 = 0;
  let fresh90 = 0;
  /** @type {Record<string, number>} */
  const byMonth = {};

  for (const c of Object.values(chats)) {
    const ts = c?.visto_il ? Date.parse(c.visto_il) : NaN;
    if (!Number.isFinite(ts)) continue;
    const age = now - ts;
    if (age <= 7 * day) fresh7 += 1;
    if (age <= 30 * day) fresh30 += 1;
    if (age <= 90 * day) fresh90 += 1;
    const d = new Date(ts);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth[key] = (byMonth[key] || 0) + 1;
  }

  const monthKeys = Object.keys(byMonth).sort();
  const recentMonths = monthKeys.slice(-12).map((k) => ({
    label: k,
    value: byMonth[k],
  }));

  const sync = (Array.isArray(syncHistory) ? syncHistory : [])
    .slice(0, 10)
    .map((e) => ({
      at: e.at || "",
      ok: Boolean(e.ok),
      force: Boolean(e.force),
      targeted: Boolean(e.targeted),
      durationMs: Number(e.durationMs) || 0,
      chatsNew: Number(e.chatsNew) || 0,
      chatsUpdated: Number(e.chatsUpdated) || 0,
      docsWritten: Number(e.docsWritten) || 0,
      errors: Number(e.errors) || 0,
    }));

  const chatTotal = Object.keys(chats).length;
  const noProjectChats = byProject.get("no-project")?.chats || 0;

  /** @type {Record<string, number>} */
  const byModel = {};
  let starred = 0;
  let stale90 = 0;
  let withTitle = 0;
  let titleChars = 0;
  let knownModels = 0;
  /** @type {{ titolo: string, progetto: string, days: number }[]} */
  const oldest = [];
  /** @type {{ titolo: string, progetto: string, messaggi: number }[]} */
  const byMessages = [];

  /** @type {Map<string, number>} */
  const filesByChat = new Map();
  for (const f of Object.values(files)) {
    const cu = f?.chat_uuid;
    if (cu) filesByChat.set(cu, (filesByChat.get(cu) || 0) + 1);
  }
  for (const a of Object.values(attachments)) {
    const cu = a?.chat_uuid;
    if (cu) filesByChat.set(cu, (filesByChat.get(cu) || 0) + 1);
  }

  for (const c of Object.values(chats)) {
    if (c?.isStarred || c?.is_starred) starred += 1;
    const rawModel = String(c?.model || "").trim();
    if (rawModel && !/^unknown$/i.test(rawModel)) {
      knownModels += 1;
      byModel[rawModel] = (byModel[rawModel] || 0) + 1;
    }
    const title = String(c?.titolo || c?.name || "").trim();
    if (title) {
      withTitle += 1;
      titleChars += title.length;
    }
    const pid = c?.project_uuid || "no-project";
    const progetto = projects[pid]?.nome || pid;
    const titolo = title || String(c?.uuid || "").slice(0, 8) || "?";
    const messaggi = Number(c?.messaggi) || 0;
    byMessages.push({ titolo, progetto, messaggi });

    const ts = c?.visto_il ? Date.parse(c.visto_il) : NaN;
    if (Number.isFinite(ts)) {
      const days = Math.floor((now - ts) / day);
      if (days > 90) stale90 += 1;
      oldest.push({ titolo, progetto, days });
    }
  }

  oldest.sort((a, b) => b.days - a.days);
  byMessages.sort((a, b) => b.messaggi - a.messaggi || a.titolo.localeCompare(b.titolo));

  /** @type {{ titolo: string, progetto: string, files: number }[]} */
  const byFiles = [];
  for (const [uuid, n] of filesByChat) {
    const c = chats[uuid];
    if (!c) continue;
    const pid = c?.project_uuid || "no-project";
    byFiles.push({
      titolo: String(c?.titolo || uuid.slice(0, 8)),
      progetto: projects[pid]?.nome || pid,
      files: n,
    });
  }
  byFiles.sort((a, b) => b.files - a.files || a.titolo.localeCompare(b.titolo));

  const models = Object.entries(byModel)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topShare = chatTotal && projectRows[0] ? projectRows[0].chats / chatTotal : 0;
  const activeProjects = projectRows.filter((p) => p.id !== "no-project" && p.chats > 0).length;
  const avgChats =
    activeProjects > 0
      ? chatTotal / Math.max(activeProjects, 1)
      : chatTotal;

  const syncOk = sync.filter((s) => s.ok).length;
  const syncFail = sync.filter((s) => !s.ok).length;
  const avgDuration =
    sync.length > 0
      ? Math.round(sync.reduce((a, s) => a + s.durationMs, 0) / sync.length)
      : 0;
  const avgNew =
    sync.length > 0
      ? sync.reduce((a, s) => a + s.chatsNew, 0) / sync.length
      : 0;

  return {
    totals: {
      projects: Object.keys(projects).length,
      chats: chatTotal,
      docs: Object.keys(docs).length,
      files: Object.keys(files).length,
      attachments: Object.keys(attachments).length,
      noProjectChats,
      noProjectShare: chatTotal ? noProjectChats / chatTotal : 0,
      starred,
      stale90,
      avgTitleLen: withTitle ? Math.round(titleChars / withTitle) : 0,
      topShare,
      avgChatsPerProject: Math.round(avgChats * 10) / 10,
      activeProjects,
      knownModels,
    },
    freshness: {
      d7: fresh7,
      d30: fresh30,
      d90: fresh90,
      pct7: chatTotal ? fresh7 / chatTotal : 0,
      pct30: chatTotal ? fresh30 / chatTotal : 0,
    },
    projectsByChats: projectRows.slice(0, 12),
    projectsByDocs: [...projectRows]
      .sort((a, b) => b.docs - a.docs || b.chats - a.chats)
      .filter((p) => p.docs > 0)
      .slice(0, 10),
    projectsByFiles: [...projectRows]
      .sort((a, b) => b.files - a.files || b.chats - a.chats)
      .filter((p) => p.files > 0)
      .slice(0, 10),
    activityByMonth: recentMonths,
    sync,
    models,
    oldest: oldest.slice(0, 10),
    byMessages: byMessages.filter((c) => c.messaggi > 0).slice(0, 10),
    byFiles: byFiles.slice(0, 10),
    syncHealth: {
      ok: syncOk,
      fail: syncFail,
      avgDurationMs: avgDuration,
      avgNew: Math.round(avgNew * 10) / 10,
    },
  };
}

/**
 * @param {HTMLElement} rootEl
 * @param {ReturnType<typeof buildArchiveStats> | null} stats
 * @param {{
 *   diskLabel?: string,
 *   locale?: "en" | "it",
 *   t?: (key: string, vars?: Record<string, string | number>) => string,
 * }} [meta]
 */
export function renderInsights(rootEl, stats, meta = {}) {
  if (!rootEl) return;
  const locale = meta.locale === "it" ? "it" : "en";
  const tr = (en, it) => (locale === "it" ? it : en);
  const tx =
    typeof meta.t === "function"
      ? meta.t
      : (key) => key;

  if (!stats) {
    rootEl.innerHTML = `<p class="muted">${escapeHtml(
      tx("stats.empty") ||
        tr(
          "Connect a folder and run at least one sync to see statistics.",
          "Collega la cartella e fai almeno un sync per vedere le statistiche.",
        ),
    )}</p>`;
    return;
  }

  const totals = stats.totals;
  const f = stats.freshness;
  const maxChats = Math.max(1, ...stats.projectsByChats.map((p) => p.chats));
  const maxDocs = Math.max(1, ...stats.projectsByDocs.map((p) => p.docs), 1);
  const maxMonth = Math.max(1, ...stats.activityByMonth.map((m) => m.value), 1);
  const maxDur = Math.max(1, ...stats.sync.map((s) => s.durationMs), 1);

  const pct = (n) => `${Math.round(n * 100)}%`;

  const barRows = (rows, getVal, max, labelFn) =>
    rows
      .map((row) => {
        const v = getVal(row);
        const w = Math.max(2, Math.round((v / max) * 100));
        return (
          `<div class="bar-row">` +
          `<span class="bar-label" title="${escapeHtml(labelFn(row))}">${escapeHtml(labelFn(row))}</span>` +
          `<span class="bar-track"><span class="bar-fill" style="width:${w}%"></span></span>` +
          `<span class="bar-n">${v}</span>` +
          `</div>`
        );
      })
      .join("");

  const monthBars = stats.activityByMonth
    .map((m) => {
      const h = Math.max(4, Math.round((m.value / maxMonth) * 72));
      const short = m.label.slice(2);
      return (
        `<div class="col-bar" title="${escapeHtml(m.label)}: ${m.value}">` +
        `<span class="col-fill" style="height:${h}px"></span>` +
        `<span class="col-label">${escapeHtml(short.slice(5) || short)}</span>` +
        `</div>`
      );
    })
    .join("");

  const dateLocale = locale === "it" ? "it-IT" : "en-GB";
  const syncBars = stats.sync
    .slice()
    .reverse()
    .map((s) => {
      const h = Math.max(4, Math.round((s.durationMs / maxDur) * 72));
      const kind = s.targeted ? "retry" : s.force ? "full" : "upd";
      const cls = s.ok ? `col-fill kind-${kind}` : "col-fill kind-fail";
      const when = s.at ? new Date(s.at).toLocaleDateString(dateLocale) : "?";
      const sec = Math.round(s.durationMs / 1000);
      const status = s.ok ? "ok" : tr("error", "errore");
      return (
        `<div class="col-bar" title="${escapeHtml(when)} · ${sec}s · ${status}">` +
        `<span class="${cls}" style="height:${h}px"></span>` +
        `<span class="col-label">${escapeHtml(when.slice(0, 5))}</span>` +
        `</div>`
      );
    })
    .join("");

  rootEl.innerHTML =
    `<div class="insight-kpis">` +
    kpi(tx("stats.kpi.projects") || tr("Projects", "Progetti"), String(totals.projects)) +
    kpi(tx("stats.kpi.chats") || "Chat", String(totals.chats)) +
    kpi(tx("stats.kpi.docs") || tr("Documents", "Documenti"), String(totals.docs)) +
    kpi(tx("stats.kpi.files") || "File", String(totals.files)) +
    kpi(tx("stats.kpi.attachments") || tr("Attachments", "Allegati"), String(totals.attachments)) +
    kpi(
      tx("stats.kpi.noProject") || tr("Outside projects", "Fuori progetto"),
      `${totals.noProjectChats} (${pct(totals.noProjectShare)})`,
    ) +
    `</div>` +
    (meta.diskLabel
      ? `<p class="insight-disk muted">${escapeHtml(
          tx("stats.onDisk", { size: meta.diskLabel }) ||
            tr(`On disk: ${meta.diskLabel}`, `Su disco: ${meta.diskLabel}`),
        )}</p>`
      : "") +
    `<div class="insight-grid">` +
    `<section class="insight-card">` +
    `<h3>${escapeHtml(tx("stats.chatsByProject") || tr("Chats by project", "Chat per progetto"))}</h3>` +
    `<div class="bar-chart">${
      stats.projectsByChats.length
        ? barRows(stats.projectsByChats, (p) => p.chats, maxChats, (p) => p.nome)
        : `<p class="muted">${escapeHtml(tx("stats.noData") || tr("No data", "Nessun dato"))}</p>`
    }</div>` +
    `</section>` +
    `<section class="insight-card">` +
    `<h3>${escapeHtml(tx("stats.docsByProject") || tr("Documents by project", "Documenti per progetto"))}</h3>` +
    `<div class="bar-chart">${
      stats.projectsByDocs.length
        ? barRows(stats.projectsByDocs, (p) => p.docs, maxDocs, (p) => p.nome)
        : `<p class="muted">${escapeHtml(
            tx("stats.noDocs") ||
              tr("No indexed documents", "Nessun documento indicizzato"),
          )}</p>`
    }</div>` +
    `</section>` +
    `<section class="insight-card">` +
    `<h3>${escapeHtml(tx("stats.freshness") || tr("Chat freshness", "Freschezza chat"))}</h3>` +
    `<div class="fresh-list">` +
    freshRow(tx("stats.last7") || tr("Last 7 days", "Ultimi 7 giorni"), f.d7, f.pct7) +
    freshRow(tx("stats.last30") || tr("Last 30 days", "Ultimi 30 giorni"), f.d30, f.pct30) +
    freshRow(
      tx("stats.last90") || tr("Last 90 days", "Ultimi 90 giorni"),
      f.d90,
      f.d90 / Math.max(totals.chats, 1),
    ) +
    `</div>` +
    `<p class="muted tight">${escapeHtml(
      tx("stats.freshnessHint") ||
        tr(
          "Based on last read in the mirror (visto_il), not creation date on Claude.",
          "Basato sull’ultima lettura nel mirror (visto_il), non sulla data di creazione su Claude.",
        ),
    )}</p>` +
    `</section>` +
    `<section class="insight-card">` +
    `<h3>${escapeHtml(tx("stats.activity") || tr("Activity over time", "Attività nel tempo"))}</h3>` +
    `<div class="col-chart">${
      stats.activityByMonth.length
        ? monthBars
        : `<p class="muted">${escapeHtml(
            tx("stats.fewTemporal") ||
              tr("Not enough time data yet", "Ancora pochi dati temporali"),
          )}</p>`
    }</div>` +
    `<p class="muted tight">${escapeHtml(
      tx("stats.activityHint") ||
        tr(
          "Chats touched per month (last read).",
          "Chat toccate per mese (ultima lettura).",
        ),
    )}</p>` +
    `</section>` +
    `<section class="insight-card insight-wide">` +
    `<h3>${escapeHtml(tx("stats.recentSyncs") || tr("Recent syncs", "Ultime sync"))}</h3>` +
    `<div class="col-chart sync-chart">${
      stats.sync.length
        ? syncBars
        : `<p class="muted">${escapeHtml(
            tx("stats.noSyncHistory") ||
              tr("No syncs in history yet", "Nessuna sync in cronologia"),
          )}</p>`
    }</div>` +
    `<div class="sync-legend muted">` +
    `<span><i class="lg kind-upd"></i> ${escapeHtml(tx("stats.legend.update") || tr("update", "aggiornamento"))}</span>` +
    `<span><i class="lg kind-full"></i> ${escapeHtml(tx("stats.legend.full") || tr("full sync", "sync completo"))}</span>` +
    `<span><i class="lg kind-retry"></i> retry</span>` +
    `<span><i class="lg kind-fail"></i> ${escapeHtml(tx("stats.legend.error") || tr("error", "errore"))}</span>` +
    `</div>` +
    `</section>` +
    `<section class="insight-card">` +
    `<h3>${escapeHtml(tx("stats.concentration") || tr("Concentration", "Concentrazione"))}</h3>` +
    `<p class="insight-note">${escapeHtml(
      tr(
        `Top project holds ${pct(totals.topShare || 0)} of chats · avg ${totals.avgChatsPerProject ?? 0} chats/project · ${totals.starred || 0} starred · ${totals.stale90 || 0} idle >90d`,
        `Il progetto top ha il ${pct(totals.topShare || 0)} delle chat · media ${totals.avgChatsPerProject ?? 0} chat/progetto · ${totals.starred || 0} starred · ${totals.stale90 || 0} ferme >90g`,
      ),
    )}</p>` +
    (stats.syncHealth
      ? `<p class="muted tight">${escapeHtml(
          tr(
            `Recent syncs: ${stats.syncHealth.ok} ok / ${stats.syncHealth.fail} fail · avg ${Math.round((stats.syncHealth.avgDurationMs || 0) / 1000)}s · +${stats.syncHealth.avgNew} new/run`,
            `Sync recenti: ${stats.syncHealth.ok} ok / ${stats.syncHealth.fail} fail · media ${Math.round((stats.syncHealth.avgDurationMs || 0) / 1000)}s · +${stats.syncHealth.avgNew} nuove/run`,
          ),
        )}</p>`
      : "") +
    `</section>` +
    `<section class="insight-card">` +
    `<h3>${escapeHtml(tx("stats.models") || tr("Models seen", "Modelli visti"))}</h3>` +
    `<div class="bar-chart">${
      stats.models?.length
        ? barRows(
            stats.models,
            (m) => m.count,
            Math.max(1, ...stats.models.map((m) => m.count)),
            (m) => m.name,
          )
        : `<p class="muted">${escapeHtml(
            tr(
              "Model is stored on the next sync (Update / Full sync). Older index entries have no model field yet.",
              "Il modello viene salvato al prossimo sync (Aggiorna / Sync completo). Le voci più vecchie non ce l’hanno ancora.",
            ),
          )}</p>`
    }</div>` +
    `</section>` +
    `<section class="insight-card">` +
    `<h3>${escapeHtml(tx("stats.byMessages") || tr("Most messages", "Più messaggi"))}</h3>` +
    rankList(
      stats.byMessages,
      (o) => `${o.messaggi}`,
      tr("No message counts yet", "Ancora nessun conteggio messaggi"),
      tx,
      tr,
    ) +
    `</section>` +
    `<section class="insight-card">` +
    `<h3>${escapeHtml(tx("stats.byFiles") || tr("Most files attached", "Più file allegati"))}</h3>` +
    rankList(
      stats.byFiles,
      (o) => `${o.files}`,
      tr("No chat file links yet", "Ancora nessun file collegato alle chat"),
      tx,
      tr,
    ) +
    `</section>` +
    `<section class="insight-card">` +
    `<h3>${escapeHtml(tx("stats.filesByProject") || tr("Files by project", "File per progetto"))}</h3>` +
    `<div class="bar-chart">${
      stats.projectsByFiles?.length
        ? barRows(
            stats.projectsByFiles,
            (p) => p.files,
            Math.max(1, ...stats.projectsByFiles.map((p) => p.files)),
            (p) => p.nome,
          )
        : `<p class="muted">${escapeHtml(tx("stats.noData") || tr("No data", "Nessun dato"))}</p>`
    }</div>` +
    `</section>` +
    `<section class="insight-card insight-wide">` +
    `<h3>${escapeHtml(tx("stats.oldest") || tr("Longest idle chats", "Chat più ferme"))}</h3>` +
    rankList(
      stats.oldest,
      (o) => `${o.days}d`,
      tx("stats.noData") || tr("No data", "Nessun dato"),
      tx,
      tr,
    ) +
    `</section>` +
    `</div>`;
}

function rankList(rows, rightFn, empty, tx, tr) {
  if (!rows?.length) {
    return `<ul class="oldest-list"><li class="muted">${escapeHtml(
      typeof empty === "string" ? empty : tx("stats.noData") || tr("No data", "Nessun dato"),
    )}</li></ul>`;
  }
  return (
    `<ul class="oldest-list">` +
    rows
      .map(
        (o) =>
          `<li><strong title="${escapeHtml(o.titolo)}">${escapeHtml(o.titolo)}</strong>` +
          `<span class="muted">${escapeHtml(o.progetto)} · ${escapeHtml(rightFn(o))}</span></li>`,
      )
      .join("") +
    `</ul>`
  );
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function kpi(label, value) {
  return (
    `<div class="insight-kpi">` +
    `<span class="insight-kpi-v">${value}</span>` +
    `<span class="insight-kpi-l">${escapeHtml(label)}</span>` +
    `</div>`
  );
}

function freshRow(label, count, share) {
  const w = Math.max(2, Math.round(share * 100));
  return (
    `<div class="fresh-row">` +
    `<span class="fresh-label">${escapeHtml(label)}</span>` +
    `<span class="bar-track"><span class="bar-fill bar-fill-soft" style="width:${w}%"></span></span>` +
    `<span class="bar-n">${count} · ${Math.round(share * 100)}%</span>` +
    `</div>`
  );
}
