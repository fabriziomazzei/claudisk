/**
 * Sanificazione nomi (decisione 6) e utilità percorso.
 */

const UNSAFE = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizeFileName(name) {
  const cleaned = String(name || "untitled")
    .replace(UNSAFE, "_")
    .replace(/\.+$/g, "")
    .trim();
  return cleaned || "untitled";
}

/**
 * Garantisce un'estensione se manca (docs → .md).
 * @param {string} fileName
 * @param {string} [fallbackExt]
 */
export function ensureExtension(fileName, fallbackExt = ".md") {
  const base = sanitizeFileName(fileName);
  if (/\.[A-Za-z0-9]{1,12}$/.test(base)) return base;
  const ext = fallbackExt.startsWith(".") ? fallbackExt : `.${fallbackExt}`;
  return `${base}${ext}`;
}

/**
 * Nomi univoci nella stessa cartella: "file (2).md", "file (3).md".
 * @param {string} fileName
 * @param {Set<string>} usedLower
 */
export function uniquifyFileName(fileName, usedLower) {
  let candidate = fileName;
  let n = 2;
  while (usedLower.has(candidate.toLowerCase())) {
    const match = fileName.match(/^(.*?)(\.[^.]+)?$/);
    const stem = match?.[1] || fileName;
    const ext = match?.[2] || "";
    candidate = `${stem} (${n})${ext}`;
    n += 1;
  }
  usedLower.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Slug titolo chat: minuscolo, accenti normalizzati, spazi/punteggiatura → -, max 60.
 * Nome file: <slug>--<primi 8 uuid>.md
 * @param {string | null | undefined} title
 * @param {string} uuid
 */
export function chatMarkdownFileName(title, uuid) {
  const id = String(uuid || "");
  const short = id.slice(0, 8) || "00000000";
  const raw = String(title ?? "").trim();
  const emptyOrUuid =
    !raw || raw.toLowerCase() === id.toLowerCase();

  let slug = emptyOrUuid ? "senza-titolo" : raw;
  slug = slug.normalize("NFD").replace(/\p{M}/gu, "");
  slug = slug.toLowerCase();
  slug = slug.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) slug = "senza-titolo";
  if (slug.length > 60) {
    slug = slug.slice(0, 60).replace(/-+$/g, "");
    if (!slug) slug = "senza-titolo";
  }

  return `${slug}--${short}.md`;
}

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

/**
 * Frontmatter _progetto.md
 * @param {{ uuid: string, name: string, description?: string, prompt_template?: string }} meta
 */
export function buildProgettoMarkdown(meta) {
  const now = new Date().toISOString();
  return [
    "---",
    `id: ${meta.uuid}`,
    `nome: ${yamlScalar(meta.name || "")}`,
    yamlBlock("descrizione", meta.description || ""),
    yamlBlock("prompt_template", meta.prompt_template || ""),
    `ultima_cattura: ${now}`,
    "---",
    "",
  ].join("\n");
}
