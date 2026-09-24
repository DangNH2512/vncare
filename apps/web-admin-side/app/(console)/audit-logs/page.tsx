'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { allowedRolesFor } from '@dnc/domain';
import type {
  AuditActionT,
  AuditEntityTypeT,
  AuditLogQueryT,
  AuditLogResponseT,
} from '@dnc/contracts';

import { useTranslate } from '../../_components/locale-provider';
import {
  AUDIT_ACTION_LABEL_KEY,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_LABEL_KEY,
  AUDIT_ENTITY_TYPES,
  AUDIT_SEVERITY_LABEL_KEY,
  isReportReason,
  REASON_LABEL_KEY,
} from '../../_components/moderation/labels';
import { RequireRole } from '../../_components/require-role';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  SkeletonText,
  Table,
  TableHead,
  Td,
  Th,
  Tr,
  type BadgeTone,
} from '../../_components/ui';
import { listAuditLogs } from '../../_lib/api';
import {
  endOfAppDayIso,
  formatDateTime,
  isDateInputValue,
  startOfAppDayIso,
} from '../../_lib/datetime';
import type { Translate } from '../../_lib/i18n';
import { roleLabelKey } from '../../_lib/roles';

const PAGE_SIZE = 20;

const SEVERITY_TONE: Readonly<Record<AuditLogResponseT['severity'], BadgeTone>> = {
  info: 'neutral',
  notice: 'accent',
  warning: 'warning',
  critical: 'danger',
};

/** Filters as they sit in the URL (dates as Da Nang calendar days, `YYYY-MM-DD`). */
interface AuditFilters {
  from: string;
  to: string;
  action: AuditActionT | '';
  actor: string;
  entityType: AuditEntityTypeT | '';
}

const EMPTY_FILTERS: AuditFilters = { from: '', to: '', action: '', actor: '', entityType: '' };

function readFilters(params: URLSearchParams | { get(name: string): string | null }): AuditFilters {
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const action = params.get('action') ?? '';
  const entityType = params.get('entityType') ?? '';
  return {
    from: isDateInputValue(from) ? from : '',
    to: isDateInputValue(to) ? to : '',
    action: AUDIT_ACTIONS.find((value) => value === action) ?? '',
    actor: (params.get('actor') ?? '').trim(),
    entityType: AUDIT_ENTITY_TYPES.find((value) => value === entityType) ?? '',
  };
}

/** URL filters → API query. Day bounds are Da Nang's midnight-to-midnight (AC-48). */
function toQuery(filters: AuditFilters): Partial<AuditLogQueryT> {
  return {
    ...(filters.from === '' ? {} : { from: startOfAppDayIso(filters.from) }),
    ...(filters.to === '' ? {} : { to: endOfAppDayIso(filters.to) }),
    ...(filters.action === '' ? {} : { action: filters.action }),
    ...(filters.actor === '' ? {} : { actorUserId: filters.actor }),
    ...(filters.entityType === '' ? {} : { entityType: filters.entityType }),
  };
}

type LogState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | {
      kind: 'ready';
      items: AuditLogResponseT[];
      nextCursor: string | null;
      loadingMore: boolean;
      loadMoreFailed: boolean;
    };

/**
 * Audit log viewer (T-ADM-3, AC-42..AC-45). Read-only by construction: the
 * API client has no write function for this journal and the table renders no
 * control that could change a row. Which rows come back is the API's call
 * (`auditLogScope`): a moderator sees their own actions only, an admin
 * everything but super_admin actors, a super_admin all.
 */
export default function AuditLogPage() {
  return (
    <RequireRole allowedRoles={allowedRolesFor('audit_log.view')}>
      <Suspense
        fallback={
          <Card aria-busy="true">
            <SkeletonText lines={6} />
          </Card>
        }
      >
        <AuditLogContent />
      </Suspense>
    </RequireRole>
  );
}

function AuditLogContent() {
  const t = useTranslate();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  // The applied filters are the URL; the form holds a draft until "Apply".
  const [draft, setDraft] = useState<AuditFilters>(() => readFilters(searchParams));
  const [state, setState] = useState<LogState>({ kind: 'loading' });
  const generation = useRef(0);

  useEffect(() => {
    setDraft(readFilters(new URLSearchParams(searchKey)));
  }, [searchKey]);

  const load = useCallback(() => {
    const seq = ++generation.current;
    setState({ kind: 'loading' });
    listAuditLogs({ ...toQuery(readFilters(new URLSearchParams(searchKey))), limit: PAGE_SIZE })
      .then((page) => {
        if (seq !== generation.current) return;
        setState({
          kind: 'ready',
          items: page.items,
          nextCursor: page.nextCursor,
          loadingMore: false,
          loadMoreFailed: false,
        });
      })
      .catch(() => {
        if (seq === generation.current) setState({ kind: 'error' });
      });
  }, [searchKey]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = () => {
    if (state.kind !== 'ready' || state.nextCursor === null || state.loadingMore) return;
    const seq = generation.current;
    const cursor = state.nextCursor;
    setState({ ...state, loadingMore: true, loadMoreFailed: false });
    listAuditLogs({
      ...toQuery(readFilters(new URLSearchParams(searchKey))),
      limit: PAGE_SIZE,
      cursor,
    })
      .then((page) => {
        if (seq !== generation.current) return;
        setState((previous) => {
          if (previous.kind !== 'ready') return previous;
          const seen = new Set(previous.items.map((item) => item.id));
          return {
            ...previous,
            items: [...previous.items, ...page.items.filter((item) => !seen.has(item.id))],
            nextCursor: page.nextCursor,
            loadingMore: false,
          };
        });
      })
      .catch(() => {
        if (seq !== generation.current) return;
        setState((previous) =>
          previous.kind === 'ready'
            ? { ...previous, loadingMore: false, loadMoreFailed: true }
            : previous,
        );
      });
  };

  const apply = (filters: AuditFilters) => {
    const next = new URLSearchParams();
    if (filters.from !== '') next.set('from', filters.from);
    if (filters.to !== '') next.set('to', filters.to);
    if (filters.action !== '') next.set('action', filters.action);
    if (filters.actor.trim() !== '') next.set('actor', filters.actor.trim());
    if (filters.entityType !== '') next.set('entityType', filters.entityType);
    const query = next.toString();
    router.replace(query === '' ? pathname : `${pathname}?${query}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-fg">{t('admin.audit.title')}</h1>
        <p className="text-sm text-fg-muted">{t('admin.audit.readOnly')}</p>
      </div>

      <Card as="section">
        <form
          className="grid grid-cols-1 items-end gap-4 md:grid-cols-3 xl:grid-cols-6"
          onSubmit={(event) => {
            event.preventDefault();
            apply(draft);
          }}
        >
          <Input
            label={t('admin.audit.filter.from')}
            type="date"
            value={draft.from}
            max={draft.to === '' ? undefined : draft.to}
            onChange={(event) => setDraft({ ...draft, from: event.target.value })}
          />
          <Input
            label={t('admin.audit.filter.to')}
            type="date"
            value={draft.to}
            min={draft.from === '' ? undefined : draft.from}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          />
          <Select
            label={t('admin.audit.filter.action')}
            placeholder={t('admin.audit.filter.any')}
            options={AUDIT_ACTIONS.map((value) => ({
              value,
              label: t(AUDIT_ACTION_LABEL_KEY[value]),
            }))}
            value={draft.action}
            onChange={(event) =>
              setDraft({
                ...draft,
                action: AUDIT_ACTIONS.find((value) => value === event.target.value) ?? '',
              })
            }
          />
          <Input
            label={t('admin.audit.filter.actor')}
            value={draft.actor}
            spellCheck={false}
            autoComplete="off"
            className="font-mono text-sm"
            onChange={(event) => setDraft({ ...draft, actor: event.target.value })}
          />
          <Select
            label={t('admin.audit.filter.entityType')}
            placeholder={t('admin.audit.filter.any')}
            options={AUDIT_ENTITY_TYPES.map((value) => ({
              value,
              label: t(AUDIT_ENTITY_LABEL_KEY[value]),
            }))}
            value={draft.entityType}
            onChange={(event) =>
              setDraft({
                ...draft,
                entityType: AUDIT_ENTITY_TYPES.find((value) => value === event.target.value) ?? '',
              })
            }
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              {t('admin.audit.filter.apply')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDraft(EMPTY_FILTERS);
                apply(EMPTY_FILTERS);
              }}
            >
              {t('admin.audit.filter.reset')}
            </Button>
          </div>
        </form>
      </Card>

      {state.kind === 'loading' && (
        <Card aria-busy="true">
          <SkeletonText lines={6} />
        </Card>
      )}

      {state.kind === 'error' && (
        <Card>
          <EmptyState
            icon={<span className="text-2xl">⚠</span>}
            title={t('admin.audit.error.title')}
            action={<Button onClick={load}>{t('common.retry')}</Button>}
          />
        </Card>
      )}

      {state.kind === 'ready' && (
        <div className="flex flex-col gap-4">
          {state.items.length === 0 ? (
            <Card>
              <EmptyState title={t('admin.audit.empty')} />
            </Card>
          ) : (
            <AuditTable items={state.items} t={t} />
          )}

          {state.loadMoreFailed && (
            <p role="alert" className="text-sm text-danger-text">
              {t('admin.audit.error.title')}
            </p>
          )}

          {state.nextCursor !== null && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={loadMore} disabled={state.loadingMore}>
                {state.loadingMore ? t('common.loading') : t('admin.audit.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AuditTable({ items, t }: { items: readonly AuditLogResponseT[]; t: Translate }) {
  return (
    <Table label={t('admin.audit.title')}>
      <TableHead>
        <tr>
          <Th className="w-44">{t('admin.audit.column.time')}</Th>
          <Th className="w-52">{t('admin.audit.column.actor')}</Th>
          <Th className="w-48">{t('admin.audit.column.action')}</Th>
          <Th className="w-56">{t('admin.audit.column.entity')}</Th>
          <Th>{t('admin.audit.column.change')}</Th>
          <Th className="w-72">{t('admin.audit.column.reason')}</Th>
        </tr>
      </TableHead>
      <tbody>
        {items.map((entry) => (
          <Tr key={entry.id}>
            <Td className="whitespace-nowrap text-fg-muted">
              <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
            </Td>
            <Td>
              <ActorCell entry={entry} t={t} />
            </Td>
            <Td>
              <div className="flex flex-col items-start gap-1">
                <span className="font-medium">{t(AUDIT_ACTION_LABEL_KEY[entry.action])}</span>
                <Badge tone={SEVERITY_TONE[entry.severity]}>
                  {t(AUDIT_SEVERITY_LABEL_KEY[entry.severity])}
                </Badge>
              </div>
            </Td>
            <Td>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-fg-subtle">
                  {t(AUDIT_ENTITY_LABEL_KEY[entry.entityType])}
                </span>
                {entry.entityType === 'moderation_ticket' ? (
                  <Link
                    href={`/moderation/${entry.entityId}`}
                    className="font-mono text-xs break-all text-accent-text hover:underline"
                  >
                    {entry.entityId}
                  </Link>
                ) : (
                  <span className="font-mono text-xs break-all">{entry.entityId}</span>
                )}
              </div>
            </Td>
            <Td>
              <ChangeList before={entry.before} after={entry.after} />
            </Td>
            <Td>
              <div className="flex flex-col gap-1">
                {entry.reasonCode !== null &&
                  (isReportReason(entry.reasonCode) ? (
                    <Badge tone="neutral" className="w-fit">
                      {t(REASON_LABEL_KEY[entry.reasonCode])}
                    </Badge>
                  ) : (
                    <span className="font-mono text-xs">{entry.reasonCode}</span>
                  ))}
                {entry.actorType === 'staff' && entry.note !== null && (
                  <p className="line-clamp-4 text-sm whitespace-pre-wrap break-words" title={entry.note}>
                    {entry.note}
                  </p>
                )}
              </div>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

function ActorCell({ entry, t }: { entry: AuditLogResponseT; t: Translate }) {
  if (entry.actorType === 'system') {
    return <span className="text-fg-muted">{t('admin.audit.system')}</span>;
  }
  const roleKey = entry.actorRole === null ? undefined : roleLabelKey(entry.actorRole);
  return (
    <div className="flex flex-col items-start gap-1">
      {entry.actor !== null && (
        <span className="break-words">
          {entry.actor.displayName}{' '}
          <span className="text-fg-muted">@{entry.actor.handle}</span>
        </span>
      )}
      {roleKey !== undefined && <Badge tone="accent">{t(roleKey)}</Badge>}
    </div>
  );
}

/** Timestamps inside before/after (`suspendedUntil`, `slaDueAt`) read in Da Nang time too. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') {
    return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value))
      ? formatDateTime(value)
      : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

/**
 * Field-by-field diff. The API stores only the fields that changed and never
 * contact details or content bodies (AC-42), so this renders every key it
 * receives: field names and values are data (`status: visible → hidden`),
 * shown in monospace rather than translated.
 */
function ChangeList({
  before,
  after,
}: {
  before: Readonly<Record<string, unknown>>;
  after: Readonly<Record<string, unknown>>;
}) {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  if (keys.length === 0) return <span className="text-fg-subtle">—</span>;
  return (
    <ul className="flex flex-col gap-1 font-mono text-xs">
      {keys.map((key) => (
        <li key={key} className="break-words">
          <span className="text-fg-muted">{key}:</span> {formatValue(before[key])} →{' '}
          {formatValue(after[key])}
        </li>
      ))}
    </ul>
  );
}
