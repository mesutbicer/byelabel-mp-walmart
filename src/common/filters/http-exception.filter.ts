import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException, UserNotFoundException } from '../exceptions/custom-exceptions';

/**
 * HttpExceptionFilter - Global HTTP exception handler
 * 
 * Produces responses fully compatible with C# project error formats.
 * 
 * C# Error Formats:
 * - CreateNewAccount: BadRequest(e.Message) → sadece string mesaj
 * - Other endpoints: BadRequest(new BaseException()) → {Message, code} object
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let responseBody: any;

    if (exception instanceof UserNotFoundException || exception instanceof BaseException) {
      // Custom exceptions - return {Message, code} in C# format
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      responseBody = {
        Message: exceptionResponse.Message,
        code: exceptionResponse.code,
      };
    } else if (exception instanceof BadRequestException) {
      // Standard BadRequestException - return only message in C# CreateNewAccount format
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        responseBody = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const obj = exceptionResponse as any;
        // NestJS default format: {message, error, statusCode}
        responseBody = obj.message || exception.message;
      } else {
        responseBody = exception.message;
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        responseBody = exceptionResponse;
      } else {
        responseBody = { message: exception.message };
      }
    } else if (exception instanceof Error) {
      responseBody = { message: exception.message };
    } else {
      responseBody = { message: 'Internal server error' };
    }

    // Log error
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Error: ${JSON.stringify(responseBody)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(responseBody);
  }
}
