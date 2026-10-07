import { FieldError } from '../types/api';
import { HTTP_STATUS } from '../constants/http';

// ---------------------------------------------------------------------------
// Base application error class.
// All custom errors extend this class.
// ---------------------------------------------------------------------------

export class AppError extends Error {
  /** HTTP status code to send to the client */
  public readonly statusCode: number;

  /**
   * true  = expected operational error (bad input, not found, etc.)
   * false = programming error or unexpected failure
   */
  public readonly isOperational: boolean;

  /** Field-level error details (primarily for validation errors) */
  public readonly errors: FieldError[];

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    errors: FieldError[] = [],
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}
