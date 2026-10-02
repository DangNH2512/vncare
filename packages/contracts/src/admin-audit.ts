import { z } from 'zod';
import { cursorPage } from './common';
import { UserRole } from './auth';
import { queryInstant } from './admin-users';

export const ADMIN_AUDIT_LIST_DEFAULT_LIMIT = 25;
export const ADMIN_AUDIT_LIST_MAX_LIMIT = 100;

const csv = (value: unknown) =>
  typeof value === 'string' ? value.split(',').map((part) => part.trim()).filter(Boolean) : value;

/** Action key such as `user.suspended` or `event.taken_down`. */
export const AuditAction = z.string().regex(/^[a-z_]+\.[a-z_0-9]+$/);
export type AuditActionT = z.infer<typeof AuditAction>;

export const AuditSeverity = z.enum(['info', 'notice', 'warning', 'critical']);
export type AuditSeverityT = z.infer<typeof AuditSeverity>;

/**
 * Kinds of entity an audit line can point at. `post`, `comment`, `report` and
 * `moderation_case` are written by the moderation flow (A4).
 */
export const AuditEntityType = z.enum([
  'user',
  'event',
  'post',
  'comment',
  'report',
  'moderation_case',
]);
export type AuditEntityTypeT = z.infer<typeof AuditEntityType>;

/** Query of `GET /admin/audit-logs`. Strict; `action` and `severity` accept CSV. */
export const AdminAuditListQuery = z
  .strictObject({
    actorId: z.uuid().optional(),
    action: z.preprocess(csv, z.array(AuditAction).min(1)).optional(),
    entityType: AuditEntityType.optional(),
    entityId: z.uuid().optional(),
    severity: z.preprocess(csv, z.array(AuditSeverity).min(1)).optional(),
    from: queryInstant.optional(),
    to: queryInstant.optional(),
    cursor: z.string().min(1).max(512).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(ADMIN_AUDIT_LIST_MAX_LIMIT)
      .default(ADMIN_AUDIT_LIST_DEFAULT_LIMIT),
  })
  .refine((q) => !q.from || !q.to || Date.parse(q.from) < Date.parse(q.to), {
    path: ['from'],
    message: 'from must be before to',
  });
export type AdminAuditListQueryT = z.infer<typeof AdminAuditListQuery>;

/** Audit actor as shown to staff: no contact data. */
export const AdminAuditActor = z.object({
  id: z.uuid().nullable(),
  handle: z.string().nullable(),
  /** Role the actor held when the action happened, not their current role. */
  role: UserRole.nullable(),
});
export type AdminAuditActorT = z.infer<typeof AdminAuditActor>;

/** Changed fields only, already stripped of PII by the server. */
const FORBIDDEN_DIFF_KEYS = new Set([
  'email', 'phone', 'ip', 'useragent', 'birthyear', 'gender', 'tokenhash',
  'passwordhash', 'deviceid', 'evidenceid', 'phonenumber',
]);

/** Case, underscore and hyphen are not significant: `password_hash` equals `passwordHash`. */
const normalizeKey = (key: string): string => key.toLowerCase().replace(/[_-]/g, '');

/** Normalized keys containing one of these are PII or secrets whatever surrounds them. */
const FORBIDDEN_DIFF_FRAGMENTS = ['email', 'phone', 'password', 'token'];

/** Forms of `ip` that do not split into a standalone word. */
const FORBIDDEN_IP_KEYS = new Set(['ipaddress', 'ipaddr', 'clientip', 'remoteip', 'sourceip']);

/** Words of a key: split on `_`, `-`, spaces and camelCase boundaries. */
const keyWords = (key: string): string[] =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .map((word) => word.toLowerCase())
    .filter(Boolean);

function isForbiddenKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (FORBIDDEN_DIFF_KEYS.has(normalized) || FORBIDDEN_IP_KEYS.has(normalized)) return true;
  if (FORBIDDEN_DIFF_FRAGMENTS.some((fragment) => normalized.includes(fragment))) return true;
  // `ip` and `otp` count as words only: `ship`, `relationship` and `description` stay legal.
  return keyWords(key).some((word) => word === 'ip' || word === 'otp');
}

/** True when no object key, at any depth, is a forbidden PII key. */
function diffIsClean(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(diffIsClean);
  if (value && typeof value === 'object')
    return Object.entries(value).every(([k, v]) => !isForbiddenKey(k) && diffIsClean(v));
  return true;
}

export const AuditDiff = z
  .record(z.string(), z.unknown())
  .refine(diffIsClean, { message: 'diff must not carry PII keys' })
  .nullable();

/** One audit row. `ip` and `userAgent` are stored but never exposed. */
export const AdminAuditItem = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  actor: AdminAuditActor,
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: z.string().nullable(),
  severity: AuditSeverity,
  reason: z.string().nullable(),
  before: AuditDiff,
  after: AuditDiff,
});
export type AdminAuditItemT = z.infer<typeof AdminAuditItem>;

export const AdminAuditListResponse = cursorPage(AdminAuditItem);
export type AdminAuditListResponseT = z.infer<typeof AdminAuditListResponse>;
