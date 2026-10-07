import { AppError } from './AppError';
import { FieldError } from '../types/api';
import { HTTP_STATUS } from '../constants/http';

// ---------------------------------------------------------------------------
// Derived custom error classes
// ---------------------------------------------------------------------------

/**
 * 400 Bad Request — request body/query/params failed validation.
 * Includes field-level error details.
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', errors: FieldError[] = []) {
    super(message, HTTP_STATUS.BAD_REQUEST, true, errors);
  }
}

/**
 * 401 Unauthorized — JWT is missing, invalid, or expired.
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, HTTP_STATUS.UNAUTHORIZED, true);
  }
}

/**
 * 403 Forbidden — user is authenticated but lacks the required role/permission.
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, HTTP_STATUS.FORBIDDEN, true);
  }
}

/**
 * 404 Not Found — requested resource does not exist.
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, HTTP_STATUS.NOT_FOUND, true);
  }
}

/**
 * 409 Conflict — resource already exists or state conflict.
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists or conflict detected') {
    super(message, HTTP_STATUS.CONFLICT, true);
  }
}

/**
 * 500 Database Error — Supabase/PostgreSQL operation failed.
 * isOperational = false so it gets logged as critical.
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'A database error occurred') {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false);
  }
}

/**
 * 500 Internal Server Error — unexpected application error.
 * isOperational = false.
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'An unexpected error occurred') {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false);
  }
}

// Re-export base class and all derived classes
export { AppError };
export { AppError as default };
