import { z } from 'zod';

export const createFolderSchema = z.object({
  name: z.string().trim().min(1, 'Folder name is required').max(100),
  parent_id: z.string().uuid('parent_id must be a valid UUID').optional().nullable(),
});

export const updateFolderSchema = createFolderSchema.partial().omit({ parent_id: true });

export const createDocumentSchema = z.object({
  name: z.string().trim().min(1, 'Document name is required').max(200),
  folder_id: z.string().uuid('folder_id must be a valid UUID').optional().nullable(),
  file_type: z.string().trim().min(1, 'File type is required'),
  size_bytes: z.number().int().min(0).default(0),
});

export const updateDocumentSchema = createDocumentSchema.partial().omit({ file_type: true });
