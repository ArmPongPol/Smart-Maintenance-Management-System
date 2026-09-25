import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StandardResponse } from '../interfaces/standard-response.interface';
import { getRequestId } from '../middleware/request-id.middleware';

const INTERNAL_ERROR_MESSAGE = 'Internal server error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { method, originalUrl } = request;
    const requestId = getRequestId(request) ?? '-';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = this.getMessage(exception);

    const line = `[${requestId}] ${method} ${originalUrl} ${status} - ${message}`;
    if (status >= 500) {
      this.logger.error(
        line,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(line);
    }

    const body: StandardResponse<null> = { status, message, data: null };
    response.status(status).json(body);
  }

  private getMessage(exception: unknown): string {
    // Never leak internals of unexpected errors to the client.
    if (!(exception instanceof HttpException)) {
      return INTERNAL_ERROR_MESSAGE;
    }

    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    // ValidationPipe puts an array of messages here.
    const { message } = exceptionResponse as { message?: string | string[] };
    if (Array.isArray(message)) {
      return message.join(', ');
    }

    return message ?? exception.message;
  }
}
