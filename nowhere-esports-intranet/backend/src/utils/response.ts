import { Response } from 'express';
import { HTTP_STATUS } from '../constants/http';
import { ApiSuccessResponse, ApiErrorResponse, PaginationMeta, FieldError } from '../types/api';

// ---------------------------------------------------------------------------
// Standard API response helpers.
// Use these in every controller to guarantee a consistent response envelope.
// ---------------------------------------------------------------------------

/**
 * Sends a standardised success response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options: {
    message?: string;
    statusCode?: number;
    meta?: PaginationMeta | Record<string, unknown>;
  } = {},
): Response {
  const { message = 'Operation successful', statusCode = HTTP_STATUS.OK, meta } = options;

  const body: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
    ...(meta !== undefined && { meta }),
  };

  return res.status(statusCode).json(body);
}

/**
 * Sends a standardised error response.
 */
export function sendError(
  res: Response,
  options: {
    message?: string;
    statusCode?: number;
    errors?: FieldError[];
  } = {},
): Response {
  const {
    message = 'An error occurred',
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errors,
  } = options;

  const body: ApiErrorResponse = {
    success: false,
    message,
    status: statusCode,
    ...(errors && errors.length > 0 && { errors }),
  };

  return res.status(statusCode).json(body);
}
