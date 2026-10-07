import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Organization name is required').max(200),
  domain: z.string().trim().max(100).optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const createOfficeSchema = z.object({
  name: z.string().trim().min(1, 'Office name is required').max(200),
  city: z.string().trim().min(1, 'City is required').max(100),
  country: z.string().trim().min(1, 'Country is required').max(100),
  timezone: z.string().trim().default('UTC'),
});

export const updateOfficeSchema = createOfficeSchema.partial();

export const createDepartmentSchema = z.object({
  org_id: z.string().uuid('org_id must be a valid UUID'),
  name: z.string().trim().min(1, 'Department name is required').max(200),
  code: z.string().trim().min(1, 'Department code is required').max(50).toUpperCase(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createJobTitleSchema = z.object({
  dept_id: z.string().uuid('dept_id must be a valid UUID'),
  title: z.string().trim().min(1, 'Job title is required').max(200),
  grade: z.string().trim().min(1, 'Job grade is required').max(50),
});

export const updateJobTitleSchema = createJobTitleSchema.partial();
