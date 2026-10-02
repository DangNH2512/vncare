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

/** Own-property lookup, so a value like `constructor` never resolves to an inherited member. */
const lookup = (map: Readonly<Record<string, MessageKey>>, key: string): MessageKey | undefined =>
  Object.hasOwn(map, key) ? map[key] : undefined;

/** Plain text of one value. Known enums read as their label; anything else is stringified. */
function valueText(
  field: string,
  value: unknown,
  entityType: AdminAuditItemT['entityType'],
  t: Translate,
): string {
  if (value === undefined || value === null) return NO_VALUE;
  if (typeof value === 'string') {
    const key =
      field === 'role'
        ? lookup(ROLE_KEY, value)
        : field === 'status'
          ? lookup(entityType === 'event' ? EVENT_STATUS_LABEL_KEY : STATUS_KEY, value)
          : undefined;
    return key === undefined ? value : t(key);
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
        const labelKey = lookup(FIELD_KEY, field);
        return (
          <li key={field} className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {labelKey === undefined ? (
              <span translate="no" className="font-mono text-xs break-all text-fg-muted">
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
