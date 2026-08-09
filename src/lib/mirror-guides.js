/**
 * Guide per agenti alla radice del mirror: AGENTS.md + CLAUDE.md.
 * Create/aggiornate dall'estensione se assenti o ancora gestite dal marker.
 * Se l'utente modifica togliendo il marker, non vengono più sovrascritte.
 */

import { readTextFile, writeTextFile } from "./fs-write.js";

/** Bump quando cambia il contratto delle guide. */
export const GUIDE_VERSION = 5;

const MARKER_RE = /^<!--\s*(?:claude-mirror-guide|claudisk-guide):\s*(\d+)\s*-->/;

/**
 * Seed pre-guide (solo CLAUDE.md). Trattato come v0 gestita.
 * @param {string} text
 */
function isLegacyClaudeSeed(text) {
  return (
    text.startsWith(
      "# Claude Mirror\n\nCopia locale in markdown delle conversazioni",
    ) ||
    text.startsWith("# ClauDisk\n\nCopia locale in markdown delle conversazioni")
  );
}

/**
 * @param {string | null} text
 * @returns {number | null} versione gestita, o null se file personalizzato
 */
export function parseGuideVersion(text) {
  if (text == null) return null;
  const m = String(text).trimStart().match(MARKER_RE);
  if (m) return Number(m[1]);
  if (isLegacyClaudeSeed(text)) return 0;
  return null;
}

/**
 * @param {string | null} existing
 * @returns {boolean}
 */
function shouldWriteGuide(existing) {
  if (existing == null) return true;
  const v = parseGuideVersion(existing);
  if (v == null) return false;
  return v < GUIDE_VERSION;
}

function markerLine() {
  return `<!-- claudisk-guide: ${GUIDE_VERSION} -->`;
}

const AGENTS_MD = `${markerLine()}
# AGENTS.md - ClauDisk

Istruzioni per qualsiasi agente (Cursor, Claude Code, Copilot, Windsurf, Aider, ecc.) che interroga questa cartella. La cartella è una **copia locale** di claude.ai: chat, documenti di progetto, artefatti e allegati.

## Scopo

Rispondere a domande che attraversano **uno o più progetti** senza fare da postino tra tab Claude. Ricostruire decisioni, riusare scelte, confrontare versioni nel tempo.

## Struttura

\`\`\`
./
├── AGENTS.md          ← questo file (contratto agenti)
├── CLAUDE.md          ← ponte breve per Claude Code
├── INDICE.md          ← mappa progetti e totali (rigenerata a ogni sync)
├── index.json         ← indice macchina (uuid → percorso, hash, visto_il)
├── _health.json       ← ultima cattura / errori
├── _memoria.md        ← memoria account Claude (se presente)
├── _raw/              ← JSON API (staging; non citare come fonte)
├── _deleted/          ← chat soft-deleted (non eliminate)
├── wiki/              ← conoscenza DERIVATA (non sync da Claude)
│   ├── README.md
│   ├── _indice.md
│   └── *.md           ← sintesi, decisioni, mappe temi
├── no-project/        ← chat senza progetto Claude
└── <progetto>/
    ├── INDICE.md
    ├── _progetto.md   ← nome, descrizione, prompt_template
    ├── chats/         ← conversazioni markdown
    ├── knowledge/     ← documenti e file di progetto
    ├── artifacts/     ← artefatti generati nelle chat
    └── attachments/   ← allegati dei messaggi umani
\`\`\`

\`INDICE.md\` (radice e per progetto) è la mappa umana. \`index.json\` è per sync e lookup macchina. \`wiki/\` è il layer compilato dagli agenti.

## Protocollo di navigazione (obbligatorio)

1. Leggi \`INDICE.md\` alla radice. Controlla \`_health.json\` se serve sapere quanto è fresco il mirror.
2. Controlla \`wiki/_indice.md\` e le pagine wiki sul tema: se esiste già una sintesi, usala e verifica solo le fonti citate.
3. Se la domanda punta a uno o pochi progetti: apri \`<progetto>/INDICE.md\` e \`<progetto>/_progetto.md\` (il \`prompt_template\` è il brief operativo di quel progetto).
4. Cerca poi in \`chats/\` e \`knowledge/\` con grep mirato (titoli, keyword, date). Non partire da un dump di tutto l'archivio.
5. Per deliverable finali (CV, framework, skill, HTML, script): controlla anche \`artifacts/\` e i path in frontmatter \`artefatti\` / \`allegati\`.
6. Se il tema può stare in più progetti, cerca in tutti i candidati e in \`no-project/\` solo se gli altri non bastano.
7. Prima di concludere "non c'è", verifica almeno l'\`INDICE.md\` dei progetti plausibili e un grep sul tema.

## Wiki locale (obbligatoria da mantenere)

\`wiki/\` **non** è uno specchio di Claude.ai. È conoscenza derivata che gli agenti aggiornano mentre interroghi l'archivio (stesso spirito di un knowledge file che Cursor aggiorna a ogni scelta utile).

Dopo ogni risposta sostanziale che:
- fissa una decisione o una preferenza
- chiarisce un fatto che attraversa più progetti
- risolve un conflitto tra fonti

fai almeno una di queste cose:
1. aggiorna \`wiki/decisioni.md\` con data + conclusione + percorso fonte
2. aggiorna \`wiki/mappa-temi.md\` se emerge un overlap nuovo
3. crea/aggiorna una pagina dedicata in \`wiki/\` e linkala da \`wiki/_indice.md\`

Non usare la wiki per copiare chat intere. Non scrivere conclusioni dentro \`chats/\` o \`knowledge/\` dello specchio.

## Gerarchia delle fonti

Ordine di affidabilità (alto → basso):

1. \`knowledge/\` e file in \`_progetto.md\` / knowledge citati lì (documenti di progetto)
2. Pagine \`wiki/\` recenti ben ancorate a fonti (sintesi; da verificare se il tema è critico)
3. Artefatti e allegati espliciti nelle chat
4. Messaggi **Human** nelle chat (scelte e vincoli dell'utente)
5. Messaggi Assistant nelle chat **più recenti** sullo stesso tema
6. \`_memoria.md\` (sintesi account; può essere stale rispetto a una chat recente)

Non sono fonti da citare come verità:

- \`summary_derivato\` nel frontmatter (auto-generato)
- \`_raw/\` (staging API)
- Ipotesi dell'agente non ancorate a un file

## Domande cross-progetto

- Elenca i progetti toccati e perché.
- Se la stessa informazione compare in più posti con valori diversi, **elenca tutte le versioni in ordine cronologico** (usa \`creata\` / \`updated\` / \`ultima_cattura\` del frontmatter o le date in \`INDICE.md\`). Non scegliere in silenzio una sola versione.
- Distingui "detto dall'utente" vs "proposto dall'assistente".

## Come rispondere

- Lingua: italiano, salvo richiesta diversa.
- Ogni affermazione fattuale estratta dal mirror deve citare **percorso file** e **data** rilevante.
- Preferisci sintesi azionabile; espandi solo se chiesto.
- Se il mirror è incompleto (sync vecchio, file assente, 404 in \`_deleted/\`), dillo esplicitamente.
- Non inventare contenuti che non risultano nei file.

## Specchio di sola lettura

I file dello specchio (\`chats/\`, \`knowledge/\`, \`_progetto.md\`, indici sync) **non aggiornano** claude.ai. Non "sistemarli" a mano per allineare una conclusione.

**Eccezione:** \`wiki/\` è locale e va aggiornata dagli agenti (e da te). Per aggiornare lo specchio usa il bottone **Aggiorna** su ClauDisk.

## Privacy

Questo archivio può contenere dati personali, familiari, sanitari, fiscali e finanziari.

- Non riesporre dettagli sensibili in bozze destinate a terzi (email, LinkedIn, candidature, post) se non richiesti esplicitamente.
- In caso di dubbio: anonimizza o chiedi conferma.
- Progetti tipicamente sensibili: nomi che evocano vita privata, casa, budget, fisco, salute. Trattali con cautela anche in sintesi interne.

## Anti-pattern

- Non fare grep cieco in \`_raw/\` per rispondere sul contenuto.
- Non trattare \`summary_derivato\` come fonte.
- Non limitarti al primo progetto trovato se il tema è trasversale.
- Non modificare massivamente i markdown dello specchio "per pulizia".
- Non usare \`wiki/\` come dump di chat intere: solo sintesi ancorate a fonti.
`;

const CLAUDE_MD = `${markerLine()}
# ClauDisk

Copia locale in markdown delle conversazioni, dei documenti di progetto e dei file da claude.ai.

**Contratto completo per gli agenti:** leggi e segui [\`AGENTS.md\`](./AGENTS.md) in questa stessa cartella. Contiene protocollo di navigazione, gerarchia delle fonti, regole cross-progetto, sola lettura e privacy.

## Avvio rapido

1. Apri \`INDICE.md\` (mappa progetti; rigenerata a ogni sync).
2. Controlla \`wiki/\` per sintesi già compilate sul tema.
3. Entra nel progetto rilevante: \`INDICE.md\` + \`_progetto.md\`, poi \`chats/\` e \`knowledge/\`.
4. Cita sempre file e data. In caso di conflitto, elenca le versioni in ordine cronologico.
5. Dopo conclusioni utili, aggiorna \`wiki/\` (non lo specchio).
6. Non usare \`_raw/\` né \`summary_derivato\` come fonti.

## Specchio di sola lettura

Modificare i file qui **non cambia** claude.ai. Per aggiornare il mirror usa il bottone **Aggiorna** nell'interfaccia ClauDisk.

Questo file è gestito dall'estensione (marker in cima). Se lo personalizzi e rimuovi il marker, l'estensione non lo sovrascriverà più.
`;

/** Template esportati (test / seed su disco locale). */
export const GUIDE_TEMPLATES = {
  "AGENTS.md": AGENTS_MD,
  "CLAUDE.md": CLAUDE_MD,
};
/**
 * @param {FileSystemDirectoryHandle} root
 * @param {(msg: string) => void} [onProgress]
 */
export async function ensureMirrorGuides(root, onProgress = () => {}) {
  const results = { agents: "skipped", claude: "skipped" };

  const existingAgents = await readTextFile(root, "AGENTS.md");
  if (shouldWriteGuide(existingAgents)) {
    await writeTextFile(root, "AGENTS.md", AGENTS_MD);
    results.agents = existingAgents == null ? "created" : "updated";
    onProgress(
      existingAgents == null
        ? "AGENTS.md creato alla radice"
        : `AGENTS.md aggiornato (guide v${GUIDE_VERSION})`,
    );
  } else {
    onProgress("AGENTS.md personalizzato o già aggiornato: non sovrascritto");
  }

  const existingClaude = await readTextFile(root, "CLAUDE.md");
  if (shouldWriteGuide(existingClaude)) {
    await writeTextFile(root, "CLAUDE.md", CLAUDE_MD);
    results.claude = existingClaude == null ? "created" : "updated";
    onProgress(
      existingClaude == null
        ? "CLAUDE.md creato alla radice"
        : `CLAUDE.md aggiornato (guide v${GUIDE_VERSION})`,
    );
  } else {
    onProgress("CLAUDE.md personalizzato o già aggiornato: non sovrascritto");
  }

  return results;
}

/** @deprecated Usa ensureMirrorGuides */
export async function ensureClaudeMd(root, onProgress = () => {}) {
  return ensureMirrorGuides(root, onProgress);
}
