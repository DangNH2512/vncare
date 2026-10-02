import type { AdminEventDetailResponseT, EventStatusT, UserRoleT } from '@dnc/contracts';
import { allowedRolesFor } from '@dnc/domain';

export interface EventActionActor {
  id: string;
  role: UserRoleT;
}

export interface EventActionAvailability {
  suspend: boolean;
  restore: boolean;
  takeDown: boolean;
}

const SUSPENDABLE: readonly EventStatusT[] = ['published', 'pending_review'];
const TAKEDOWNABLE: readonly EventStatusT[] = ['published', 'pending_review', 'suspended'];

/**
 * Which actions get a button on this event's page (D-R16).
 *
 * A button that cannot succeed is left out of the DOM. This only mirrors the
 * API rules, which stay the real gate: suspend and restore need `content.hide`,
 * take down needs `event.takedown`, and a moderator cannot act on an event
 * they organize. Draft, cancelled and taken-down events have no action.
 */
export function availableEventActions(
  actor: EventActionActor,
  event: Pick<AdminEventDetailResponseT, 'status' | 'host'>,
): EventActionAvailability {
  const mayHide = allowedRolesFor('content.hide').includes(actor.role);
  const ownEvent = actor.role === 'moderator' && event.host.id === actor.id;
  const canHide = mayHide && !ownEvent;
  return {
    suspend: canHide && SUSPENDABLE.includes(event.status),
    restore: canHide && event.status === 'suspended',
    takeDown: allowedRolesFor('event.takedown').includes(actor.role) && TAKEDOWNABLE.includes(event.status),
  };
}
