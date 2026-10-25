import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'http';
import { DomainError, ProblemBody } from './problem.js';

const UNEXPECTED_DETAIL = 'An unexpected error occurred. Please try again later.';

/** Maps every thrown error to an application/problem+json response. */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    if (response.headersSent) {
      return;
    }

    const problem = toProblem(exception, request, response);
    if (problem.status === 500) {
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    }
    response.status(problem.status);
    response.setHeader('Content-Type', 'application/problem+json; charset=utf-8');
    response.end(JSON.stringify(problem));
  }
}

function toProblem(exception: unknown, request: Request, response: Response): ProblemBody {
  const instance = request.path;
  if (exception instanceof DomainError) {
    return exception.toProblem(instance);
  }
  if (exception instanceof NotFoundException && exception.message.startsWith('Cannot ')) {
    return unknownRoute(request, response, instance);
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Error',
      status,
      detail: exception.message,
      instance,
    };
  }
  return {
    type: 'about:blank',
    title: 'Internal Server Error',
    status: 500,
    detail: UNEXPECTED_DETAIL,
    instance,
  };
}

/**
 * Routing found no handler. Spring answers 405 when the path exists for other methods (with an Allow header),
 * and 404 "No endpoint <method> <path>." when the path is unknown.
 */
function unknownRoute(request: Request, response: Response, instance: string): ProblemBody {
  const allowed = allowedMethods(request);
  if (allowed.length > 0) {
    response.setHeader('Allow', allowed.join(', '));
    return {
      type: 'about:blank',
      title: STATUS_CODES[405] ?? 'Method Not Allowed',
      status: 405,
      detail: `Method '${request.method}' is not supported.`,
      instance,
    };
  }
  return {
    type: 'about:blank',
    title: STATUS_CODES[404] ?? 'Not Found',
    status: 404,
    detail: `No endpoint ${request.method} ${instance}.`,
    instance,
  };
}

interface RouteLayer {
  route?: { methods: Record<string, boolean> };
  match(path: string): boolean;
}

/** HTTP methods registered for this path, read from the Express router that Nest populated. */
function allowedMethods(request: Request): string[] {
  const router = (request.app as unknown as { router?: { stack?: RouteLayer[] } } | undefined)?.router;
  const methods = new Set<string>();
  for (const layer of router?.stack ?? []) {
    if (layer.route && layer.match(request.path)) {
      for (const method of Object.keys(layer.route.methods)) {
        methods.add(method.toUpperCase());
      }
    }
  }
  return [...methods];
}
