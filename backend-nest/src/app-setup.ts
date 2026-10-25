import { BadRequestException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { ProblemFilter } from './common/problem.filter.js';
import { UNREADABLE_REQUEST } from './common/json-binding.js';

/**
 * Nest options shared by the service and the test app. The JSON body parser is installed here instead of
 * by Nest, so that a malformed body becomes the same "Failed to read request" 400 that Spring returns.
 */
export const APP_OPTIONS = { bodyParser: false } as const;

/** Installs the body parser, the malformed-body handler and the problem filter. Call before app.init(). */
export function configureApplication(app: INestApplication): void {
  app.use(express.json());
  app.use(malformedBody);
  app.useGlobalFilters(new ProblemFilter());
}

/** Body parser failures (invalid JSON text) are reported as an unreadable request, not with the parser's text. */
function malformedBody(error: unknown, _request: Request, _response: Response, next: NextFunction): void {
  if (error instanceof SyntaxError && 'body' in error) {
    next(new BadRequestException(UNREADABLE_REQUEST));
    return;
  }
  next(error);
}
