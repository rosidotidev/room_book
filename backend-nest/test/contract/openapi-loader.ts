import AjvModule, { ValidateFunction } from 'ajv';
import addFormatsModule from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

/** The contract is read only: nothing in this loader writes it (spec FR-002). */
export const OPENAPI_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'specs',
  '001-project-setup',
  'contracts',
  'openapi.yaml',
);

export type RequestSchemaName = 'RoomInput' | 'ActiveChange' | 'BookingInput';
export type ResponseMediaType = 'application/json' | 'application/problem+json';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

type SchemaObject = Record<string, unknown>;

interface ResponseObject {
  description: string;
  content?: Partial<Record<ResponseMediaType, { schema: SchemaObject }>>;
}

interface OperationObject {
  operationId: string;
  responses: Record<string, { $ref: string } | ResponseObject>;
}

interface OpenApiDocument {
  openapi: string;
  paths: Record<string, Record<string, OperationObject>>;
  components: {
    schemas: Record<string, SchemaObject>;
    responses: Record<string, ResponseObject>;
  };
}

/** OpenAPI 3.0 keywords that Ajv does not implement. Rejected at load time so none is silently ignored. */
const UNSUPPORTED_KEYWORDS = ['nullable', 'discriminator'];

function rejectUnsupportedKeywords(node: unknown, where: string): void {
  if (Array.isArray(node)) {
    node.forEach((item, index) => rejectUnsupportedKeywords(item, `${where}/${index}`));
    return;
  }
  if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (UNSUPPORTED_KEYWORDS.includes(key)) {
        throw new Error(`${where}/${key}: keyword not supported by the contract loader`);
      }
      rejectUnsupportedKeywords(value, `${where}/${key}`);
    }
  }
}

function loadDocument(file: string): OpenApiDocument {
  const document = parse(fs.readFileSync(file, 'utf8')) as OpenApiDocument;
  if (!document.openapi.startsWith('3.0.')) {
    throw new Error(`Unsupported OpenAPI version "${document.openapi}" in ${file}`);
  }
  rejectUnsupportedKeywords(document, '#');
  return document;
}

const document = loadDocument(OPENAPI_PATH);

// Non-strict mode lets OpenAPI-only format names through; int64 is an integer, so it always passes here.
// ajv and ajv-formats are CommonJS packages; under NodeNext their class/function is on ".default".
const Ajv = AjvModule.default;
const addFormats = addFormatsModule.default;
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addFormat('int64', true);

const compiled = new WeakMap<SchemaObject, ValidateFunction>();

function compile(schema: SchemaObject): ValidateFunction {
  let validate = compiled.get(schema);
  if (validate === undefined) {
    // The root carries components so that "#/components/..." references resolve.
    validate = ajv.compile({ ...schema, components: document.components });
    compiled.set(schema, validate);
  }
  return validate;
}

function run(validate: ValidateFunction, value: unknown): ValidationResult {
  const valid = validate(value) === true;
  const errors = (validate.errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`);
  return { valid, errors };
}

function findOperation(operationId: string): OperationObject {
  for (const methods of Object.values(document.paths)) {
    for (const operation of Object.values(methods)) {
      if (operation.operationId === operationId) {
        return operation;
      }
    }
  }
  throw new Error(`No operation "${operationId}" in ${OPENAPI_PATH}`);
}

function resolveResponse(entry: { $ref: string } | ResponseObject): ResponseObject {
  if (!('$ref' in entry)) {
    return entry;
  }
  const name = entry.$ref.replace('#/components/responses/', '');
  const resolved = document.components.responses[name];
  if (resolved === undefined) {
    throw new Error(`Unknown response reference ${entry.$ref}`);
  }
  return resolved;
}

function documentedBody(operationId: string, status: number): { type: ResponseMediaType; schema: SchemaObject } {
  const operation = findOperation(operationId);
  const entry = operation.responses[String(status)];
  if (entry === undefined) {
    throw new Error(`${operationId} does not document status ${status} in the contract`);
  }
  const response = resolveResponse(entry);
  for (const type of ['application/json', 'application/problem+json'] as const) {
    const media = response.content?.[type];
    if (media !== undefined) {
      return { type, schema: media.schema };
    }
  }
  throw new Error(`${operationId} ${status} documents no JSON body`);
}

/** Validates a request body against one of the request schemas before it is sent. */
export function validateBody(schemaName: RequestSchemaName, value: unknown): ValidationResult {
  return run(compile(document.components.schemas[schemaName]), value);
}

/** Validates a response body against the schema documented for the operation and status. */
export function validateResponse(operationId: string, status: number, body: unknown): ValidationResult {
  return run(compile(documentedBody(operationId, status).schema), body);
}

/** Validates any error body against the Problem schema, for errors no operation documents (unknown route, unexpected failure). */
export function validateProblem(body: unknown): ValidationResult {
  return run(compile(document.components.schemas.Problem), body);
}

/** The media type the contract documents for the operation and status. Error statuses use application/problem+json. */
export function contentTypeFor(operationId: string, status: number): ResponseMediaType {
  return documentedBody(operationId, status).type;
}
