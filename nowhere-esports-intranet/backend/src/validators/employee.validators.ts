import { z } from 'zod';

export const createEmployeeSchema = z.object({
  id: z.string().uuid('User Profile ID must be a valid UUID'),
  email: z.string().email('Invalid email').trim(),
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  role: z.enum(['employee', 'manager', 'hr', 'tournament_admin', 'it_support', 'security_analyst', 'administrator', 'super_admin']).default('employee'),
  department_id: z.string().uuid('Invalid department ID').optional().nullable(),
  office_id: z.string().uuid('Invalid office ID').optional().nullable(),
  job_title_id: z.string().uuid('Invalid job title ID').optional().nullable(),
  employee_id: z.string().trim().max(50).optional(), // format handled by generator
  hire_date: z.string().transform((v) => new Date(v)).optional(),
  termination_date: z.string().transform((v) => new Date(v)).optional().nullable(),
  manager_id: z.string().uuid('manager_id must be a valid UUID').optional().nullable(),
  status: z.enum(['active', 'on_leave', 'terminated']).default('active'),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().omit({ id: true, email: true });

export const createEmployeeContactSchema = z.object({
  emp_id: z.string().uuid('emp_id must be a valid UUID'),
  type: z.enum(['personal_email', 'work_email', 'personal_phone', 'work_phone', 'discord', 'slack']),
  value: z.string().trim().min(1, 'Contact value is required'),
  is_primary: z.boolean().default(false),
});

export const updateEmployeeContactSchema = createEmployeeContactSchema.partial().omit({ emp_id: true });

export const createEmployeeAddressSchema = z.object({
  emp_id: z.string().uuid('emp_id must be a valid UUID'),
  type: z.enum(['home', 'billing', 'mailing']),
  line1: z.string().trim().min(1, 'Address line 1 is required'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  postal_code: z.string().trim().min(1, 'Postal code is required'),
  country: z.string().trim().min(1, 'Country is required'),
  is_primary: z.boolean().default(false),
});

export const updateEmployeeAddressSchema = createEmployeeAddressSchema.partial().omit({ emp_id: true });

export const createEmployeeEmergencyContactSchema = z.object({
  emp_id: z.string().uuid('emp_id must be a valid UUID'),
  name: z.string().trim().min(1, 'Contact name is required'),
  relationship: z.string().trim().min(1, 'Relationship is required'),
  phone: z.string().trim().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').trim().optional().nullable(),
  is_primary: z.boolean().default(false),
});

export const updateEmployeeEmergencyContactSchema = createEmployeeEmergencyContactSchema.partial().omit({ emp_id: true });
