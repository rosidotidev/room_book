import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * FR-023: transactions are opened by services only. A repository that opens one would move the transaction
 * boundary below the business rule, so this test fails if a repository file contains a transaction call.
 */
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');

function repositoryFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return repositoryFiles(full);
    }
    return entry.name.endsWith('.repository.ts') ? [full] : [];
  });
}

describe('repositories never open transactions (FR-023)', () => {
  const files = repositoryFiles(SRC);

  it('finds the repository files it checks', () => {
    expect(files.map((file) => path.basename(file)).sort()).toEqual([
      'bookings.repository.ts',
      'health-probe.repository.ts',
      'rooms.repository.ts',
    ]);
  });

  it.each(files.map((file) => [path.relative(SRC, file), file]))('%s has no transaction call', (_name, file) => {
    const source = fs.readFileSync(file, 'utf8');
    expect(source).not.toMatch(/transaction\(/);
    expect(source).not.toMatch(/\.immediate\(/);
    expect(source).not.toMatch(/\bBEGIN\b/);
  });
});
