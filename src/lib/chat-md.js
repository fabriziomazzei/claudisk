/**
 * Conversazione grezza → markdown (decisioni 6, 13, 14) + artefatti + allegati.
 */

import { isArtifactToolUse } from "./artifacts.js";

function yamlScalar(value) {
  const s = String(value ?? "");
  if (s === "") return '""';
  if (/^[\w.+@/-]+$/.test(s) && !/^(true|false|null|yes|no)$/i.test(s)) {
    return s;
  }
  return JSON.stringify(s);
}

function yamlBlock(key, value) {
  const s = String(value ?? "");
  if (!s.includes("\n") && s.length < 100) {
    return `${key}: ${yamlScalar(s)}`;
  }
  const lines = s.split("\n").map((line) => `  ${line}`);
  return [`${key}: |`, ...lines].join("\n");
}

function yamlStringList(key, items) {
  if (!items.length) return `${key}: []`;
  return [`${key}:`, ...items.map((it) => `  - ${yamlScalar(it)}`)].join("\n");
}

const ROOT_PARENT = "00000000-0000-4000-8000-000000000000";

/**
 * Ramo attivo: da current_leaf risale parent_message_uuid, poi inverte.
 * @param {{ current_leaf_message_uuid?: string, chat_messages?: any[] }} conversation
 */
export function activeBranchMessages(conversation) {
  const msgs = Array.isArray(conversation.chat_messages)
    ? conversation.chat_messages
    : [];
  const byId = new Map(msgs.map((m) => [m.uuid, m]));
  const chain = [];
  let cur = conversation.current_leaf_message_uuid;

  while (cur && cur !== ROOT_PARENT && byId.has(cur)) {
    const msg = byId.get(cur);
    chain.push(msg);
    cur = msg.parent_message_uuid;
  }

  return chain.reverse();
}

/**
 * @param {any} conversation
 * @param {{
 *   projectLabel: string,
 *   capturedAt: string,
 *   artifactPaths?: string[],
 *   artifactLinkByBlockId?: Map<string, { name: string, href: string }>,
 *   artifactLinkByOrder?: { name: string, href: string }[],
 *   attachmentPaths?: string[],
 *   attachmentLinksByMessage?: Map<string, { name: string, href: string }[]>,
 *   tags?: string[],
 *   correlati?: { id: string, titolo: string, href: string }[],
 * }} opts
 */
export function conversationToMarkdown(conversation, opts) {
  const projectLabel = opts.projectLabel || "no-project";
  const capturedAt = opts.capturedAt || new Date().toISOString();
  const artifactPaths = opts.artifactPaths || [];
  const attachmentPaths = opts.attachmentPaths || [];
  const byId = opts.artifactLinkByBlockId || new Map();
  const byOrder = opts.artifactLinkByOrder || [];
  const attByMsg = opts.attachmentLinksByMessage || new Map();
  const tags = Array.isArray(opts.tags) ? opts.tags : [];
  const correlati = Array.isArray(opts.correlati) ? opts.correlati : [];
  const branch = activeBranchMessages(conversation);
  const body = [];
  let order = 0;

  for (const msg of branch) {
    if (msg?.truncated === true) continue;

    const texts = [];
    const sources = [];
    const artifactLines = [];
    const attachmentLines = [];
    const seen = new Set();

    for (const block of msg.content || []) {
      if (block?.type === "text" && block.text) {
        texts.push(String(block.text));
        continue;
      }

      if (isArtifactToolUse(block)) {
        let link = null;
        if (block.id && byId.has(block.id)) link = byId.get(block.id);
        else if (byOrder[order]) link = byOrder[order];
        order += 1;
        if (link) {
          artifactLines.push(
            `> Artefatto: [${link.name.replace(/[\[\]]/g, "")}](${link.href})`,
          );
        }
        continue;
      }

      if (block?.type !== "tool_result") continue;
      const items = Array.isArray(block.content) ? block.content : [];
      for (const item of items) {
        if (item?.type === "knowledge" && item.url) {
          const url = String(item.url);
          if (seen.has(url)) continue;
          seen.add(url);
          sources.push({
            url,
            title: item.title ? String(item.title) : url,
          });
        }
      }
    }

    for (const link of attByMsg.get(msg.uuid) || []) {
      attachmentLines.push(
        `> Allegato: [${link.name.replace(/[\[\]]/g, "")}](${link.href})`,
      );
    }

    if (
      !texts.length &&
      !sources.length &&
      !artifactLines.length &&
      !attachmentLines.length
    ) {
      continue;
    }

    const who =
      msg.sender === "human"
        ? "Human"
        : msg.sender === "assistant"
          ? "Assistant"
          : String(msg.sender || "Unknown");

    body.push(`### ${who}`, "");
    if (attachmentLines.length) {
      body.push(...attachmentLines, "");
    }
    if (texts.length) {
      body.push(texts.join("\n\n"), "");
    }
    if (artifactLines.length) {
      body.push(...artifactLines, "");
    }
    if (sources.length) {
      body.push("Fonti:");
      for (const s of sources) {
        body.push(`- [${s.title.replace(/[\[\]]/g, "")}](${s.url})`);
      }
      body.push("");
    }
  }

  const correlatiFm = correlati.length
    ? [
        "correlate:",
        ...correlati.map(
          (c) =>
            `  - id: ${c.id}\n    titolo: ${yamlScalar(c.titolo)}\n    href: ${yamlScalar(c.href)}`,
        ),
      ].join("\n")
    : "correlate: []";

  const frontmatter = [
    "---",
    `id: ${conversation.uuid}`,
    `titolo: ${yamlScalar(conversation.name || "")}`,
    `progetto: ${yamlScalar(projectLabel)}`,
    `url: https://claude.ai/chat/${conversation.uuid}`,
    `creata: ${conversation.created_at || ""}`,
    `ultima_cattura: ${capturedAt}`,
    yamlStringList("tags", tags),
    correlatiFm,
    yamlStringList("allegati", attachmentPaths),
    yamlStringList("artefatti", artifactPaths),
    yamlBlock("summary_derivato", conversation.summary || ""),
    "---",
    "",
  ].join("\n");

  const correlatiBody = [];
  if (correlati.length) {
    correlatiBody.push("## Correlate", "");
    for (const c of correlati) {
      const label = String(c.titolo || c.id).replace(/[\[\]]/g, "");
      correlatiBody.push(`- [${label}](${c.href})`);
    }
    correlatiBody.push("");
  }

  return frontmatter + correlatiBody.join("\n") + body.join("\n");
}
