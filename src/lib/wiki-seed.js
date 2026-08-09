/**
 * Seed della cartella wiki/ (conoscenza derivata, non sync da Claude).
 * README e _indice sono gestiti dal marker; le pagine tema si creano solo se assenti.
 */

import { ensureDir, readTextFile, writeTextFile } from "./fs-write.js";

export const WIKI_DIR = "wiki";
export const WIKI_GUIDE_VERSION = 1;

const MARKER_RE = /^<!--\s*(?:claude-mirror-wiki|claudisk-wiki):\s*(\d+)\s*-->/;

function markerLine() {
  return `<!-- claudisk-wiki: ${WIKI_GUIDE_VERSION} -->`;
}

/**
 * @param {string | null} text
 * @returns {number | null}
 */
function parseWikiVersion(text) {
  if (text == null) return null;
  const m = String(text).trimStart().match(MARKER_RE);
  if (m) return Number(m[1]);
  return null;
}

/**
 * @param {string | null} existing
 */
function shouldWriteManaged(existing) {
  if (existing == null) return true;
  const v = parseWikiVersion(existing);
  if (v == null) return false;
  return v < WIKI_GUIDE_VERSION;
}

const README = `${markerLine()}
# Wiki locale

Questa cartella **non viene scaricata da Claude.ai**. È un layer di conoscenza **derivata**: gli agenti (Cursor, Claude Code, ecc.) ci scrivono decisioni, sintesi e mappe mentre interroghi lo specchio.

## Perché esiste

Lo specchio (\`chats/\`, \`knowledge/\`) è la fonte grezza. La wiki è la versione “compilata”: più corta, collegata tra progetti, pensata per rispondere in fretta senza rileggere cento chat.

## Come usarla

1. Prima di una ricerca ampia nelle chat, guarda qui se c’è già una pagina sul tema.
2. Dopo una risposta che fissa una decisione o un fatto utile, aggiorna o crea una pagina.
3. Aggiungi il link in [\`_indice.md\`](./_indice.md).
4. Non modificare i markdown dello specchio (\`chats/\`, \`knowledge/\`) per “salvare” una conclusione: va nella wiki.

## Pagine di partenza

- [\`mappa-temi.md\`](./mappa-temi.md) - dove cercare cosa
- [\`decisioni.md\`](./decisioni.md) - log decisioni cross-progetto
`;

const INDICE = `${markerLine()}
# Indice wiki

Elenco pagine derivate. Gli agenti aggiornano questa lista quando creano o rinomina una pagina.

| Pagina | A cosa serve |
| --- | --- |
| [mappa-temi.md](./mappa-temi.md) | Temi → progetti ClauDisk |
| [decisioni.md](./decisioni.md) | Decisioni e scelte riprese spesso |
`;

const MAPPA = `# Mappa temi → progetti

Compilata dagli agenti (e da te). Non è sync automatico da Claude.

| Tema | Progetti dove cercare | Note |
| --- | --- | --- |
| Candidature / personal branding | Career engine, Progetto Carriera | knowledge recruiter/developer |
| Formazione / live AI | Carriere.AI, Libro - Lavora Meglio con l'AI | |
| Sito personale | Sito web | |
| Business rifacimento siti | Telorifaccio | a volte anche Career engine |
| Fisco / P.IVA | Consulente Fiscale | sensibile |
| Vita privata | Personal, Matrimonio, Casa, Budget | sensibile |
| Fuori progetto | no-project | solo se gli altri non bastano |

Aggiungi righe quando emerge un overlap nuovo.
`;

const DECISIONI = `# Decisioni

Log cronologico di scelte e conclusioni utili da riusare. Una voce = un bullet con data e link alle fonti nello specchio.

## Formato suggerito

- **YYYY-MM-DD** - Decisione in una riga. Fonte: \`percorso/file.md\`

## Voci

_(ancora vuoto: gli agenti aggiungono qui dopo interrogazioni sostanziali)_
`;

export const WIKI_TEMPLATES = {
  managed: {
    "README.md": README,
    "_indice.md": INDICE,
  },
  once: {
    "mappa-temi.md": MAPPA,
    "decisioni.md": DECISIONI,
  },
};

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {(msg: string) => void} [onProgress]
 */
export async function ensureWikiSeed(root, onProgress = () => {}) {
  const wiki = await ensureDir(root, WIKI_DIR);
  const out = { readme: "skipped", indice: "skipped", pages: 0 };

  const readmeExisting = await readTextFile(wiki, "README.md");
  if (shouldWriteManaged(readmeExisting)) {
    await writeTextFile(wiki, "README.md", README);
    out.readme = readmeExisting == null ? "created" : "updated";
    onProgress(
      out.readme === "created"
        ? "wiki/README.md creato"
        : "wiki/README.md aggiornato",
    );
  }

  const indiceExisting = await readTextFile(wiki, "_indice.md");
  if (shouldWriteManaged(indiceExisting)) {
    await writeTextFile(wiki, "_indice.md", INDICE);
    out.indice = indiceExisting == null ? "created" : "updated";
    onProgress(
      out.indice === "created"
        ? "wiki/_indice.md creato"
        : "wiki/_indice.md aggiornato",
    );
  }

  /** @type {[string, string][]} */
  const once = [
    ["mappa-temi.md", MAPPA],
    ["decisioni.md", DECISIONI],
  ];
  for (const [name, body] of once) {
    const existing = await readTextFile(wiki, name);
    if (existing == null) {
      await writeTextFile(wiki, name, body);
      out.pages += 1;
      onProgress(`wiki/${name} creato`);
    }
  }

  return out;
}
