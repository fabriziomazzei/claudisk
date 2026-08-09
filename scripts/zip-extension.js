/**
 * Crea dist/claudisk-<version>.zip con solo i file dell'extension
 * (niente vault, samples, docs interni).
 *
 * Uso: npm run zip
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const version = manifest.version || "0.0.0";
const outDir = join(root, "dist");
const outZip = join(outDir, `claudisk-${version}.zip`);

const include = [
  "manifest.json",
  "LICENSE",
  "PRIVACY.md",
  "src/background/sw.js",
  "src/background/offscreen.html",
  "src/background/offscreen.js",
  "src/content/content.js",
  "src/content/content.css",
  "src/ui/claudisk.html",
  "src/ui/claudisk.js",
  "src/ui/claudisk.css",
  "src/ui/i18n.js",
  "src/ui/onboarding.js",
  "src/lib/api.js",
  "src/lib/artifacts.js",
  "src/lib/attachments.js",
  "src/lib/badge.js",
  "src/lib/capture.js",
  "src/lib/capture-chats.js",
  "src/lib/capture-docs.js",
  "src/lib/capture-memory.js",
  "src/lib/chat-enrich.js",
  "src/lib/chat-md.js",
  "src/lib/deletions.js",
  "src/lib/disk-stats.js",
  "src/lib/download-binary.js",
  "src/lib/fs-path.js",
  "src/lib/fs-store.js",
  "src/lib/fs-write.js",
  "src/lib/index-store.js",
  "src/lib/log-humanize.js",
  "src/lib/mirror-guides.js",
  "src/lib/mirror-stats.js",
  "src/lib/mirror-sync.js",
  "src/lib/names.js",
  "src/lib/progress.js",
  "src/lib/settings.js",
  "src/lib/setup-store.js",
  "src/lib/sync-history.js",
  "src/lib/sync-meta.js",
  "src/lib/sync-plan.js",
  "src/lib/vault-verify.js",
  "src/lib/wiki-seed.js",
  "src/lib/write-indici.js",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
  "_locales/en/messages.json",
  "_locales/it/messages.json",
];

mkdirSync(outDir, { recursive: true });

const missing = include.filter((f) => !existsSync(join(root, f)));
const criticalMissing = missing.filter((f) => !f.startsWith("icons/"));
if (criticalMissing.length) {
  console.error("File mancanti:", criticalMissing.join(", "));
  process.exit(1);
}
if (missing.length) {
  console.warn(
    "Avviso: icone assenti (aggiungile prima di pubblicare):",
    missing.join(", "),
  );
}

const present = include.filter((f) => existsSync(join(root, f)));

// Prefer tar (Git Bash / Windows 10+), fallback a PowerShell Compress-Archive.
const tar = spawnSync(
  "tar",
  ["-a", "-cf", outZip, "-C", root, ...present],
  { stdio: "inherit" },
);

if (tar.status !== 0) {
  const psFiles = present.map((f) => `'${f.replace(/'/g, "''")}'`).join(",");
  const ps = `
    Set-Location -LiteralPath '${root.replace(/'/g, "''")}'
    if (Test-Path -LiteralPath '${outZip.replace(/'/g, "''")}') { Remove-Item -LiteralPath '${outZip.replace(/'/g, "''")}' -Force }
    Compress-Archive -Path @(${psFiles}) -DestinationPath '${outZip.replace(/'/g, "''")}' -Force
  `;
  const compact = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
    stdio: "inherit",
  });
  if (compact.status !== 0) {
    console.error("Zip fallito. Installa tar oppure usa PowerShell Compress-Archive.");
    process.exit(1);
  }
}

console.log("Creato", outZip);
