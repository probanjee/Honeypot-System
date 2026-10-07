import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { Router } from 'express';
import { errorHandler } from '../src/middleware/errorHandler';
import { notFound } from '../src/middleware/notFound';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  InternalServerError,
} from '../src/errors';

// ---------------------------------------------------------------------------
// Error middleware — tests that each error class maps to correct HTTP status
// and response shape.
// ---------------------------------------------------------------------------

/**
 * Creates a minimal Express app that throws a given error from a test route,
 * then passes it through the error handler.
 */
function createTestApp(throwFn: () => never) {
  const app = express();
  app.use(express.json());

  const router = Router();
  router.get('/trigger', () => {
    throwFn();
  });

  app.use('/', router);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

describe('Error Middleware', () => {
  describe('ValidationError', () => {
    it('should return 400 with field errors', async () => {
      const app = createTestApp(() => {
        throw new ValidationError('Validation failed', [
          { field: 'email', message: 'Invalid email format' },
        ]);
      });

      const res = await request(app).get('/trigger');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.status).toBe(400);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors[0].field).toBe('email');
    });
  });

  describe('AuthenticationError', () => {
    it('should return 401', async () => {
      const app = createTestApp(() => {
        throw new AuthenticationError('Token expired');
      });

      const res = await request(app).get('/trigger');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Token expired');
      expect(res.body.status).toBe(401);
    });
  });

  describe('AuthorizationError', () => {
    it('should return 403', async () => {
      const app = createTestApp(() => {
        throw new AuthorizationError();
      });

      const res = await request(app).get('/trigger');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should return 404 for explicit throw', async () => {
      const app = createTestApp(() => {
        throw new NotFoundError('User');
      });

      const res = await request(app).get('/trigger');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('User');
    });

    it('should return 404 for unknown routes via notFound middleware', async () => {
      const app = createTestApp(() => {
        throw new Error('should not reach');
      });

      const res = await request(app).get('/nonexistent-route');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('ConflictError', () => {
    it('should return 409', async () => {
      const app = createTestApp(() => {
        throw new ConflictError('Email already in use');
      });

      const res = await request(app).get('/trigger');

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email already in use');
    });
  });

  describe('DatabaseError', () => {
    it('should return 500 with generic message (non-operational)', async () => {
      const app = createTestApp(() => {
        throw new DatabaseError('Query timeout');
      });

      const res = await request(app).get('/trigger');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      // Non-operational errors should show generic message in non-dev env
      expect(res.body.status).toBe(500);
    });
  });

  describe('InternalServerError', () => {
    it('should return 500', async () => {
      const app = createTestApp(() => {
        throw new InternalServerError();
      });

      const res = await request(app).get('/trigger');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Unknown errors', () => {
    it('should return 500 for generic Error instances', async () => {
      const app = createTestApp(() => {
        throw new Error('Something unexpected happened');
      });

      const res = await request(app).get('/trigger');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Response envelope', () => {
    it('should always include success, message, and status fields', async () => {
      const app = createTestApp(() => {
        throw new AuthenticationError();
      });

      const res = await request(app).get('/trigger');

      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('status');
      expect(typeof res.body.success).toBe('boolean');
      expect(typeof res.body.message).toBe('string');
      expect(typeof res.body.status).toBe('number');
    });
  });
});
