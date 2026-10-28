/**
 * Thread dei progetti spostati sui canali (claude.ai/code/project/chan_…).
 * Non compaiono in chat_conversations_v2.
 */

import { claudeFetchJson, gap, throwIfAborted } from "./api.js";
import { isStrictlyNewer } from "./index-store.js";

function channelIdOf(project) {
  return project?.moved_to?.channel_tagged_id || project?.channel_id || null;
}

function threadTitle(item) {
  const sessions = Array.isArray(item?.bound_sessions) ? item.bound_sessions : [];
  const titled = sessions.find((s) => s?.title);
  if (titled?.title) return String(titled.title);
  if (item?.title) return String(item.title);
  if (item?.name) return String(item.name);
  const body = String(item?.body || "").trim();
  if (body && !body.startsWith("{")) {
    const line = body.split("\n").find((l) => l.trim()) || body;
    return line.trim().slice(0, 120);
  }
  if (item?.thread_preview) return String(item.thread_preview);
  return String(item?.id || "thread");
}

function cmsgId(value) {
  if (typeof value !== "string" || !value.startsWith("cmsg_")) return "";
  const clean = value.replace(/(?:\.\d+)+$/, "");
  return /^cmsg_[A-Za-z0-9]+$/.test(clean) ? clean : "";
}

function threadScore(raw) {
  let score = 0;
  const sessions = Array.isArray(raw?.bound_sessions) ? raw.bound_sessions : [];
  if (sessions.some((session) => session?.title)) score += 4;
  if (raw?.title || raw?.name) score += 2;
  if (raw?.in_timeline === true) score += 2;
  if (raw?.last_reply_at) score += 1;
  if (String(raw?.id || "").includes(".")) score -= 3;
  return score;
}

function rememberThread(raw, map) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const id = cmsgId(raw.id);
  const root = cmsgId(raw.thread_root_id);
  const nested = [
    raw.thread_id,
    raw.root_message_id,
    raw.message_id,
    raw.root?.id,
    raw.message?.id,
  ].map(cmsgId).find(Boolean) || "";
  const key = root || id || nested;
  if (!key) return;
  const record = { ...(id === key ? raw : { ...raw, id: key }), id: key };
  const prev = map.get(key);
  if (!prev || threadScore(record) >= threadScore(prev)) map.set(key, record);
}

function walkThreads(node, map, depth) {
  if (node == null || depth > 8) return;
  if (Array.isArray(node)) {
    for (const item of node) walkThreads(item, map, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  rememberThread(node, map);
  for (const [field, value] of Object.entries(node)) {
    if (field === "body" || field === "text" || field === "thread_preview") continue;
    if (value && typeof value === "object") walkThreads(value, map, depth + 1);
  }
}

function describeBody(body) {
  const sections = Array.isArray(body?.sections) ? body.sections : [];
  const first = sections[0];
  const fields = first && typeof first === "object"
    ? Object.keys(first).slice(0, 12).join(",")
    : "";
  const lists = first && typeof first === "object"
    ? Object.entries(first)
        .filter(([, value]) => Array.isArray(value))
        .map(([key, value]) => `${key}:${value.length}`)
        .join(",")
    : "";
  return `sections=${sections.length} truncated=${Boolean(body?.truncated)} sezione=${fields || "-"} liste=${lists || "-"}`;
}

function messageText(message) {
  const body = message?.body == null ? "" : String(message.body);
  if (!body.trim()) return "";
  if (message.server_notice) {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed.text === "string" && parsed.text.trim()) {
        return parsed.text.trim();
      }
    } catch {
      /* testo grezzo */
    }
  }
  return body;
}

/**
 * @param {string} channelId
 * @param {AbortSignal} [signal]
 */
export async function listChannelThreads(channelId, signal) {
  const map = new Map();
  let shape = "";
  let cursor = "";

  for (let page = 0; page < 10; page += 1) {
    throwIfAborted(signal);
    if (page > 0) await gap(signal);
    const query = new URLSearchParams({ limit: "100" });
    if (cursor) query.set("cursor", cursor);
    const body = await claudeFetchJson(
      `/v1/code/channels/${channelId}/threads?${query}`,
      { signal, maxAttempts: 1 },
    );
    if (!shape) shape = describeBody(body);
    walkThreads(body?.sections ?? body, map, 0);
    const next = body?.next_cursor || body?.cursor || body?.pagination?.next_cursor || "";
    if (!next || next === cursor || !body?.truncated) break;
    cursor = next;
  }

  return { threads: [...map.values()], shape };
}

/**
 * @param {any[]} projects
 * @param {{ signal?: AbortSignal, onError?: Function }} [opts]
 */
export async function listChannelThreadItems(projects, opts = {}) {
  const { signal, onError } = opts;
  /** @type {any[]} */
  const items = [];
  let failed = 0;
  let channels = 0;
  let shape = "";

  for (const project of projects || []) {
    const channelId = channelIdOf(project);
    if (!channelId || !project?.uuid) continue;
    channels += 1;
    throwIfAborted(signal);
    await gap(signal);

    let threads = [];
    try {
      const page = await listChannelThreads(channelId, signal);
      threads = page.threads;
      if (!shape) shape = page.shape;
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      failed += 1;
      onError?.(project, err);
      continue;
    }

    for (const thread of threads) {
      items.push({
        uuid: thread.id,
        name: threadTitle(thread),
        updated_at: thread.last_reply_at || thread.updated_at || thread.created_at || null,
        created_at: thread.created_at || null,
        project_uuid: project.uuid,
        project: { name: project.name || "" },
        channel_id: channelId,
        source: "channel-thread",
        summary: thread.thread_preview || "",
      });
    }
  }

  return { items, failed, channels, shape };
}

/**
 * @param {any[]} baseList
 * @param {any[]} extra
 */
export function summarizeThreadsAgainstIndex(items, chatsIndex) {
  let fresh = 0;
  let newer = 0;
  let known = 0;
  for (const item of items || []) {
    const prev = chatsIndex?.[item?.uuid];
    if (!prev?.visto_il) fresh += 1;
    else if (isStrictlyNewer(item?.updated_at, prev.visto_il)) newer += 1;
    else known += 1;
  }
  return { fresh, newer, known };
}

export function mergeListedItems(baseList, extra) {
  const byId = new Map();
  for (const item of baseList || []) {
    if (item?.uuid) byId.set(item.uuid, item);
  }
  let added = 0;
  let refreshed = 0;
  for (const item of extra || []) {
    const id = item?.uuid;
    if (!id) continue;
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, item);
      added += 1;
      continue;
    }
    const nextMs = Date.parse(item.updated_at || "");
    const prevMs = Date.parse(prev.updated_at || "");
    if (Number.isFinite(nextMs) && (!Number.isFinite(prevMs) || nextMs > prevMs)) {
      byId.set(id, { ...prev, ...item });
      refreshed += 1;
    }
  }
  return { list: [...byId.values()], added, refreshed };
}

/**
 * @param {string} channelId
 * @param {string} threadId
 * @param {AbortSignal} [signal]
 */
export async function fetchChannelThreadMessages(channelId, threadId, signal) {
  const all = [];
  const seen = new Set();
  let before = "";

  for (let page = 0; page < 20; page += 1) {
    throwIfAborted(signal);
    if (page > 0) await gap(signal);
    const query = new URLSearchParams({ limit: "200" });
    if (before) query.set("before", before);
    const body = await claudeFetchJson(
      `/v1/code/channels/${channelId}/threads/${threadId}?${query}`,
      { signal },
    );
    const batch = Array.isArray(body?.data) ? body.data : [];
    let fresh = 0;
    for (const message of batch) {
      const id = message?.id;
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      all.push(message);
      fresh += 1;
    }
    if (batch.length < 200 || fresh === 0) break;
    const cursor = body?.next_cursor || body?.pagination?.next_cursor || "";
    const last = batch[batch.length - 1]?.id || "";
    const next = cursor || last;
    if (!next || next === before) break;
    before = next;
  }

  return all;
}

/**
 * Normalizza i messaggi del thread nel formato che conversationToMarkdown già legge.
 * @param {any[]} messages
 * @param {any} item
 */
export function threadToConversation(messages, item) {
  const ordered = [...(messages || [])].sort((a, b) => {
    const am = Date.parse(a?.created_at || "");
    const bm = Date.parse(b?.created_at || "");
    if (Number.isNaN(am) || Number.isNaN(bm) || am === bm) return 0;
    return am - bm;
  });

  /** @type {any[]} */
  const chatMessages = [];
  for (const message of ordered) {
    const text = messageText(message);
    if (!text || !message?.id) continue;
    const sender = message.server_notice
      ? "Status"
      : message.author_account_id
        ? "human"
        : "assistant";
    chatMessages.push({
      uuid: message.id,
      parent_message_uuid: chatMessages.length
        ? chatMessages[chatMessages.length - 1].uuid
        : undefined,
      sender,
      content: [{ type: "text", text }],
    });
  }

  const leaf = chatMessages[chatMessages.length - 1];
  const channelId = item.channel_id;
  return {
    uuid: item.uuid,
    name: item.name || threadTitle(ordered.find((m) => m?.id === item.uuid) || {}),
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
    summary: item.summary || "",
    project_uuid: item.project_uuid || null,
    project: item.project || null,
    channel_id: channelId,
    url: channelId
      ? `https://claude.ai/code/project/${channelId}?thread=${item.uuid}`
      : `https://claude.ai/code/project/?thread=${item.uuid}`,
    current_leaf_message_uuid: leaf?.uuid,
    chat_messages: chatMessages,
    channel_messages: ordered,
  };
}

/**
 * @param {any} item
 * @param {AbortSignal} [signal]
 */
export async function fetchThreadConversation(item, signal) {
  const messages = await fetchChannelThreadMessages(
    item.channel_id,
    item.uuid,
    signal,
  );
  return threadToConversation(messages, item);
}
