import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { getRequestId } from '../middleware/request-id.middleware';

// Logs successful requests only; errors are logged by AllExceptionsFilter,
// which also sees failures that never reach interceptors (guards, 404 routes).
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { method, originalUrl } = request;
    const requestId = getRequestId(request) ?? '-';
    const startedAt = Date.now();

    return next
      .handle()
      .pipe(
        tap(() =>
          this.logger.log(
            `[${requestId}] ${method} ${originalUrl} ${response.statusCode} - ${Date.now() - startedAt}ms`,
          ),
        ),
      );
  }
}
