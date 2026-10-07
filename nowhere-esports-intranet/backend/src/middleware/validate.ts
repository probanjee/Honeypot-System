import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors';
import { FieldError } from '../types/api';

// ---------------------------------------------------------------------------
// validate — Zod request validation middleware factory.
//
// Usage:
//   router.post('/route', validate({ body: MyBodySchema }), handler);
//   router.get('/route/:id', validate({ params: uuidParam }), handler);
//   router.get('/route', validate({ query: paginationQuery }), handler);
//
// On failure: forwards a ValidationError with field-level errors to next().
// On success: attaches the parsed (coerced + transformed) data back to
//             req.body / req.query / req.params so downstream code gets
//             the correctly typed values.
// ---------------------------------------------------------------------------

type ValidateTarget = {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
};

function zodErrorToFieldErrors(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
    code: issue.code,
  }));
}

export function validate(schemas: ValidateTarget) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const fieldErrors: FieldError[] = [];

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        fieldErrors.push(...zodErrorToFieldErrors(result.error));
      } else {
        req.params = result.data as Record<string, string>;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        fieldErrors.push(...zodErrorToFieldErrors(result.error));
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req.query = result.data as any;
      }
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        fieldErrors.push(...zodErrorToFieldErrors(result.error));
      } else {
        req.body = result.data;
      }
    }

    if (fieldErrors.length > 0) {
      return next(new ValidationError('Validation failed', fieldErrors));
    }

    next();
  };
}
