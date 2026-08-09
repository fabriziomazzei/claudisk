/**
 * Download binari da claude.ai (e host correlati).
 * Fallback via service worker se il fetch diretto fallisce (CORS / rete).
 */

const CLAUDE_ORIGIN = "https://claude.ai";

/**
 * @param {string} url
 * @returns {string}
 */
export function absoluteClaudeUrl(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return `${CLAUDE_ORIGIN}${s}`;
  return `${CLAUDE_ORIGIN}/${s}`;
}

/**
 * @param {number} status
 * @param {string} absolute
 */
function httpError(status, absolute) {
  const err = new Error(`Download HTTP ${status} su ${absolute}`);
  err.name = "DownloadHttpError";
  err.status = status;
  return err;
}

/**
 * Primo URL noto per un file di progetto (document_asset, se c'è).
 * @param {any} file
 * @param {string} [orgId]
 */
export function resolveFileDownloadUrl(file, orgId) {
  const urls = resolveProjectFileDownloadUrls(file, orgId);
  return urls[0] || "";
}

/**
 * Candidati URL per file knowledge di progetto.
 * - `document` → `document_asset.url` (es. …/document_pdf)
 * - `blob` (xlsx/docx/…) → niente asset; prova pattern osservati in community tools
 * @param {any} file
 * @param {string} orgId
 * @returns {string[]}
 */
export function resolveProjectFileDownloadUrls(file, orgId) {
  /** @type {string[]} */
  const out = [];
  const push = (raw) => {
    const absolute = absoluteClaudeUrl(raw);
    if (!absolute || out.includes(absolute)) return;
    out.push(absolute);
  };

  if (file?.document_asset?.url) {
    push(file.document_asset.url);
    // Alcuni client usano anche …/document_pdf/<file_name>
    const name = String(file.file_name || "").trim();
    if (name && /\/document_[^/]+$/i.test(String(file.document_asset.url))) {
      push(`${String(file.document_asset.url).replace(/\/$/, "")}/${encodeURIComponent(name)}`);
    }
  }

  const uuid = file?.file_uuid || file?.uuid;
  if (!uuid || !orgId) return out;

  const name = String(file.file_name || "").trim();
  const ext = name.includes(".")
    ? name.slice(name.lastIndexOf(".") + 1).toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";

  // Blob / upload senza document_asset (es. .xlsx): SPEC dice di non inventare per i PDF,
  // ma i blob non hanno asset URL → prova i pattern usati da altri exporter Claude.
  if (!file?.document_asset?.url) {
    push(`/api/organizations/${orgId}/files/${uuid}/contents`);
    push(`/api/${orgId}/files/${uuid}/contents`);
    if (ext) {
      push(`/api/${orgId}/files/${uuid}/document_${ext}`);
      if (name) {
        push(
          `/api/${orgId}/files/${uuid}/document_${ext}/${encodeURIComponent(name)}`,
        );
      }
    }
    push(`/api/${orgId}/files/${uuid}?download=1`);
    push(`/api/${orgId}/files/${uuid}/download`);
    push(`/api/${orgId}/files/${uuid}`);
  }

  return out;
}

/**
 * Candidati URL per allegati messaggio (SPEC: base, senza /preview, ?download=1, /download).
 * @param {any} file
 * @param {string} orgId
 * @returns {string[]}
 */
export function resolveAttachmentDownloadUrls(file, orgId) {
  /** @type {string[]} */
  const out = [];
  const push = (raw) => {
    const absolute = absoluteClaudeUrl(raw);
    if (!absolute || out.includes(absolute)) return;
    out.push(absolute);
  };

  if (file?.document_asset?.url) push(file.document_asset.url);
  if (file?.url) push(file.url);

  const previewish = file?.preview_url || file?.previewUrl;
  if (previewish) {
    const preview = String(previewish);
    push(preview.replace(/\/preview\/?($|\?)/, "$1"));
    push(preview);
  }

  const uuid = file?.file_uuid || file?.uuid;
  if (uuid && orgId) {
    const base = `/api/${orgId}/files/${uuid}`;
    push(base);
    push(`${base}?download=1`);
    push(`${base}/download`);
  }

  // Varianti anche su URL già noti che terminano con /preview.
  for (const url of [...out]) {
    if (/\/preview\/?($|\?)/i.test(url)) {
      push(url.replace(/\/preview\/?($|\?)/i, "$1"));
      push(url.replace(/\/preview\/?$/i, "") + "?download=1");
    }
  }

  return out;
}

/**
 * Prova più URL in ordine; su 404 passa al successivo.
 * @param {string[]} urls
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<ArrayBuffer>}
 */
export async function fetchBinaryFromCandidates(urls, opts = {}) {
  const list = (Array.isArray(urls) ? urls : [])
    .map((u) => absoluteClaudeUrl(u))
    .filter(Boolean);
  if (list.length === 0) {
    throw new Error("URL download vuoto");
  }

  /** @type {Error | null} */
  let lastErr = null;
  for (const url of list) {
    try {
      return await fetchBinary(url, opts);
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (err?.status === 404) continue;
      throw lastErr;
    }
  }
  throw lastErr || new Error("Download fallito");
}

/**
 * @param {string} url
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<ArrayBuffer>}
 */
export async function fetchBinary(url, opts = {}) {
  const absolute = absoluteClaudeUrl(url);
  if (!absolute) {
    throw new Error("URL download vuoto");
  }

  try {
    return await fetchBinaryDirect(absolute, opts.signal);
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    // Stesso status anche via SW: non ritentare (evita warn ridondanti su 404).
    if (err?.status) throw err;

    // CORS / rete: prova via service worker (host_permissions + cookie).
    const viaSw = await fetchBinaryViaSw(absolute);
    if (viaSw.buffer) return viaSw.buffer;
    if (viaSw.status) throw httpError(viaSw.status, absolute);
    throw err;
  }
}

/**
 * @param {string} absolute
 * @param {AbortSignal} [signal]
 */
async function fetchBinaryDirect(absolute, signal) {
  const res = await fetch(absolute, {
    method: "GET",
    credentials: "include",
    signal,
  });
  if (!res.ok) {
    throw httpError(res.status, absolute);
  }
  return await res.arrayBuffer();
}

/**
 * @param {string} absolute
 * @returns {Promise<{ buffer: ArrayBuffer | null, status?: number }>}
 */
async function fetchBinaryViaSw(absolute) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "fetch-binary",
      url: absolute,
    });
    if (!response?.ok) {
      const status =
        typeof response?.status === "number" ? response.status : undefined;
      // 404 è atteso su URL candidati sbagliati; il caller gestisce l'errore.
      if (response?.error && status !== 404) {
        console.warn("[fetch-binary] SW:", response.error, absolute);
      }
      return { buffer: null, status };
    }
    if (response.buffer instanceof ArrayBuffer) {
      return { buffer: response.buffer };
    }
    if (response.buffer?.buffer instanceof ArrayBuffer) {
      // Uint8Array serializzato
      return { buffer: response.buffer.buffer };
    }
    if (typeof response.base64 === "string") {
      const bin = atob(response.base64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
      return { buffer: out.buffer };
    }
    return { buffer: null };
  } catch (err) {
    console.warn("[fetch-binary] SW message failed:", err);
    return { buffer: null };
  }
}
