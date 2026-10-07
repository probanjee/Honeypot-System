import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ApiErrorResponse } from '../types/api';
import { HTTP_STATUS } from '../constants/http';
import { logger } from '../utils/logger';
import { config } from '../config/app';

// ---------------------------------------------------------------------------
// Centralized error middleware.
//
// Maps AppError subclasses → correct HTTP status + standard error envelope.
// Logs operational errors at warn level, programming errors at error level.
// Strips stack traces from production responses.
// ---------------------------------------------------------------------------

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected error occurred';
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;

    if (isOperational) {
      logger.warn(
        {
          requestId: req.requestId,
          userId: req.user?.id,
          statusCode,
          errorName: err.name,
          errors: err.errors,
        },
        `[${err.name}] ${message}`,
      );
    } else {
      logger.error(
        {
          requestId: req.requestId,
          userId: req.user?.id,
          statusCode,
          errorName: err.name,
          stack: err.stack,
        },
        `[${err.name}] ${message}`,
      );
    }
  } else {
    // Unknown / programming error
    logger.error(
      {
        requestId: req.requestId,
        userId: req.user?.id,
        errorName: err.name,
        stack: err.stack,
      },
      `[UnhandledError] ${err.message}`,
    );
  }

  const appError = err instanceof AppError ? err : null;

  const body: ApiErrorResponse = {
    success: false,
    message: isOperational ? message : 'An unexpected error occurred',
    status: statusCode,
    ...(appError && appError.errors.length > 0 && { errors: appError.errors }),
    // Include stack trace only in development for debugging
    ...(config.server.isDevelopment && !isOperational && { stack: err.stack }),
  };

  res.status(statusCode).json(body);
}
