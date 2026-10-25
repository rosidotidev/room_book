// Creates the two byte-identical database copies that every parity replay starts from.
// Reads the Spring database and never writes to it. Copies live under parity/work/ (git-ignored).
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** The Spring service's database. Read only for this harness. */
export const SOURCE_DB = fileURLToPath(new URL('../../backend/data/roombook.db', import.meta.url));
export const WORK_DIR = fileURLToPath(new URL('./work/', import.meta.url));
export const LEFT_DB = path.join(WORK_DIR, 'left.db');
export const RIGHT_DB = path.join(WORK_DIR, 'right.db');

export async function sha256(file: string): Promise<string> {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

/** Replaces both copies with fresh byte copies of the source. Returns the source's SHA-256. */
export async function resetCopies(): Promise<string> {
  try {
    await stat(SOURCE_DB);
  } catch {
    throw new Error(`Source database not found: ${SOURCE_DB}. Nothing was copied.`);
  }

  const before = await sha256(SOURCE_DB);
  await mkdir(WORK_DIR, { recursive: true });

  for (const dest of [LEFT_DB, RIGHT_DB]) {
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      await rm(dest + suffix, { force: true });
    }
    await copyFile(SOURCE_DB, dest);
    if ((await sha256(dest)) !== before) {
      throw new Error(`Copy ${dest} does not match the source SHA-256.`);
    }
  }

  if ((await sha256(SOURCE_DB)) !== before) {
    throw new Error('The source database changed while copying. Investigate before replaying.');
  }
  return before;
}

// Run directly: `node parity/reset-copies.ts` only resets the copies.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sum = await resetCopies();
  console.log(`Reset ${LEFT_DB} and ${RIGHT_DB} from ${SOURCE_DB} (sha256 ${sum}).`);
}
