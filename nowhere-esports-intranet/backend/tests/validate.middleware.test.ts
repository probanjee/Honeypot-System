import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../src/middleware/validate';
import { errorHandler } from '../src/middleware/errorHandler';

// ---------------------------------------------------------------------------
// validate middleware — tests for body, query, and params validation.
// ---------------------------------------------------------------------------

const bodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  age: z.coerce.number().int().min(18, 'Must be at least 18'),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const paramsSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
});

function createValidationTestApp() {
  const app = express();
  app.use(express.json());

  const router = Router();

  router.post('/body', validate({ body: bodySchema }), (req: Request, res: Response) => {
    res.json({ success: true, data: req.body });
  });

  router.get('/query', validate({ query: querySchema }), (req: Request, res: Response) => {
    res.json({ success: true, data: req.query });
  });

  router.get('/params/:id', validate({ params: paramsSchema }), (req: Request, res: Response) => {
    res.json({ success: true, data: req.params });
  });

  router.post(
    '/combined/:id',
    validate({ params: paramsSchema, body: bodySchema }),
    (req: Request, res: Response) => {
      res.json({ success: true });
    },
  );

  app.use('/', router);
  app.use(errorHandler);

  return app;
}

describe('validate middleware', () => {
  const app = createValidationTestApp();

  describe('Body validation', () => {
    it('should pass with valid body', async () => {
      const res = await request(app).post('/body').send({
        name: 'Alice',
        email: 'alice@nowhere.gg',
        age: 25,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Alice');
    });

    it('should return 400 with field errors for invalid body', async () => {
      const res = await request(app).post('/body').send({
        name: '',
        email: 'not-an-email',
        age: 15,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('should return errors with field and message properties', async () => {
      const res = await request(app).post('/body').send({
        name: 'Alice',
        email: 'bad-email',
        age: 25,
      });

      expect(res.status).toBe(400);
      const emailError = res.body.errors.find((e: { field: string }) => e.field === 'email');
      expect(emailError).toBeDefined();
      expect(emailError.message).toMatch(/email/i);
    });

    it('should coerce age from string to number', async () => {
      const res = await request(app).post('/body').send({
        name: 'Bob',
        email: 'bob@nowhere.gg',
        age: '22',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.age).toBe(22);
    });
  });

  describe('Query validation', () => {
    it('should pass with valid query params', async () => {
      const res = await request(app).get('/query?page=2&limit=50');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should apply defaults for missing optional query params', async () => {
      const res = await request(app).get('/query');

      expect(res.status).toBe(200);
      // Defaults from Zod schema
      expect(Number(res.body.data.page)).toBe(1);
      expect(Number(res.body.data.limit)).toBe(20);
    });

    it('should return 400 for out-of-range query param', async () => {
      const res = await request(app).get('/query?page=0');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Params validation', () => {
    it('should pass with valid UUID param', async () => {
      const res = await request(app).get(
        '/params/00000000-0000-0000-0000-000000000001',
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for invalid UUID param', async () => {
      const res = await request(app).get('/params/not-a-uuid');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      const idError = res.body.errors.find((e: { field: string }) => e.field === 'id');
      expect(idError).toBeDefined();
    });
  });

  describe('Combined validation', () => {
    it('should validate both params and body', async () => {
      const res = await request(app)
        .post('/combined/not-a-uuid')
        .send({ name: '', email: 'bad' });

      expect(res.status).toBe(400);
      expect(res.body.errors.length).toBeGreaterThan(1);
    });
  });
});
