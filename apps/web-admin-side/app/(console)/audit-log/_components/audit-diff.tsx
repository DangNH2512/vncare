import type { AdminAuditItemT } from '@dnc/contracts';

import { EVENT_STATUS_LABEL_KEY } from '../../../_components/labels/event-labels';
import { NO_VALUE } from '../../../_components/labels/format';
import { ROLE_KEY, STATUS_KEY } from '../../../_components/labels/user-labels';
import type { MessageKey, Translate } from '../../../_lib/i18n';

type Diff = Record<string, unknown> | null;

const FIELD_KEY: Readonly<Record<string, MessageKey>> = {
  role: 'admin.audit.detail.field.role',
  status: 'admin.audit.detail.field.status',
};

const has = (map: Readonly<Record<string, MessageKey>>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(map, key);

/** Plain text of one value. Known enums read as their label; anything else is stringified. */
function valueText(
  field: string,
  value: unknown,
  entityType: AdminAuditItemT['entityType'],
  t: Translate,
): string {
  if (value === undefined || value === null) return NO_VALUE;
  if (typeof value === 'string') {
    if (field === 'role') {
      const roles: Readonly<Record<string, MessageKey>> = ROLE_KEY;
      if (has(roles, value)) return t(roles[value] as MessageKey);
    }
    if (field === 'status') {
      const map: Readonly<Record<string, MessageKey>> =
        entityType === 'event' ? EVENT_STATUS_LABEL_KEY : STATUS_KEY;
      if (has(map, value)) return t(map[value] as MessageKey);
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

/** Field names in first-seen order: those of `before`, then new ones from `after`. */
function fieldsOf(before: Diff, after: Diff): string[] {
  return [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
}

/**
 * `before → after` as one short line per changed field. Plain text only: the
 * server already limits the diff to non-personal fields, and React escapes it.
 */
export function AuditDiff({ item, t }: { item: AdminAuditItemT; t: Translate }) {
  const fields = fieldsOf(item.before, item.after);
  if (fields.length === 0) {
    return <p className="text-fg-subtle">{t('admin.audit.detail.noChanges')}</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {fields.map((field) => {
        const labelKey = has(FIELD_KEY, field) ? FIELD_KEY[field] : undefined;
        return (
          <li key={field} className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {labelKey === undefined ? (
              <span translate="no" className="font-mono text-xs text-fg-muted">
                {field}
              </span>
            ) : (
              <span className="text-fg-muted">{t(labelKey)}</span>
            )}
            <span className="min-w-0 break-words text-fg-muted line-through decoration-fg-subtle">
              {valueText(field, item.before?.[field], item.entityType, t)}
            </span>
            <span aria-hidden className="text-fg-subtle">
              →
            </span>
            <span className="sr-only">{t('admin.audit.detail.to')}</span>
            <span className="min-w-0 font-medium break-words text-fg">
              {valueText(field, item.after?.[field], item.entityType, t)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
