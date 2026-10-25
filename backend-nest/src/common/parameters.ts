import { BadRequestException, Injectable } from '@nestjs/common';
import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';

// Path and query parameter conversion with the framework messages the Spring service returns
// ("Failed to convert '<name>' with value: '<raw>'" and "Required parameter '<name>' is not present.").

const WHOLE_NUMBER = /^[+-]?\d+$/;
const MAX_SAFE = Number.MAX_SAFE_INTEGER;

export function conversionFailed(name: string, raw: string): BadRequestException {
  return new BadRequestException(`Failed to convert '${name}' with value: '${raw}'`);
}

export function missingParameter(name: string): BadRequestException {
  return new BadRequestException(`Required parameter '${name}' is not present.`);
}

/** Parses a whole number, or throws the conversion error. */
export function parseWholeNumber(raw: string, name: string): number {
  if (!WHOLE_NUMBER.test(raw) || Math.abs(Number(raw)) > MAX_SAFE) {
    throw conversionFailed(name, raw);
  }
  return Number(raw);
}

/** Optional whole-number query parameter. Absent or empty means not given (as Spring treats an empty value). */
export function optionalWholeNumber(raw: string | undefined, name: string): number | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }
  return parseWholeNumber(raw, name);
}

/** Path id: a whole number, otherwise the conversion error naming the parameter. */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    return parseWholeNumber(value, metadata.data ?? 'id');
  }
}
