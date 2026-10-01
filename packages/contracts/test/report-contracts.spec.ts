import { describe, expect, it } from 'vitest';
import {
  AdminModerationQueueItem,
  AdminModerationQueueQuery,
  AdminModerationTarget,
  AssignCaseBody,
  ChangeCaseSeverityBody,
  DecideCaseBody,
  ModerationActionType,
  ModerationCaseNumber,
} from '../src/admin-moderation';
import {
  CreateReportBody,
  CreateReportResponse,
  ModerationSeverity,
  MyReportItem,
  MyReportsResponse,
  ReportIdempotencyKey,
  ReportReason,
  ReportReasonGroup,
  ReportTargetType,
} from '../src/report';

const id = '3f2c1b7e-5a4d-4c1e-9b0a-1a2b3c4d5e6f';
const now = '2026-10-01T00:00:00.000Z';
const note = 'Confirmed the listing asks for a deposit via QR.';

describe('vocabulary mirrors the 0012 DDL', () => {
  it('has 30 reasons, 12 groups, 4 targets, 4 severities in queue order', () => {
    expect(ReportReason.options).toHaveLength(30);
    expect(ReportReasonGroup.options).toHaveLength(12);
    expect(ReportTargetType.options).toEqual(['user', 'event', 'post', 'comment']);
    expect(ModerationSeverity.options).toEqual(['critical', 'high', 'normal', 'low']);
    expect(ModerationActionType.options).toContain('content_removed');
  });
});

describe('CreateReportBody', () => {
  const valid = { targetType: 'event', targetId: id, reasonGroup: 'spam' };

  it('accepts a body without description', () => {
    expect(CreateReportBody.parse(valid)).toEqual(valid);
  });

  it('trims the description and treats blank as absent', () => {
    expect(CreateReportBody.parse({ ...valid, description: '  it is spam  ' }).description).toBe(
      'it is spam',
    );
    expect(CreateReportBody.parse({ ...valid, description: '   ' }).description).toBeUndefined();
  });

  it('enforces the 2000 character cap after trimming', () => {
    expect(CreateReportBody.safeParse({ ...valid, description: 'x'.repeat(2000) }).success).toBe(true);
    expect(CreateReportBody.safeParse({ ...valid, description: 'x'.repeat(2001) }).success).toBe(false);
    expect(
      CreateReportBody.safeParse({ ...valid, description: ` ${'x'.repeat(2000)} ` }).success,
    ).toBe(true);
  });

  it('is strict: no client snapshot, no idempotency key, no severity in the body', () => {
    for (const extra of [
      { evidenceSnapshot: {} },
      { idempotencyKey: id },
      { severity: 'critical' },
      { reasonCode: 'physical_threat' },
    ])
      expect(CreateReportBody.safeParse({ ...valid, ...extra }).success).toBe(false);
  });

  it('rejects bad enum values and ids', () => {
    expect(CreateReportBody.safeParse({ ...valid, targetType: 'message' }).success).toBe(false);
    expect(CreateReportBody.safeParse({ ...valid, reasonGroup: 'physical_threat' }).success).toBe(false);
    expect(CreateReportBody.safeParse({ ...valid, targetId: 'abc' }).success).toBe(false);
    expect(CreateReportBody.safeParse({ targetType: 'event' }).success).toBe(false);
  });
});

describe('Idempotency-Key', () => {
  it('must be a uuid', () => {
    expect(ReportIdempotencyKey.safeParse(id).success).toBe(true);
    expect(ReportIdempotencyKey.safeParse('not-a-key').success).toBe(false);
  });
});

describe('report responses', () => {
  it('CreateReportResponse carries reportId and public status only', () => {
    expect(CreateReportResponse.parse({ reportId: id, status: 'received' })).toEqual({
      reportId: id,
      status: 'received',
    });
    expect(CreateReportResponse.safeParse({ reportId: id, status: 'open' }).success).toBe(false);
  });

  it('MyReportItem drops caseId, reported handle and moderator instead of passing them', () => {
    const parsed = MyReportItem.parse({
      id,
      targetType: 'post',
      reasonGroup: 'scam',
      status: 'reviewing',
      createdAt: now,
      caseId: id,
      reportedHandle: 'bad_actor',
      moderator: { handle: 'mod' },
    });
    expect(Object.keys(parsed).toSorted()).toEqual(['createdAt', 'id', 'reasonGroup', 'status', 'targetType']);
  });

  it('MyReportsResponse is a cursor page and rejects non-UTC-ISO times', () => {
    expect(MyReportsResponse.safeParse({ items: [], nextCursor: null }).success).toBe(true);
    expect(
      MyReportItem.safeParse({ id, targetType: 'post', reasonGroup: 'scam', status: 'received', createdAt: '2026-10-01' })
        .success,
    ).toBe(false);
  });
});

describe('AdminModerationQueueQuery', () => {
  it('applies defaults and parses CSV filters', () => {
    const q = AdminModerationQueueQuery.parse({ severity: 'critical,high', targetType: 'event', overdue: 'true' });
    expect(q.severity).toEqual(['critical', 'high']);
    expect(q.targetType).toEqual(['event']);
    expect(q.overdue).toBe(true);
    expect(q.assignee).toBe('any');
    expect(q.limit).toBe(25);
  });

  it('only lists open and in_review', () => {
    expect(AdminModerationQueueQuery.safeParse({ status: 'open,in_review' }).success).toBe(true);
    expect(AdminModerationQueueQuery.safeParse({ status: 'resolved' }).success).toBe(false);
  });

  it('is strict and bounded', () => {
    expect(AdminModerationQueueQuery.safeParse({ sort: 'severity' }).success).toBe(false);
    expect(AdminModerationQueueQuery.safeParse({ limit: '101' }).success).toBe(false);
    expect(AdminModerationQueueQuery.safeParse({ overdue: 'yes' }).success).toBe(false);
    expect(AdminModerationQueueQuery.safeParse({ assignee: 'someone' }).success).toBe(false);
  });
});

describe('AdminModerationQueueItem', () => {
  const item = {
    id,
    caseNumber: 1042,
    targetType: 'event',
    targetId: id,
    targetExcerpt: 'Sunset yoga',
    severity: 'high',
    status: 'open',
    reportCount: 2,
    firstReportedAt: now,
    slaDueAt: now,
    slaState: 'due_soon',
    assignee: null,
    autoHidden: false,
  };

  it('accepts a valid row', () => {
    expect(AdminModerationQueueItem.safeParse(item).success).toBe(true);
  });

  it('rejects an unknown sla state and a zero report count', () => {
    expect(AdminModerationQueueItem.safeParse({ ...item, slaState: 'late' }).success).toBe(false);
    expect(AdminModerationQueueItem.safeParse({ ...item, reportCount: 0 }).success).toBe(false);
  });
});

describe('AdminModerationTarget snapshot (D-M17 whitelist)', () => {
  const state = { id, currentStatus: 'published', currentExcerpt: 'x' };
  const snapshots = {
    event: { title: 'Yoga', description: null, startsAt: now, endsAt: null, areaId: id },
    post: { body: 'hello' },
    comment: { body: 'hello' },
    user: { handle: 'an', displayName: 'An', headline: null, bio: 'hi', avatarUrl: null },
  } as const;

  it.each(Object.keys(snapshots))('accepts a valid %s snapshot', (type) => {
    const snapshot = snapshots[type as keyof typeof snapshots];
    expect(AdminModerationTarget.safeParse({ ...state, type, snapshot }).success).toBe(true);
  });

  it.each(Object.keys(snapshots))('rejects unknown and contact keys in a %s snapshot', (type) => {
    const snapshot = snapshots[type as keyof typeof snapshots];
    for (const extra of [{ email: 'a@b.co' }, { phone: '1' }, { contactEmail: 'a@b.co' }, { x: 1 }])
      expect(
        AdminModerationTarget.safeParse({ ...state, type, snapshot: { ...snapshot, ...extra } }).success,
      ).toBe(false);
  });

  it('rejects a snapshot of the wrong type and a missing field', () => {
    expect(AdminModerationTarget.safeParse({ ...state, type: 'post', snapshot: snapshots.user }).success).toBe(false);
    expect(AdminModerationTarget.safeParse({ ...state, type: 'user', snapshot: { handle: 'an' } }).success).toBe(false);
    expect(AdminModerationTarget.safeParse({ ...state, type: 'message', snapshot: {} }).success).toBe(false);
  });

  it('does not reject legitimate content that merely contains words like phone or token', () => {
    const snapshot = { body: 'phoneVisible microphone tokenCount' };
    expect(AdminModerationTarget.safeParse({ ...state, type: 'post', snapshot }).success).toBe(true);
  });
});

describe('DecideCaseBody', () => {
  const base = {
    actionType: 'content_hidden',
    reasonCode: 'financial_scam',
    reasonNote: note,
    confirm: true,
  };

  it('accepts a valid decision and defaults closeCase to true', () => {
    expect(DecideCaseBody.parse(base).closeCase).toBe(true);
  });

  it('trims the note and requires 20 characters after trimming', () => {
    expect(DecideCaseBody.safeParse({ ...base, reasonNote: 'x'.repeat(20) }).success).toBe(true);
    expect(DecideCaseBody.safeParse({ ...base, reasonNote: 'x'.repeat(19) }).success).toBe(false);
    expect(DecideCaseBody.safeParse({ ...base, reasonNote: `   ${'x'.repeat(19)}   ` }).success).toBe(false);
    expect(DecideCaseBody.safeParse({ ...base, reasonNote: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('requires confirm literally true', () => {
    expect(DecideCaseBody.safeParse({ ...base, confirm: false }).success).toBe(false);
    const { confirm: _omit, ...withoutConfirm } = base;
    expect(DecideCaseBody.safeParse(withoutConfirm).success).toBe(false);
  });

  it('requires expiresAt for suspended and forbids it otherwise', () => {
    const suspend = { ...base, actionType: 'suspended' };
    expect(DecideCaseBody.safeParse(suspend).success).toBe(false);
    expect(DecideCaseBody.safeParse({ ...suspend, expiresAt: '2026-10-08T00:00:00.000Z' }).success).toBe(true);
    expect(DecideCaseBody.safeParse({ ...suspend, expiresAt: 'tomorrow' }).success).toBe(false);
    expect(DecideCaseBody.safeParse({ ...base, expiresAt: '2026-10-08T00:00:00.000Z' }).success).toBe(false);
  });

  it('refuses banned and severity_changed as a decision, and unknown keys', () => {
    expect(DecideCaseBody.safeParse({ ...base, actionType: 'banned' }).success).toBe(false);
    expect(DecideCaseBody.safeParse({ ...base, actionType: 'severity_changed' }).success).toBe(false);
    expect(DecideCaseBody.safeParse({ ...base, strikeWeight: 5 }).success).toBe(false);
  });

  it('allows resolutionCode only when closing', () => {
    expect(DecideCaseBody.safeParse({ ...base, resolutionCode: 'duplicate' }).success).toBe(true);
    expect(DecideCaseBody.safeParse({ ...base, closeCase: false, resolutionCode: 'duplicate' }).success).toBe(false);
    expect(DecideCaseBody.safeParse({ ...base, resolutionCode: 'banned' }).success).toBe(false);
  });
});

describe('DecideCaseBody contradictions', () => {
  const base = { reasonCode: 'financial_scam', reasonNote: note, confirm: true };

  it('rejects dismiss with violation_confirmed', () => {
    expect(
      DecideCaseBody.safeParse({ ...base, actionType: 'no_action', resolutionCode: 'violation_confirmed' }).success,
    ).toBe(false);
  });

  it.each(['content_hidden', 'content_removed', 'warning'])('rejects %s with no_violation', (actionType) => {
    expect(DecideCaseBody.safeParse({ ...base, actionType, resolutionCode: 'no_violation' }).success).toBe(false);
  });

  it('rejects suspended with no_violation', () => {
    expect(
      DecideCaseBody.safeParse({
        ...base,
        actionType: 'suspended',
        expiresAt: '2026-10-08T00:00:00.000Z',
        resolutionCode: 'no_violation',
      }).success,
    ).toBe(false);
  });

  it('accepts consistent pairs', () => {
    expect(DecideCaseBody.safeParse({ ...base, actionType: 'no_action', resolutionCode: 'no_violation' }).success).toBe(true);
    expect(DecideCaseBody.safeParse({ ...base, actionType: 'no_action', resolutionCode: 'malicious_report' }).success).toBe(true);
    expect(DecideCaseBody.safeParse({ ...base, actionType: 'warning', resolutionCode: 'violation_confirmed' }).success).toBe(true);
  });
});

describe('severity and assign bodies', () => {
  it('ChangeCaseSeverityBody needs a severity and a 20 character note', () => {
    expect(ChangeCaseSeverityBody.safeParse({ severity: 'low', reasonNote: note }).success).toBe(true);
    expect(ChangeCaseSeverityBody.safeParse({ severity: 'urgent', reasonNote: note }).success).toBe(false);
    expect(ChangeCaseSeverityBody.safeParse({ severity: 'low', reasonNote: 'short' }).success).toBe(false);
    expect(ChangeCaseSeverityBody.safeParse({ severity: 'low', reasonNote: note, x: 1 }).success).toBe(false);
  });

  it('AssignCaseBody is empty (self) or names an uuid', () => {
    expect(AssignCaseBody.safeParse({}).success).toBe(true);
    expect(AssignCaseBody.safeParse({ assigneeId: id }).success).toBe(true);
    expect(AssignCaseBody.safeParse({ assigneeId: 'me' }).success).toBe(false);
    expect(AssignCaseBody.safeParse({ assignee: id }).success).toBe(false);
  });
});

describe('ModerationCaseNumber', () => {
  it('coerces a positive integer path parameter', () => {
    expect(ModerationCaseNumber.parse('1042')).toBe(1042);
    for (const bad of ['0', '-1', '1.5', 'abc', '', '1e3', '0x10', '007', ' 7 ', '9007199254740993'])
      expect(ModerationCaseNumber.safeParse(bad).success, bad).toBe(false);
  });
});
