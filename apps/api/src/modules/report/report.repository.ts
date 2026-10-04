import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type {
  ModerationSeverityT,
  ReportReasonT,
  ReportTargetTypeT,
} from '@dnc/contracts';
import { PG_POOL } from '../../database/database.module.js';
import { withTransaction } from '../../common/db/transaction.js';

/** What the reporter is told about a report: that it exists, and when. */
export interface ReportRow {
  id: string;
  created_at: Date;
}

export interface OpenReportRow extends ReportRow {
  ticket_id: string;
  severity: ModerationSeverityT;
}

/**
 * A reportable target as it is right now, resolved for a member.
 *
 * `snapshot` is the evidence copy stored on the report, camelCase, in the
 * per-type shape documented on `reports.content_snapshot` (0009). The
 * moderation mapper reads it back; this file is its only writer.
 */
export interface ReportTarget {
  ownerUserId: string;
  /** Organizer of the event a reported comment sits on (conflict of interest, INV-4). */
  relatedEventOrganizerId: string | null;
  snapshot: Record<string, unknown>;
}

export interface ReportWindow {
  count: number;
  /** Seconds until the report that frees the next slot leaves the window; at least 1. */
  retryAfterSeconds: number;
}

export interface TicketUpsertInput {
  targetType: ReportTargetTypeT;
  targetId: string;
  ownerUserId: string;
  relatedEventOrganizerId: string | null;
  severity: ModerationSeverityT;
  slaHours: number;
}

export interface ReportInsertInput {
  ticketId: string;
  reporterUserId: string;
  targetType: ReportTargetTypeT;
  targetId: string;
  ownerUserId: string;
  reason: ReportReasonT;
  severity: ModerationSeverityT;
  description: string | null;
  alsoBlocked: boolean;
  snapshot: Record<string, unknown>;
  idempotencyKey: string;
}

interface EventTargetRow {
  owner_user_id: string;
  title: string;
  description: string | null;
  status: string;
  starts_at: Date | null;
}

interface PostTargetRow {
  owner_user_id: string;
  body: string;
  kind: string;
  media_ids: string[];
  status: string;
}

interface CommentTargetRow {
  owner_user_id: string;
  body: string;
  post_id: string | null;
  event_id: string | null;
  status: string;
  related_event_organizer_id: string | null;
}

interface UserTargetRow {
  owner_user_id: string;
  handle: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
}

/**
 * One-way block test against the reporter bound at `$2`: true when the person
 * in `ownerColumn` has NOT blocked the reporter. `ownerColumn` is always a
 * constant column reference written in this file, never request data.
 */
function ownerHasNotBlocked(ownerColumn: string): string {
  return `NOT EXISTS (SELECT 1 FROM blocks ob
                       WHERE ob.blocker_user_id = ${ownerColumn}
                         AND ob.blocked_user_id = $2::uuid)`;
}

/**
 * Reports and the tickets they merge into.
 *
 * Target resolution honours a block in one direction only: a member who
 * blocked someone must still be able to report them (AC-7) — reporting is the
 * safety channel and never depends on the reporter's own block list — while a
 * target whose owner blocked the reporter is invisible to them here exactly as
 * everywhere else (review CR-1). It applies the ordinary public-visibility
 * rules, so nothing can be reported that the reporter could not have seen.
 */
@Injectable()
export class ReportRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  transaction<T>(work: (tx: PoolClient) => Promise<T>): Promise<T> {
    return withTransaction(this.pool, work);
  }

  /**
   * Serialises one reporter's submissions for the rest of the transaction.
   *
   * Counting the sliding window and then inserting is a read-then-write; two
   * parallel submits would both see four reports and both insert a fifth.
   * The lock is per reporter, so different members never wait on each other.
   */
  async lockReporter(tx: PoolClient, reporterUserId: string): Promise<void> {
    await tx.query(`SELECT pg_advisory_xact_lock(hashtextextended('report:' || $1::text, 0))`, [
      reporterUserId,
    ]);
  }

  async findByIdempotencyKey(
    tx: PoolClient,
    reporterUserId: string,
    idempotencyKey: string,
  ): Promise<ReportRow | null> {
    const { rows } = await tx.query<ReportRow>(
      `SELECT id, created_at FROM reports
        WHERE reporter_user_id = $1 AND idempotency_key = $2`,
      [reporterUserId, idempotencyKey],
    );
    return rows[0] ?? null;
  }

  /**
   * The reporter's gravest still-open report on this target, if any. Since
   * 0010 a person may hold one open report per severity level on a target
   * (escalation, FU-4); the gravest decides whether a new one is a duplicate.
   */
  async findOpenForTarget(
    tx: PoolClient,
    reporterUserId: string,
    targetType: ReportTargetTypeT,
    targetId: string,
  ): Promise<OpenReportRow | null> {
    const { rows } = await tx.query<OpenReportRow>(
      `SELECT id, created_at, ticket_id, severity FROM reports
        WHERE reporter_user_id = $1
          AND target_type = $2::report_target_type_enum
          AND target_id = $3
          AND status = 'open'
        ORDER BY severity DESC
        LIMIT 1`,
      [reporterUserId, targetType, targetId],
    );
    return rows[0] ?? null;
  }

  /**
   * Resolves a target a member could see and takes its evidence snapshot.
   *
   * Visible means: event `published`, post and comment `visible` (a comment
   * also needs its post or event visible), account not deleted with a
   * profile — the same rule as the public profile page, so a suspended or
   * deactivated account is reportable and a 404 never reveals its status
   * (review CR-3). Never soft deleted.
   *
   * Blocks count in one direction only (review CR-1): when the owner has
   * blocked the reporter, the target is as invisible here as everywhere else,
   * so this endpoint cannot be used to detect the block. The reporter having
   * blocked the owner changes nothing (AC-7). The shared helpers in
   * common/db/block-filter.ts test both directions at once, which is exactly
   * what AC-7 forbids here, hence the one-way predicate below.
   *
   * Anything else answers null, which the caller turns into the same 404 as a
   * target that never existed.
   */
  async resolveTarget(
    tx: PoolClient,
    reporterUserId: string,
    targetType: ReportTargetTypeT,
    targetId: string,
  ): Promise<ReportTarget | null> {
    switch (targetType) {
      case 'event': {
        const { rows } = await tx.query<EventTargetRow>(
          `SELECT e.organizer_id AS owner_user_id, e.title, e.description, e.status::text AS status,
                  (SELECT min(o.starts_at) FROM event_occurrences o
                    WHERE o.event_id = e.id AND o.deleted_at IS NULL) AS starts_at
             FROM events e
            WHERE e.id = $1 AND e.deleted_at IS NULL AND e.status = 'published'
              AND ${ownerHasNotBlocked('e.organizer_id')}`,
          [targetId, reporterUserId],
        );
        const row = rows[0];
        if (!row) return null;
        return {
          ownerUserId: row.owner_user_id,
          relatedEventOrganizerId: null,
          snapshot: {
            title: row.title,
            description: row.description,
            status: row.status,
            startsAt: row.starts_at?.toISOString() ?? null,
          },
        };
      }
      case 'post': {
        const { rows } = await tx.query<PostTargetRow>(
          `SELECT p.author_user_id AS owner_user_id, p.body, p.kind::text AS kind,
                  p.media_ids::text[] AS media_ids, p.status::text AS status
             FROM posts p
            WHERE p.id = $1 AND p.deleted_at IS NULL AND p.status = 'visible'
              AND ${ownerHasNotBlocked('p.author_user_id')}`,
          [targetId, reporterUserId],
        );
        const row = rows[0];
        if (!row) return null;
        return {
          ownerUserId: row.owner_user_id,
          relatedEventOrganizerId: null,
          snapshot: { body: row.body, kind: row.kind, mediaIds: row.media_ids, status: row.status },
        };
      }
      case 'comment': {
        const { rows } = await tx.query<CommentTargetRow>(
          `SELECT c.user_id AS owner_user_id, c.body, c.post_id, c.event_id,
                  c.status::text AS status, ev.organizer_id AS related_event_organizer_id
             FROM comments c
             LEFT JOIN posts p ON p.id = c.post_id
             LEFT JOIN events ev ON ev.id = c.event_id
            WHERE c.id = $1
              AND c.deleted_at IS NULL AND c.status = 'visible'
              AND (c.post_id IS NULL OR (p.deleted_at IS NULL AND p.status = 'visible'))
              AND (c.event_id IS NULL OR (ev.deleted_at IS NULL AND ev.status = 'published'))
              -- The thread owner counts too: a comment on a post or event of
              -- someone who blocked the reporter is not visible to them.
              AND ${ownerHasNotBlocked('c.user_id')}
              AND ${ownerHasNotBlocked('p.author_user_id')}
              AND ${ownerHasNotBlocked('ev.organizer_id')}`,
          [targetId, reporterUserId],
        );
        const row = rows[0];
        if (!row) return null;
        return {
          ownerUserId: row.owner_user_id,
          relatedEventOrganizerId: row.related_event_organizer_id,
          snapshot: {
            body: row.body,
            postId: row.post_id,
            eventId: row.event_id,
            status: row.status,
          },
        };
      }
      case 'user': {
        const { rows } = await tx.query<UserTargetRow>(
          `SELECT u.id AS owner_user_id, p.handle::text AS handle, p.display_name,
                  p.headline, p.bio
             FROM users u
             JOIN profiles p ON p.user_id = u.id
            WHERE u.id = $1 AND u.deleted_at IS NULL AND u.status <> 'deleted'
              AND ${ownerHasNotBlocked('u.id')}`,
          [targetId, reporterUserId],
        );
        const row = rows[0];
        if (!row) return null;
        return {
          ownerUserId: row.owner_user_id,
          relatedEventOrganizerId: null,
          snapshot: {
            handle: row.handle,
            displayName: row.display_name,
            headline: row.headline,
            bio: row.bio,
          },
        };
      }
    }
  }

  /**
   * Reports this reporter filed in the sliding window, and how long until one
   * more is allowed: the moment the report that would free the next slot ages
   * out. Computed on the database clock, like every other time in this flow.
   */
  async recentWindow(
    tx: PoolClient,
    reporterUserId: string,
    limit: number,
    windowHours: number,
  ): Promise<ReportWindow> {
    const { rows } = await tx.query<{ count: number; retry_after_seconds: number | null }>(
      `SELECT count(*)::int AS count,
              ceil(extract(epoch FROM (
                (array_agg(created_at ORDER BY created_at ASC))[GREATEST(count(*) - $2 + 1, 1)::int]
                + make_interval(hours => $3) - now())))::int AS retry_after_seconds
         FROM reports
        WHERE reporter_user_id = $1
          AND created_at > now() - make_interval(hours => $3)`,
      [reporterUserId, limit, windowHours],
    );
    const row = rows[0];
    return {
      count: row?.count ?? 0,
      retryAfterSeconds: Math.max(1, row?.retry_after_seconds ?? 1),
    };
  }

  /**
   * Folds an escalation report (FU-4) into its open ticket: the same merge
   * rule as the upsert — severity only ever up, deadline only ever earlier —
   * but `report_count` stays, because it counts people and this is the same
   * person reporting again.
   */
  async raiseTicket(
    tx: PoolClient,
    ticketId: string,
    severity: ModerationSeverityT,
    slaHours: number,
  ): Promise<void> {
    await tx.query(
      `UPDATE moderation_tickets SET
         severity         = GREATEST(severity, $2::moderation_severity_enum),
         sla_due_at       = LEAST(sla_due_at, now() + make_interval(hours => $3)),
         last_reported_at = now(),
         updated_at       = now()
       WHERE id = $1 AND status = 'open'`,
      [ticketId, severity, slaHours],
    );
  }

  /**
   * Opens a ticket for the target, or joins the open one (task board D8).
   *
   * One statement, so two first reports arriving together converge on a single
   * ticket through the partial unique index instead of racing. Merging only
   * raises severity and only pulls the deadline in; the deadline is computed by
   * the database clock, never the API host's.
   */
  async upsertTicket(tx: PoolClient, input: TicketUpsertInput): Promise<string> {
    const { rows } = await tx.query<{ id: string }>(
      `INSERT INTO moderation_tickets
         (target_type, target_id, target_owner_user_id, related_event_organizer_id,
          severity, first_reported_at, last_reported_at, sla_due_at)
       VALUES ($1::report_target_type_enum, $2, $3, $4, $5::moderation_severity_enum,
               now(), now(), now() + make_interval(hours => $6))
       ON CONFLICT (target_type, target_id) WHERE status = 'open' DO UPDATE SET
         severity         = GREATEST(moderation_tickets.severity, EXCLUDED.severity),
         sla_due_at       = LEAST(moderation_tickets.sla_due_at, EXCLUDED.sla_due_at),
         report_count     = moderation_tickets.report_count + 1,
         last_reported_at = EXCLUDED.last_reported_at,
         updated_at       = now()
       RETURNING id`,
      [
        input.targetType,
        input.targetId,
        input.ownerUserId,
        input.relatedEventOrganizerId,
        input.severity,
        input.slaHours,
      ],
    );
    return rows[0]?.id as string;
  }

  async insertReport(tx: PoolClient, input: ReportInsertInput): Promise<ReportRow> {
    const { rows } = await tx.query<ReportRow>(
      `INSERT INTO reports
         (ticket_id, reporter_user_id, target_type, target_id, target_owner_user_id,
          reason, severity, description, also_blocked, content_snapshot, idempotency_key)
       VALUES ($1, $2, $3::report_target_type_enum, $4, $5,
               $6::report_reason_enum, $7::moderation_severity_enum, $8, $9, $10::jsonb, $11)
       RETURNING id, created_at`,
      [
        input.ticketId,
        input.reporterUserId,
        input.targetType,
        input.targetId,
        input.ownerUserId,
        input.reason,
        input.severity,
        input.description,
        input.alsoBlocked,
        JSON.stringify(input.snapshot),
        input.idempotencyKey,
      ],
    );
    return rows[0] as ReportRow;
  }

  /**
   * "Also block this person": the same row the block endpoint writes, in the
   * report's transaction. Blocking someone already blocked is a no-op.
   */
  async blockOwner(tx: PoolClient, blockerUserId: string, blockedUserId: string): Promise<void> {
    await tx.query(
      `INSERT INTO blocks (blocker_user_id, blocked_user_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [blockerUserId, blockedUserId],
    );
  }
}
