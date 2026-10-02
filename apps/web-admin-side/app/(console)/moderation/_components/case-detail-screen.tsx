'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AdminModerationCaseDetailResponseT } from '@dnc/contracts';
import { ModerationCaseNumber } from '@dnc/contracts';
import { allowedRolesFor } from '@dnc/domain';
import { MESSAGE_KEYS, type MessageKey } from '@dnc/i18n';

import { useAuth } from '../../../_components/auth-provider';
import { useLocale, useTranslate } from '../../../_components/locale-provider';
import { Badge, Button, Card, EmptyState, SkeletonText } from '../../../_components/ui';
import { ApiError } from '../../../_lib/api';
import { INTL_LOCALE } from '../../../_lib/i18n';
import { getModerationCase } from '../../../_lib/moderation-api';
import { CaseDetailActions } from './case-detail-actions';
import {
  CaseFactsSection,
  HistorySection,
  OwnerSection,
  ReportsSection,
  TargetSection,
} from './case-detail-sections';
import { CASE_STATUS_KEY, SeverityBadge, SlaBadge } from './moderation-labels';
import { readSla } from './sla';
import { useNow } from './use-now';

type State =
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'forbidden'; messageKey: MessageKey | null }
  | { kind: 'error' }
  | { kind: 'ready'; data: AdminModerationCaseDetailResponseT };

const KNOWN_KEYS: ReadonlySet<string> = new Set(MESSAGE_KEYS);

/**
 * One moderation case (D-M9). A case the viewer has a conflict of interest
 * with answers 403 with its own message, which is shown instead of the generic
 * "no permission" line.
 */
export function CaseDetailScreen({ rawCaseNumber }: { rawCaseNumber: string }) {
  const t = useTranslate();
  const { locale } = useLocale();
  const { user } = useAuth();
  const now = useNow();
  const parsed = ModerationCaseNumber.safeParse(rawCaseNumber);
  const caseNumber = parsed.success ? parsed.data : null;
  const [state, setState] = useState<State>(caseNumber === null ? { kind: 'notFound' } : { kind: 'loading' });
  const [reloads, setReloads] = useState(0);
  const canOpenUser = user !== null && allowedRolesFor('user.directory.view').includes(user.role);

  // Only the newest response may touch the screen, so a slow earlier reply cannot overwrite fresher data.
  const latestRequest = useRef(0);

  const load = useCallback(
    async (silent: boolean): Promise<boolean> => {
      if (caseNumber === null) {
        setState({ kind: 'notFound' });
        return true;
      }
      const request = ++latestRequest.current;
      const isCurrent = () => request === latestRequest.current;
      if (!silent) setState({ kind: 'loading' });
      try {
        const data = await getModerationCase(caseNumber);
        if (isCurrent()) setState({ kind: 'ready', data });
        return true;
      } catch (error: unknown) {
        if (!isCurrent()) return true;
        // A failed silent refresh keeps the data and the result notice on screen.
        if (silent) return false;
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
          setState({ kind: 'notFound' });
        } else if (error instanceof ApiError && error.status === 403) {
          const key = error.messageKey;
          setState({
            kind: 'forbidden',
            messageKey: key !== undefined && KNOWN_KEYS.has(key) ? (key as MessageKey) : null,
          });
        } else {
          setState({ kind: 'error' });
        }
        return false;
      }
    },
    [caseNumber],
  );

  useEffect(() => {
    void load(false);
    return () => {
      latestRequest.current += 1;
    };
  }, [load, reloads]);

  const refresh = useCallback(() => load(true), [load]);
  const retry = useCallback(() => setReloads((count) => count + 1), []);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link href="/moderation" className="text-sm font-medium text-accent-text hover:underline">
        <span aria-hidden>← </span>
        {t('admin.moderation.back')}
      </Link>

      {state.kind === 'loading' && (
        <Card aria-live="polite" aria-busy="true">
          <SkeletonText lines={6} />
        </Card>
      )}

      {state.kind === 'notFound' && (
        <Card>
          <EmptyState title={t('errors.admin.caseNotFound')} />
        </Card>
      )}

      {state.kind === 'forbidden' && (
        <Card role="alert">
          <EmptyState title={t(state.messageKey ?? 'errors.auth.roleNotAllowed')} />
        </Card>
      )}

      {state.kind === 'error' && (
        <Card role="alert">
          <EmptyState
            title={t('admin.moderation.detail.error.title')}
            description={t('admin.moderation.error.body')}
            action={<Button onClick={retry}>{t('common.retry')}</Button>}
          />
        </Card>
      )}

      {state.kind === 'ready' && (
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="min-w-0 text-xl font-semibold break-words text-fg">
              {t('admin.moderation.detail.title', { number: state.data.caseNumber })}
            </h1>
            <SeverityBadge severity={state.data.severity} t={t} />
            <Badge tone="accent">{t(CASE_STATUS_KEY[state.data.status])}</Badge>
            {state.data.autoHidden && <Badge tone="warning">{t('admin.moderation.autoHidden')}</Badge>}
            {state.data.resolvedAt === null && state.data.status !== 'resolved' && (
              <SlaBadge reading={readSla(state.data.slaDueAt, now, INTL_LOCALE[locale])} t={t} />
            )}
          </div>
          <CaseDetailActions key={state.data.id} data={state.data} refresh={refresh} />
          <CaseFactsSection data={state.data} t={t} />
          <TargetSection data={state.data} t={t} locale={locale} />
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-4">
              <OwnerSection owner={state.data.owner} canOpenUser={canOpenUser} t={t} />
              <HistorySection data={state.data} t={t} />
            </div>
            <ReportsSection data={state.data} t={t} />
          </div>
        </>
      )}
    </div>
  );
}
