import { z } from 'zod';

// ============================================
// AUTH SCHEMAS
// ============================================

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================
// EMAIL SCHEMAS
// ============================================

export const emailListQuerySchema = z.object({
  account_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  is_read: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  is_archived: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  label_id: z.string().optional(),
  search: z.string().max(500).optional(),
  sort: z.enum(['received_at', 'from_email', 'subject']).default('received_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const emailUpdateSchema = z.object({
  is_read: z.boolean().optional(),
  is_starred: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  label_ids: z.array(z.string()).optional(),
});

export const emailSnoozeSchema = z.object({
  until: z.string().datetime('Invalid datetime format'),
});

export const emailIdParamSchema = z.object({
  id: z.string().uuid('Invalid email ID'),
});

// ============================================
// ACCOUNT SCHEMAS
// ============================================

export const accountUpdateSchema = z.object({
  sync_enabled: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const accountIdParamSchema = z.object({
  id: z.string().uuid('Invalid account ID'),
});

export const accountIdParamSchemaAlt = z.object({
  accountId: z.string().uuid('Invalid account ID'),
});

// ============================================
// SYNC SCHEMAS
// ============================================

export const syncTriggerSchema = z.object({
  syncType: z.enum(['full', 'delta']).default('delta'),
});

export const syncLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ============================================
// COMPOSE / SEND EMAIL SCHEMAS
// ============================================

export const sendEmailSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  to: z.array(z.string().email('Invalid recipient email')).min(1, 'At least one recipient required'),
  cc: z.array(z.string().email('Invalid CC email')).optional(),
  bcc: z.array(z.string().email('Invalid BCC email')).optional(),
  subject: z.string().max(500, 'Subject too long').default(''),
  body: z.string().max(100000, 'Email body too long'),
  bodyHtml: z.string().max(500000, 'Email HTML too long').optional(),
  inReplyTo: z.string().uuid().optional(),
  threadId: z.string().optional(),
});

export const scheduleSendSchema = sendEmailSchema.extend({
  scheduledAt: z.string().datetime('Invalid datetime format'),
});

// ============================================
// DRAFT SCHEMAS
// ============================================

export const draftSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  to: z.array(z.string().email()).optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().max(500).optional(),
  body: z.string().max(100000).optional(),
  bodyHtml: z.string().max(500000).optional(),
  inReplyTo: z.string().uuid().optional(),
});

// Type exports for route handlers
export type SignupBody = z.infer<typeof signupSchema>;
export type EmailListQuery = z.infer<typeof emailListQuerySchema>;
export type EmailUpdateBody = z.infer<typeof emailUpdateSchema>;
export type EmailSnoozeBody = z.infer<typeof emailSnoozeSchema>;
export type AccountUpdateBody = z.infer<typeof accountUpdateSchema>;
export type SyncTriggerBody = z.infer<typeof syncTriggerSchema>;
export type SendEmailBody = z.infer<typeof sendEmailSchema>;
export type ScheduleSendBody = z.infer<typeof scheduleSendSchema>;
export type DraftBody = z.infer<typeof draftSchema>;
