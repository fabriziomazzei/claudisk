/**
 * Tag e correlate euristici (zero API) per il markdown chat.
 */

const STOP = new Set([
  "a",
  "ad",
  "al",
  "alla",
  "alle",
  "allo",
  "ai",
  "con",
  "da",
  "dal",
  "dalla",
  "di",
  "del",
  "della",
  "dei",
  "delle",
  "e",
  "ed",
  "il",
  "lo",
  "la",
  "i",
  "gli",
  "le",
  "in",
  "per",
  "su",
  "sul",
  "sulla",
  "un",
  "una",
  "uno",
  "the",
  "and",
  "or",
  "of",
  "to",
  "for",
  "with",
  "on",
  "in",
  "a",
  "an",
]);

/**
 * @param {string} title
 * @returns {Set<string>}
 */
export function titleTokens(title) {
  const raw = String(title || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const parts = raw.split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOP.has(t));
  return new Set(parts);
}

/**
 * @param {Set<string>} a
 * @param {Set<string>} b
 */
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

/**
 * @param {{
 *   projectLabel?: string,
 *   projectUuid?: string | null,
 *   isStarred?: boolean,
 *   model?: string | null,
 *   createdAt?: string | null,
 * }} input
 * @returns {string[]}
 */
export function buildChatTags(input) {
  const tags = [];
  const label = String(input.projectLabel || "").trim();
  if (label && label !== "no-project") {
    const slug = label
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    if (slug) tags.push(`progetto/${slug}`);
  } else {
    tags.push("progetto/no-project");
  }

  if (input.isStarred) tags.push("starred");

  const model = String(input.model || "").trim();
  if (model) {
    const short = model
      .toLowerCase()
      .replace(/^claude[-_]?/i, "")
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    if (short) tags.push(`modello/${short}`);
  }

  const created = input.createdAt ? Date.parse(input.createdAt) : NaN;
  if (Number.isFinite(created)) {
    const d = new Date(created);
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    tags.push(ym);
  }

  return [...new Set(tags)];
}

/**
 * Href relativo da un path vault a un altro (es. Proj/chats/a.md → …).
 * @param {string} fromPath
 * @param {string} toPath
 */
export function relativeVaultHref(fromPath, toPath) {
  const fromParts = String(fromPath || "")
    .split("/")
    .filter(Boolean);
  const toParts = String(toPath || "")
    .split("/")
    .filter(Boolean);
  if (!toParts.length) return toPath;

  fromParts.pop();
  let i = 0;
  while (
    i < fromParts.length &&
    i < toParts.length - 1 &&
    fromParts[i] === toParts[i]
  ) {
    i += 1;
  }
  const ups = fromParts.length - i;
  const down = toParts.slice(i);
  const prefix = ups > 0 ? Array(ups).fill("..").join("/") : ".";
  return `${prefix}/${down.join("/")}`.replace(/^\.\//, "./");
}

/**
 * @param {{
 *   uuid: string,
 *   title?: string,
 *   projectUuid?: string | null,
 *   chatsIndex: Record<string, any>,
 *   listItems?: any[],
 *   limit?: number,
 * }} opts
 * @returns {{ id: string, titolo: string, percorso: string, score: number }[]}
 */
export function findRelatedChats(opts) {
  const limit = Math.max(1, Math.min(opts.limit || 8, 20));
  const self = String(opts.uuid || "");
  const projectUuid = opts.projectUuid ?? null;
  const selfTokens = titleTokens(opts.title || "");
  const chatsIndex = opts.chatsIndex || {};
  const listItems = Array.isArray(opts.listItems) ? opts.listItems : [];

  /** @type {Map<string, { id: string, titolo: string, percorso: string, updated: number, score: number }>} */
  const candidates = new Map();

  const consider = (id, titolo, percorso, updatedAt, baseBonus) => {
    if (!id || id === self) return;
    const tokens = titleTokens(titolo);
    const overlap = jaccard(selfTokens, tokens);
    const sameProject =
      projectUuid != null &&
      (chatsIndex[id]?.project_uuid === projectUuid ||
        baseBonus > 0);
    if (!sameProject && overlap < 0.2) return;

    let score = baseBonus + overlap * 2;
    const updated = updatedAt ? Date.parse(updatedAt) : NaN;
    if (Number.isFinite(updated)) {
      score += Math.min(0.5, (Date.now() - updated) / (1000 * 60 * 60 * 24 * 365) * -0.01);
    }

    const prev = candidates.get(id);
    if (!prev || score > prev.score) {
      candidates.set(id, {
        id,
        titolo: titolo || id.slice(0, 8),
        percorso: percorso || "",
        updated: Number.isFinite(updated) ? updated : 0,
        score,
      });
    }
  };

  for (const [id, entry] of Object.entries(chatsIndex)) {
    if (!entry?.percorso) continue;
    const same =
      projectUuid != null && entry.project_uuid === projectUuid ? 1 : 0;
    consider(id, entry.titolo || "", entry.percorso, entry.visto_il, same);
  }

  for (const item of listItems) {
    const id = item?.uuid;
    if (!id) continue;
    const same =
      projectUuid != null && item.project_uuid === projectUuid ? 1.2 : 0;
    const prevPath = chatsIndex[id]?.percorso || "";
    consider(id, item.name || "", prevPath, item.updated_at, same);
  }

  return [...candidates.values()]
    .filter((c) => c.percorso)
    .sort((a, b) => b.score - a.score || b.updated - a.updated)
    .slice(0, limit)
    .map(({ id, titolo, percorso, score }) => ({
      id,
      titolo,
      percorso,
      score,
    }));
}
