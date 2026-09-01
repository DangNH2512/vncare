'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { AREAS, areaName, type AreaSlug } from '../_lib/areas';
import {
  formatEventDate,
  formatEventTime,
  formatEventTimeRange,
  dayOffsetFrom,
  toDateTimeAttribute,
} from '../_lib/datetime';
import {
  MOCK_EVENTS,
  eventsByStartTime,
  eventTitle,
  formatPriceVnd,
  isAlmostFull,
  isFull,
  seatsLeft,
  type MockEvent,
} from '../_lib/mock-data';
import { useLocale, useTranslate } from './locale-provider';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  Input,
  Select,
  Skeleton,
  SkeletonText,
  Stack,
  TrustBadge,
  type TrustLevel,
} from './ui';

const TRUST_LEVELS: readonly TrustLevel[] = [0, 1, 2, 3, 4, 5];

function SectionHeading({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h2 className="font-display text-xl font-bold text-fg sm:text-xxl">{children}</h2>
      {note !== undefined && <p className="max-w-[56ch] text-sm text-fg-muted">{note}</p>}
    </div>
  );
}

/**
 * Scaffold-only rendering of one feed item.
 *
 * It exists to prove the primitives, the date helpers and the Vietnamese copy
 * hold together; the production event card is owned by the feed screen and will
 * replace it.
 */
function PreviewEventRow({ event, index }: { event: MockEvent; index: number }) {
  const t = useTranslate();
  const { locale } = useLocale();
  const area = AREAS.find((candidate) => candidate.slug === event.areaSlug);
  const left = seatsLeft(event);
  const offset = dayOffsetFrom(event.startsAt);

  return (
    <Card
      as="article"
      interactive
      padding="md"
      className="animate-rise"
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
    >
      <div className="flex min-w-0 gap-4">
        {/* Date rail: the one deliberate break from the grid, so a glance down the feed reads as a calendar. */}
        <time
          dateTime={toDateTimeAttribute(event.startsAt)}
          className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-surface-sunken py-2 text-center"
        >
          <span className="text-xs font-light tracking-[0.14em] text-fg-subtle uppercase">
            {formatEventDate(event.startsAt, locale).split(' ')[0]}
          </span>
          <span className="text-lg font-bold text-fg tabular-nums">
            {formatEventTime(event.startsAt, locale)}
          </span>
        </time>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="truncate text-xs font-light tracking-[0.14em] text-fg-subtle uppercase">
            {area === undefined ? '' : areaName(area, locale)} ·{' '}
            {formatEventTimeRange(event.startsAt, event.endsAt, locale)}
          </p>

          <h3 className="text-md font-bold text-balance text-fg sm:text-lg">
            {eventTitle(event, locale)}
          </h3>

          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Avatar name={event.hostName} size="sm" />
            <span className="min-w-0 truncate text-sm text-fg-muted">
              {t('event.card.hostedBy', { name: event.hostName })}
            </span>
            <TrustBadge level={event.hostTrustLevel} variant="compact" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {offset === 0 && <Badge tone="sun">{t('event.card.startingSoon')}</Badge>}
            {isFull(event) ? (
              <Badge tone="danger">{t('event.detail.full')}</Badge>
            ) : (
              <Badge tone={isAlmostFull(event) ? 'warning' : 'success'}>
                {isAlmostFull(event)
                  ? t('event.card.almostFull')
                  : t('event.detail.seatsLeft', { count: left })}
              </Badge>
            )}
            <Badge tone={event.priceVnd === 0 ? 'accent' : 'neutral'}>
              {event.priceVnd === 0
                ? t('common.free')
                : t('event.card.price', { amount: formatPriceVnd(event.priceVnd, locale) })}
            </Badge>
            {event.requiredTrustLevel > 0 && (
              <Badge tone="neutral">
                {t('event.requiredTrust', { level: event.requiredTrustLevel })}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Live proof that the foundation works: the area filter, the mock feed, the
 * date and money helpers, and every primitive in both locales and both themes.
 */
export function FoundationPreview() {
  const t = useTranslate();
  const { locale } = useLocale();
  const [selectedArea, setSelectedArea] = useState<AreaSlug | null>(null);

  const visible = useMemo(() => {
    const matching =
      selectedArea === null
        ? MOCK_EVENTS
        : MOCK_EVENTS.filter((event) => event.areaSlug === selectedArea);
    return eventsByStartTime(matching);
  }, [selectedArea]);

  const selected = AREAS.find((area) => area.slug === selectedArea);
  const emptyAreaName = selected === undefined ? '' : areaName(selected, locale);

  return (
    <Stack gap={12}>
      <Stack gap={4}>
        <SectionHeading note={t('datetime.timeZoneNote')}>{t('nav.events')}</SectionHeading>

        <ChipRow aria-label={t('area.label')}>
          <Chip selected={selectedArea === null} onClick={() => setSelectedArea(null)}>
            {t('area.all')}
          </Chip>
          {AREAS.map((area) => (
            <Chip
              key={area.slug}
              selected={selectedArea === area.slug}
              count={MOCK_EVENTS.filter((event) => event.areaSlug === area.slug).length}
              onClick={() => setSelectedArea(area.slug)}
            >
              {areaName(area, locale)}
            </Chip>
          ))}
        </ChipRow>

        {visible.length === 0 ? (
          <EmptyState
            title={t('event.empty.title', { area: emptyAreaName })}
            description={t('event.empty.description')}
            action={<Button>{t('event.empty.cta')}</Button>}
            secondaryAction={
              <Button variant="secondary" onClick={() => setSelectedArea(null)}>
                {t('event.empty.resetFilter')}
              </Button>
            }
          />
        ) : (
          <ul className="grid list-none grid-cols-1 gap-3 lg:grid-cols-2">
            {visible.map((event, index) => (
              <li key={event.id} className="min-w-0">
                <PreviewEventRow event={event} index={index} />
              </li>
            ))}
          </ul>
        )}
      </Stack>

      <Stack gap={6}>
        <SectionHeading note={t('home.componentsNote')}>
          {t('home.componentsHeading')}
        </SectionHeading>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card padding="lg">
            <Stack gap={3}>
              <p className="text-xs font-light tracking-[0.14em] text-fg-subtle uppercase">
                Button
              </p>
              <Stack direction="row" gap={2} align="center">
                <Button>{t('event.detail.rsvpButton')}</Button>
                <Button variant="secondary">{t('event.detail.joinWaitlistButton')}</Button>
                <Button variant="ghost" size="sm">
                  {t('common.seeAll')}
                </Button>
                <Button variant="danger" size="sm">
                  {t('a11y.clearFilter')}
                </Button>
              </Stack>
              <Button fullWidth size="lg">
                {t('nav.createEvent')}
              </Button>
            </Stack>
          </Card>

          <Card padding="lg">
            <Stack gap={3}>
              <p className="text-xs font-light tracking-[0.14em] text-fg-subtle uppercase">
                TrustBadge
              </p>
              <Stack direction="row" gap={2}>
                {TRUST_LEVELS.map((level) => (
                  <TrustBadge key={level} level={level} />
                ))}
              </Stack>
              <Stack direction="row" gap={3} align="center">
                <Avatar name="Trần Minh Quân" size="lg" />
                <Avatar name="Sophie Laurent" />
                <Avatar name="Kenji Watanabe" size="sm" />
              </Stack>
            </Stack>
          </Card>

          <Card padding="lg">
            <Stack gap={3}>
              <p className="text-xs font-light tracking-[0.14em] text-fg-subtle uppercase">
                Badge
              </p>
              <Stack direction="row" gap={2}>
                <Badge tone="success">{t('event.detail.seatsLeft', { count: 6 })}</Badge>
                <Badge tone="warning">{t('event.card.almostFull')}</Badge>
                <Badge tone="danger">{t('event.detail.full')}</Badge>
                <Badge tone="sun">{t('event.card.startingSoon')}</Badge>
                <Badge tone="accent">{t('common.free')}</Badge>
                <Badge>{t('event.status.pendingReview')}</Badge>
              </Stack>
              <Stack gap={2}>
                <SkeletonText lines={2} />
                <Stack direction="row" gap={2} align="center">
                  <Skeleton shape="circle" className="size-11" />
                  <Skeleton shape="block" className="h-11 flex-1" />
                </Stack>
              </Stack>
            </Stack>
          </Card>

          <Card padding="lg">
            <Stack gap={3}>
              <p className="text-xs font-light tracking-[0.14em] text-fg-subtle uppercase">
                Input · Select
              </p>
              <Input
                label={t('nav.events')}
                placeholder={t('event.card.hostedBy', { name: 'Marta' })}
                hint={t('home.route.feedDescription')}
              />
              <Select label={t('area.label')} defaultValue="">
                <option value="">{t('area.all')}</option>
                {AREAS.map((area) => (
                  <option key={area.slug} value={area.slug}>
                    {areaName(area, locale)}
                  </option>
                ))}
              </Select>
            </Stack>
          </Card>
        </div>

        <EmptyState
          title={t('event.empty.title', {
            area: AREAS[0] === undefined ? '' : areaName(AREAS[0], locale),
          })}
          description={t('event.empty.description')}
          action={<Button>{t('event.empty.cta')}</Button>}
        />
      </Stack>
    </Stack>
  );
}
