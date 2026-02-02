import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * LoggingInterceptor - Request/response logging
 * 
 * Provides logging similar to the C# project's Serilog configuration.
 * Log level is reduced for health check and frequently called endpoints.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  // Paths to exclude from detailed logging (log as verbose/debug)
  private readonly excludedPaths = [
    '/health-check',
    '/api/Order/GetOrdersAfterDate',
    '/hangfire',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body } = request;
    const startTime = Date.now();

    // Check if path should be logged at verbose level
    const isExcluded = this.excludedPaths.some((path) =>
      url.startsWith(path),
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const { statusCode } = response;
          const elapsed = Date.now() - startTime;

          const logMessage = `Handled ${method} ${url} -> ${statusCode} in ${elapsed.toFixed(4)} ms`;

          if (statusCode >= 500) {
            this.logger.error(logMessage);
          } else if (isExcluded) {
            this.logger.verbose(logMessage);
          } else {
            this.logger.log(logMessage);
          }
        },
        error: (error) => {
          const elapsed = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `Handled ${method} ${url} -> ${statusCode} in ${elapsed.toFixed(4)} ms - Error: ${error.message}`,
          );
        },
      }),
    );
  }
}
