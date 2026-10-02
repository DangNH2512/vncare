import type { AuditEntityTypeT, AuditSeverityT } from '@dnc/contracts';

import { NO_VALUE } from '../../../_components/labels/format';
import { Badge, type BadgeTone } from '../../../_components/ui';
import type { MessageKey, Translate } from '../../../_lib/i18n';

/** Explicit maps: catalog keys mix snake_case and camelCase, so never interpolate them. */
export const ACTION_KEY: Readonly<Record<string, MessageKey>> = {
  'user.suspended': 'admin.audit.action.user.suspended',
  'user.unsuspended': 'admin.audit.action.user.unsuspended',
  'user.role_changed': 'admin.audit.action.user.role_changed',
  'event.suspended': 'admin.audit.action.event.suspended',
  'event.restored': 'admin.audit.action.event.restored',
  'event.taken_down': 'admin.audit.action.event.taken_down',
};

/** Order of the action filter. */
export const ACTIONS: readonly (readonly [string, MessageKey])[] = Object.entries(ACTION_KEY);

export const SEVERITIES: readonly AuditSeverityT[] = ['info', 'notice', 'warning', 'critical'];
export const ENTITY_TYPES: readonly AuditEntityTypeT[] = [
  'user',
  'event',
  'post',
  'comment',
  'report',
  'moderation_case',
];

const SEVERITY_KEY: Readonly<Record<AuditSeverityT, MessageKey>> = {
  info: 'admin.audit.severity.info',
  notice: 'admin.audit.severity.notice',
  warning: 'admin.audit.severity.warning',
  critical: 'admin.audit.severity.critical',
};

const SEVERITY_TONE: Readonly<Record<AuditSeverityT, BadgeTone>> = {
  info: 'neutral',
  notice: 'accent',
  warning: 'warning',
  critical: 'danger',
};

export const ENTITY_KEY: Readonly<Record<AuditEntityTypeT, MessageKey>> = {
  user: 'admin.audit.entity.user',
  event: 'admin.audit.entity.event',
  post: 'admin.audit.entity.post',
  comment: 'admin.audit.entity.comment',
  report: 'admin.audit.entity.report',
  moderation_case: 'admin.audit.entity.moderation_case',
};

export function severityLabel(severity: AuditSeverityT, t: Translate): string {
  return t(SEVERITY_KEY[severity]);
}

export function SeverityBadge({ severity, t }: { severity: AuditSeverityT; t: Translate }) {
  return <Badge tone={SEVERITY_TONE[severity]}>{severityLabel(severity, t)}</Badge>;
}

/**
 * Action name for a row. A code the catalog does not know (a newer server)
 * reads as a dash plus the raw code in small mono text, never a raw key.
 */
export function ActionLabel({ action, t }: { action: string; t: Translate }) {
  const key = ACTION_KEY[action];
  if (key !== undefined) return <span className="font-medium">{t(key)}</span>;
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-fg-subtle">{NO_VALUE}</span>
      <span translate="no" className="font-mono text-xs text-fg-muted">
        {action}
      </span>
    </span>
  );
}
