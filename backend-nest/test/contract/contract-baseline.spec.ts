import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { OPENAPI_PATH } from './openapi-loader.js';

const BASELINE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'contract-baseline.sha256');

describe('contract baseline (FR-002, SC-002)', () => {
  it('openapi.yaml still matches the SHA-256 stored in contract-baseline.sha256', () => {
    const expected = fs.readFileSync(BASELINE_FILE, 'utf8').trim().split(/\s+/)[0];
    const actual = crypto.createHash('sha256').update(fs.readFileSync(OPENAPI_PATH)).digest('hex');

    expect(actual).toBe(expected);
  });
});
