/**
 * Statistiche disco sulla cartella mirror.
 */

/**
 * @param {FileSystemDirectoryHandle} root
 * @param {AbortSignal} [signal]
 */
export async function measureDiskStats(root, signal) {
  let files = 0;
  let bytes = 0;

  async function walk(dir) {
    if (signal?.aborted) return;
    for await (const [, handle] of dir.entries()) {
      if (signal?.aborted) return;
      if (handle.kind === "directory") {
        await walk(handle);
      } else if (handle.kind === "file") {
        try {
          const file = await handle.getFile();
          files += 1;
          bytes += file.size;
        } catch {
          /* ignore */
        }
      }
    }
  }

  await walk(root);
  return { files, bytes };
}

export function formatBytes(n) {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
