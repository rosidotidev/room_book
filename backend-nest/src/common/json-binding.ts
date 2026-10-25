import { BadRequestException } from '@nestjs/common';

// The Spring service binds the whole JSON body (Jackson) before any business rule runs. Any value that
// Jackson cannot bind into the target type is a framework 400 with the detail below, and numeric or boolean
// scalars are coerced to text, integers and booleans the way Jackson coerces them. These helpers do the same
// so that a bad type gives the same answer on both services.

/** Detail text Spring uses for every body it cannot read. */
export const UNREADABLE_REQUEST = 'Failed to read request';

const INT_MAX = 2147483647;
const WHOLE_NUMBER = /^\s*[+-]?\d+\s*$/;
const ISO_OFFSET_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function unreadableRequest(): BadRequestException {
  return new BadRequestException(UNREADABLE_REQUEST);
}

/** The body must be a JSON object; a missing, scalar or array body cannot be bound. */
export function bindObject(body: unknown): Record<string, unknown> {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw unreadableRequest();
  }
  return body as Record<string, unknown>;
}

/** Text: absent stays null; strings pass; numbers and booleans become their text (Jackson coerces scalars). */
export function bindText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  throw unreadableRequest();
}

/** Whole number within the 32-bit range (Integer); numeric text is accepted. */
export function bindInteger(value: unknown, max = INT_MAX): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  let parsed: number;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string' && WHOLE_NUMBER.test(value)) {
    parsed = Number(value);
  } else {
    throw unreadableRequest();
  }
  if (!Number.isInteger(parsed) || Math.abs(parsed) > max) {
    throw unreadableRequest();
  }
  return parsed;
}

/** Boolean: true and false, the strings "true", "True", "false" and "False", and the numbers 1 and 0. */
export function bindBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true' || value === 'True') {
    return true;
  }
  if (value === 'false' || value === 'False') {
    return false;
  }
  if (value === 1) {
    return true;
  }
  if (value === 0) {
    return false;
  }
  throw unreadableRequest();
}

/** A list of text items; each item follows bindText. */
export function bindTextList(value: unknown): (string | null)[] | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw unreadableRequest();
  }
  return value.map((item) => bindText(item));
}

/** ISO-8601 date-time with an offset (OffsetDateTime). Anything else cannot be bound. */
export function bindInstant(value: unknown): Date | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string' || !ISO_OFFSET_DATE_TIME.test(value)) {
    throw unreadableRequest();
  }
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    throw unreadableRequest();
  }
  return instant;
}
