import type { EventStatusT } from '@dnc/contracts';

import type { MessageKey, Translate } from '../../_lib/i18n';
import { Badge, type BadgeTone } from '../ui';
import { NO_VALUE } from './format';

/** Explicit maps: catalog keys mix snake_case and camelCase, so never interpolate them. */
export const EVENT_STATUS_LABEL_KEY: Readonly<Record<EventStatusT, MessageKey>> = {
  draft: 'admin.events.status.draft',
  pending_review: 'event.status.pendingReview',
  published: 'event.status.published',
  suspended: 'event.status.suspended',
  taken_down: 'event.status.takenDown',
  cancelled: 'event.status.cancelled',
};

const EVENT_STATUS_TONE: Readonly<Record<EventStatusT, BadgeTone>> = {
  draft: 'neutral',
  pending_review: 'warning',
  published: 'success',
  suspended: 'danger',
  taken_down: 'danger',
  cancelled: 'neutral',
};

/** Order of the status filter; `draft` stays last because the default list hides it. */
export const EVENT_STATUSES: readonly EventStatusT[] = [
  'pending_review',
  'published',
  'suspended',
  'taken_down',
  'cancelled',
  'draft',
];

function isEventStatus(value: string): value is EventStatusT {
  return (EVENT_STATUSES as readonly string[]).includes(value);
}

/** Status badge shared by the event screens and the user detail; an unknown status reads as a dash. */
export function EventStatusBadge({ status, t }: { status: string; t: Translate }) {
  if (!isEventStatus(status)) return <Badge>{NO_VALUE}</Badge>;
  return <Badge tone={EVENT_STATUS_TONE[status]}>{t(EVENT_STATUS_LABEL_KEY[status])}</Badge>;
}
