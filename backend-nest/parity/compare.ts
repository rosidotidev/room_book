// Compares two recorded exchanges (status, media type, body) and reports the first difference per request.
// Timestamps under `createdAt` and `time` depend on when a run happens, so they are compared by shape:
// date and time digits are masked, the zone designator stays exact, and the fraction is compared by presence only.
// Everything else (ids, times of bookings, text, key order, status) is compared exactly.
import type { Exchange } from './replay.ts';

export interface Difference {
  index: number;
  label: string;
  field: string;
  left: unknown;
  right: unknown;
}

const TIME_KEYS = new Set(['createdAt', 'time']);
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** Masks the varying part of a timestamp and keeps its shape (fraction presence and zone). */
export function timestampShape(value: string): string {
  const match = TIMESTAMP.exec(value);
  if (!match) {
    return value;
  }
  const fraction = match[1] ? '.<fraction>' : '';
  return `<timestamp>${fraction}${match[2]}`;
}

function normalize(value: unknown, key?: string): unknown {
  if (typeof value === 'string' && key !== undefined && TIME_KEYS.has(key)) {
    return timestampShape(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = normalize(v, k);
    }
    return out;
  }
  return value;
}

function firstDifference(left: unknown, right: unknown, path: string): { field: string; left: unknown; right: unknown } | null {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return { field: path, left, right };
    }
    if (left.length !== right.length) {
      return { field: `${path}.length`, left: left.length, right: right.length };
    }
    for (let i = 0; i < left.length; i++) {
      const diff = firstDifference(left[i], right[i], `${path}[${i}]`);
      if (diff) {
        return diff;
      }
    }
    return null;
  }
  if (left !== null && typeof left === 'object' && right !== null && typeof right === 'object') {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.join('|') !== rightKeys.join('|')) {
      return { field: `${path} (key order or set)`, left: leftKeys, right: rightKeys };
    }
    for (const key of leftKeys) {
      const diff = firstDifference(
        (left as Record<string, unknown>)[key],
        (right as Record<string, unknown>)[key],
        path === '' ? key : `${path}.${key}`,
      );
      if (diff) {
        return diff;
      }
    }
    return null;
  }
  return Object.is(left, right) ? null : { field: path || '(root)', left, right };
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function mediaType(contentType: string): string {
  return contentType.split(';')[0].trim().toLowerCase();
}

/** Returns the first difference between the two exchanges, or null when they match. */
export function compareExchanges(index: number, label: string, left: Exchange, right: Exchange): Difference | null {
  const make = (field: string, l: unknown, r: unknown): Difference => ({ index, label, field, left: l, right: r });

  if (left.status !== right.status) {
    return make('status', left.status, right.status);
  }
  if (mediaType(left.contentType) !== mediaType(right.contentType)) {
    return make('content-type', left.contentType, right.contentType);
  }

  const leftJson = parseJson(left.body);
  const rightJson = parseJson(right.body);
  if (leftJson.ok !== rightJson.ok) {
    return make('body (JSON vs text)', left.body, right.body);
  }
  if (!leftJson.ok || !rightJson.ok) {
    return left.body === right.body ? null : make('body', left.body, right.body);
  }

  const diff = firstDifference(normalize(leftJson.value), normalize(rightJson.value), '');
  return diff ? make(diff.field, diff.left, diff.right) : null;
}
