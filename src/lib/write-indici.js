/**
 * INDICE.md per progetto + INDICE.md alla radice.
 * Rigenerati per intero a ogni passata (piccoli, non incrementali).
 */

import { ensureDir, writeTextFile } from "./fs-write.js";

function escCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function formatDate(iso) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return String(iso);
  return new Date(t).toISOString().slice(0, 19).replace("T", " ") + "Z";
}

function maxIso(dates) {
  let best = null;
  let bestMs = -Infinity;
  for (const d of dates) {
    if (!d) continue;
    const ms = Date.parse(d);
    if (Number.isNaN(ms)) continue;
    if (ms > bestMs) {
      bestMs = ms;
      best = d;
    }
  }
  return best;
}

/**
 * @param {any} index
 */
function groupByProject(index) {
  /** @type {Map<string, { key: string, folder: string, nome: string, descrizione: string, updated_at: string|null, chats: any[], docs: any[] }>} */
  const map = new Map();

  const ensure = (key, folder, nome, descrizione, updated_at) => {
    if (!map.has(key)) {
      map.set(key, {
        key,
        folder,
        nome: nome || folder,
        descrizione: descrizione || "",
        updated_at: updated_at || null,
        chats: [],
        docs: [],
      });
    }
    return map.get(key);
  };

  // Progetti noti dall'indice
  for (const [uuid, p] of Object.entries(index.projects || {})) {
    ensure(
      uuid,
      p.percorso || uuid,
      p.nome || p.percorso || uuid,
      p.descrizione || "",
      p.updated_at || null,
    );
  }

  ensure("no-project", "no-project", "no-project", "Chat fuori progetto.", null);

  for (const chat of Object.values(index.chats || {})) {
    const key = chat.project_uuid || "no-project";
    const folder =
      key === "no-project"
        ? "no-project"
        : index.projects?.[key]?.percorso ||
          (chat.percorso ? chat.percorso.split("/")[0] : key);
    const group = ensure(
      key,
      folder,
      index.projects?.[key]?.nome || folder,
      index.projects?.[key]?.descrizione || "",
      index.projects?.[key]?.updated_at || null,
    );
    group.chats.push(chat);
  }

  for (const doc of Object.values(index.docs || {})) {
    const key = doc.project_uuid;
    if (!key) continue;
    const folder =
      index.projects?.[key]?.percorso ||
      (doc.percorso ? doc.percorso.split("/")[0] : key);
    const group = ensure(
      key,
      folder,
      index.projects?.[key]?.nome || folder,
      index.projects?.[key]?.descrizione || "",
      index.projects?.[key]?.updated_at || null,
    );
    group.docs.push(doc);
  }

  return map;
}

/**
 * @param {{ nome: string, descrizione: string, updated_at: string|null, chats: any[], docs: any[], folder: string }} group
 */
function buildProjectIndiceMarkdown(group) {
  const chats = [...group.chats].sort((a, b) => {
    const ta = Date.parse(a.visto_il || 0);
    const tb = Date.parse(b.visto_il || 0);
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });
  const docs = [...group.docs].sort((a, b) =>
    String(a.percorso || "").localeCompare(String(b.percorso || "")),
  );

  const lastActivity = maxIso([
    group.updated_at,
    ...chats.map((c) => c.visto_il),
    ...docs.map((d) => d.visto_il),
  ]);

  const lines = [
    `# ${group.nome}`,
    "",
  ];

  if (group.descrizione) {
    lines.push(group.descrizione.trim(), "");
  }

  lines.push(
    `- Conversazioni: ${chats.length}`,
    `- Documenti: ${docs.length}`,
    `- Ultima attività: ${formatDate(lastActivity)}`,
    "",
    "## Conversazioni",
    "",
    "| Titolo | Aggiornata | Messaggi | File | Claude |",
    "| --- | --- | ---: | --- | --- |",
  );

  if (chats.length === 0) {
    lines.push("| — | — | — | — | — |");
  } else {
    for (const chat of chats) {
      const title = escCell(chat.titolo || chat.uuid || "senza-titolo");
      const when = escCell(formatDate(chat.visto_il));
      const msgs =
        typeof chat.messaggi === "number" ? String(chat.messaggi) : "—";
      const path = escCell(chat.percorso || "");
      const link = chat.uuid
        ? `[apri](https://claude.ai/chat/${chat.uuid})`
        : "—";
      lines.push(
        `| ${title} | ${when} | ${msgs} | \`${path}\` | ${link} |`,
      );
    }
  }

  lines.push("", "## Documenti", "");
  lines.push("| File | Visto |", "| --- | --- |");

  if (docs.length === 0) {
    lines.push("| — | — |");
  } else {
    for (const doc of docs) {
      const name = escCell(
        (doc.percorso || "").split("/").pop() || doc.uuid || "—",
      );
      lines.push(`| ${name} | ${escCell(formatDate(doc.visto_il))} |`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * @param {any} index
 */
function buildRootIndiceMarkdown(index, groups) {
  const generatedAt = new Date().toISOString();
  const rows = [...groups.values()]
    .filter((g) => g.key !== "no-project" || g.chats.length > 0)
    .sort((a, b) => {
      if (a.key === "no-project") return 1;
      if (b.key === "no-project") return -1;
      return a.nome.localeCompare(b.nome, "it");
    });

  const lines = [
    "# ClauDisk",
    "",
    `Indice rigenerato: ${formatDate(generatedAt)}`,
    "",
    "Mappa dei progetti. Leggi `AGENTS.md` per il protocollo di interrogazione; apri l'`INDICE.md` dentro ogni cartella prima di fare grep.",
    "",
    "## Progetti",
    "",
    "| Progetto | Cartella | Conversazioni | Docs | Ultima attività |",
    "| --- | --- | ---: | ---: | --- |",
  ];

  for (const g of rows) {
    const last = maxIso([
      g.updated_at,
      ...g.chats.map((c) => c.visto_il),
      ...g.docs.map((d) => d.visto_il),
    ]);
    lines.push(
      `| ${escCell(g.nome)} | \`${escCell(g.folder)}\` | ${g.chats.length} | ${g.docs.length} | ${escCell(formatDate(last))} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {any} index
 * @param {(msg: string) => void} [onProgress]
 */
export async function writeAllIndici(root, index, onProgress = () => {}) {
  const groups = groupByProject(index);

  for (const group of groups.values()) {
    if (
      group.key !== "no-project" &&
      group.chats.length === 0 &&
      group.docs.length === 0 &&
      !index.projects?.[group.key]
    ) {
      continue;
    }

    // Scrivi solo cartelle che esistono già o che abbiamo in projects/chats
    if (group.key === "no-project" && group.chats.length === 0) continue;

    const md = buildProjectIndiceMarkdown(group);
    const dir = await ensureDir(root, group.folder);
    await writeTextFile(dir, "INDICE.md", md);
    onProgress(`INDICE.md aggiornato: ${group.folder}`);
  }

  const rootMd = buildRootIndiceMarkdown(index, groups);
  await writeTextFile(root, "INDICE.md", rootMd);
  onProgress("INDICE.md radice aggiornato");
}
