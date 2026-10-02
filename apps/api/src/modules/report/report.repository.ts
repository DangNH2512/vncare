import { Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import type { ModerationSeverityT, ReportReasonGroupT, ReportTargetTypeT } from '@dnc/contracts';
import { SLA_TTFR_MS } from '@dnc/domain';
import { decodeCursor } from '../../common/pagination.js';
import { withTransaction } from '../../common/db/transaction.js';
import { PG_POOL } from '../../database/database.module.js';

/** A pool or a transaction: reads work on either, writes always take a transaction. */
type Queryable = Pool | PoolClient;

/**
 * Content fields captured when a report arrives (D-M17). The shapes mirror the
 * strict whitelist per `type` in `AdminModerationTarget` (packages/contracts);
 * no contact field exists in any of them.
 */
export type ReportSnapshot =
  | {
      title: string;
      description: string | null;
      startsAt: string | null;
      endsAt: string | null;
      areaId: string | null;
    }
  | { body: string }
  | {
      handle: string;
      displayName: string;
      headline: string | null;
      bio: string | null;
      avatarUrl: string | null;
    };

/** The reported content as read under its row lock. */
export interface ReportTargetRow {
  type: ReportTargetTypeT;
  id: string;
  ownerUserId: string;
  /** `events.status`, `content_status_enum` or `user_status_enum`, by `type`. */
  status: string;
  relatedEventId: string | null;
  contentLocale: string | null;
  snapshot: ReportSnapshot;
}

/** Case state after a report was attached to it. `caseNumber` is a bigint, so a string. */
export interface ReportCaseRow {
  id: string;
  caseNumber: string;
  severity: ModerationSeverityT;
  reportCount: number;
  slaDueAt: Date;
  inserted: boolean;
}

/** What decides the status a reporter sees (D-M14). */
export interface ReportStatusRow {
  id: string;
  case_status: string;
  resolution_code: string | null;
  first_response_at: Date | null;
  report_status: string;
}

export interface MyReportRow extends ReportStatusRow {
  target_type: ReportTargetTypeT;
  reason_group: ReportReasonGroupT;
  created_at: Date;
}

export interface InsertReportInput {
  caseId: string;
  reporterUserId: string;
  reporterTrustLevel: number;
  target: ReportTargetRow;
  reasonGroup: ReportReasonGroupT;
  severity: ModerationSeverityT;
  description: string | null;
  idempotencyKey: string;
}

const STATUS_COLUMNS = `r.id, c.status::text AS case_status, c.resolution_code,
       c.first_response_at, r.status::text AS report_status`;

const iso = (value: Date | null): string | null => (value ? value.toISOString() : null);

/**
 * Data access of the report module: the only place that reads or writes
 * `reports` and `moderation_cases`, and the only code here that touches
 * `events`, `posts`, `comments` or `users` (by SQL, as the rsvp repository
 * does, so no other module gains a second path to those writes).
 *
 * Every write takes the caller's transaction so the target lock, the case
 * upsert, the report row, the auto-hide and the audit lines commit together.
 */
@Injectable()
export class ReportRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  transaction<T>(work: (tx: PoolClient) => Promise<T>): Promise<T> {
    return withTransaction(this.pool, work);
  }

  /**
   * Locks the reported row with `FOR NO KEY UPDATE` and reads what the rules
   * and the snapshot need. Soft-deleted and anonymised rows are not found.
   *
   * The lock is what serialises reporters of one target: the second reporter
   * waits here, then sees the first one's case, report and auto-hide. It does
   * not conflict with the `FOR KEY SHARE` of foreign-key checks.
   *
   * Lock order of the whole report transaction (every path must keep it):
   *   1. the reported row: `events` | `posts` | `comments` | `users`
   *      (a comment on a post: the parent `posts` row first, then the comment,
   *      because hiding it fires `sync_comment_counters`, which updates the
   *      parent `posts` and parent `comments` rows)
   *   2. `moderation_cases` (upsert)
   *   3. `reports`, then `audit_logs` (inserts)
   * The moderation decision (AD-15) must also take the target row before the case.
   */
  async lockTarget(
    tx: PoolClient,
    type: ReportTargetTypeT,
    id: string,
  ): Promise<ReportTargetRow | null> {
    switch (type) {
      case 'event':
        return this.lockEvent(tx, id);
      case 'post':
        return this.lockPost(tx, id);
      case 'comment':
        return this.lockComment(tx, id);
      case 'user':
        return this.lockUser(tx, id);
    }
  }

  private async lockEvent(tx: PoolClient, id: string): Promise<ReportTargetRow | null> {
    const { rows } = await tx.query<{
      id: string;
      owner_user_id: string;
      status: string;
      title: string;
      description: string | null;
      area_id: string | null;
      starts_at: Date | null;
      ends_at: Date | null;
    }>(
      `SELECT e.id, e.organizer_id AS owner_user_id, e.status::text AS status, e.title,
              e.description, e.area_id, o.starts_at, o.ends_at
         FROM events e
         LEFT JOIN LATERAL (
              SELECT starts_at, ends_at FROM event_occurrences
               WHERE event_id = e.id AND deleted_at IS NULL
               ORDER BY (starts_at < now()), starts_at
               LIMIT 1) o ON true
        WHERE e.id = $1 AND e.deleted_at IS NULL
          FOR NO KEY UPDATE OF e`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      type: 'event',
      id: row.id,
      ownerUserId: row.owner_user_id,
      status: row.status,
      relatedEventId: row.id,
      contentLocale: null,
      snapshot: {
        title: row.title,
        description: row.description,
        startsAt: iso(row.starts_at),
        endsAt: iso(row.ends_at),
        areaId: row.area_id,
      },
    };
  }

  private async lockPost(tx: PoolClient, id: string): Promise<ReportTargetRow | null> {
    const { rows } = await tx.query<{
      id: string;
      owner_user_id: string;
      status: string;
      related_event_id: string | null;
      body: string;
      locale: string | null;
    }>(
      `SELECT id, author_user_id AS owner_user_id, status::text AS status, related_event_id,
              body, body_locale AS locale
         FROM posts
        WHERE id = $1 AND deleted_at IS NULL
          FOR NO KEY UPDATE`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      type: 'post',
      id: row.id,
      ownerUserId: row.owner_user_id,
      status: row.status,
      relatedEventId: row.related_event_id,
      contentLocale: row.locale,
      snapshot: { body: row.body },
    };
  }

  private async lockComment(tx: PoolClient, id: string): Promise<ReportTargetRow | null> {
    // Parent post first, then the comment: the same direction as the
    // `sync_comment_counters` trigger (comment change -> posts row), so hiding a
    // thread root and one of its replies at the same time cannot deadlock.
    const parent = await tx.query<{ post_id: string | null }>(
      `SELECT post_id FROM comments WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    const postId = parent.rows[0]?.post_id;
    if (postId) await tx.query(`SELECT 1 FROM posts WHERE id = $1 FOR NO KEY UPDATE`, [postId]);
    const { rows } = await tx.query<{
      id: string;
      owner_user_id: string;
      status: string;
      related_event_id: string | null;
      body: string;
      locale: string | null;
    }>(
      `SELECT c.id, c.user_id AS owner_user_id, c.status::text AS status,
              COALESCE(c.event_id, p.related_event_id) AS related_event_id,
              c.body, c.body_locale AS locale
         FROM comments c
         LEFT JOIN posts p ON p.id = c.post_id
        WHERE c.id = $1 AND c.deleted_at IS NULL
          FOR NO KEY UPDATE OF c`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      type: 'comment',
      id: row.id,
      ownerUserId: row.owner_user_id,
      status: row.status,
      relatedEventId: row.related_event_id,
      contentLocale: row.locale,
      snapshot: { body: row.body },
    };
  }

  /**
   * The avatar is not captured: a media URL is a short-lived signed link, which
   * is useless as evidence, so `avatarUrl` is always null in a user snapshot.
   */
  private async lockUser(tx: PoolClient, id: string): Promise<ReportTargetRow | null> {
    const { rows } = await tx.query<{
      id: string;
      status: string;
      handle: string;
      display_name: string;
      headline: string | null;
      bio: string | null;
      locale: string | null;
    }>(
      `SELECT u.id, u.status::text AS status, p.handle::text AS handle, p.display_name,
              p.headline, p.bio, p.bio_locale AS locale
         FROM users u
         JOIN profiles p ON p.user_id = u.id
        WHERE u.id = $1 AND u.deleted_at IS NULL AND u.anonymized_at IS NULL
          FOR NO KEY UPDATE OF u`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      type: 'user',
      id: row.id,
      ownerUserId: row.id,
      status: row.status,
      relatedEventId: null,
      contentLocale: row.locale,
      snapshot: {
        handle: row.handle,
        displayName: row.display_name,
        headline: row.headline,
        bio: row.bio,
        avatarUrl: null,
      },
    };
  }

  /** Replay lookup before any transaction or rate-limit slot. */
  findReplay(reporterUserId: string, key: string): Promise<ReportStatusRow | null> {
    return this.findByIdempotencyKey(this.pool, reporterUserId, key);
  }

  /** Status inputs of the report this reporter already sent under this key, if any. */
  async findByIdempotencyKey(
    db: Queryable,
    reporterUserId: string,
    key: string,
  ): Promise<ReportStatusRow | null> {
    const { rows } = await db.query<ReportStatusRow>(
      `SELECT ${STATUS_COLUMNS}
         FROM reports r JOIN moderation_cases c ON c.id = r.case_id
        WHERE r.reporter_user_id = $1 AND r.idempotency_key = $2`,
      [reporterUserId, key],
    );
    return rows[0] ?? null;
  }

  /** True when this reporter already has an open report on the target (`uq_reports_one_open`). */
  async hasOpenReport(
    tx: PoolClient,
    reporterUserId: string,
    type: ReportTargetTypeT,
    targetId: string,
  ): Promise<boolean> {
    const { rows } = await tx.query(
      `SELECT 1 FROM reports
        WHERE reporter_user_id = $1 AND target_type = $2 AND target_id = $3 AND status = 'open'`,
      [reporterUserId, type, targetId],
    );
    return rows.length > 0;
  }

  /**
   * Attaches one more report to the target's open case, or opens the case (T-8).
   *
   * One statement through `uq_moderation_cases_open_target`, so even without
   * the target lock two racing reporters end in one case. On a merge the
   * severity is the most severe of the two (enum order: critical first) and the
   * deadline is the earlier of the stored one and `first_reported_at` plus the
   * new severity's time to first response (D-M5), so it never moves later.
   */
  async upsertCase(
    tx: PoolClient,
    target: ReportTargetRow,
    severity: ModerationSeverityT,
  ): Promise<ReportCaseRow> {
    const ttfrMs = SLA_TTFR_MS[severity];
    const { rows } = await tx.query<{
      id: string;
      case_number: string;
      severity: ModerationSeverityT;
      report_count: number;
      sla_due_at: Date;
      inserted: boolean;
    }>(
      `INSERT INTO moderation_cases
         (target_type, target_id, target_owner_user_id, related_event_id, severity,
          first_reported_at, sla_due_at)
       VALUES ($1, $2, $3, $4, $5::moderation_severity_enum, now(),
               now() + $6::bigint * interval '1 millisecond')
       ON CONFLICT (target_type, target_id)
         WHERE status IN ('open','in_review','awaiting_info','escalated')
       DO UPDATE SET
         report_count = moderation_cases.report_count + 1,
         severity     = LEAST(moderation_cases.severity, EXCLUDED.severity),
         sla_due_at   = LEAST(moderation_cases.sla_due_at,
                              moderation_cases.first_reported_at
                                + $6::bigint * interval '1 millisecond'),
         updated_at   = now()
       RETURNING id, case_number::text AS case_number, severity, report_count, sla_due_at,
                 (xmax = 0) AS inserted`,
      [target.type, target.id, target.ownerUserId, target.relatedEventId, severity, ttfrMs],
    );
    const row = rows[0];
    if (!row) throw new Error('moderation case upsert returned no row');
    return {
      id: row.id,
      caseNumber: row.case_number,
      severity: row.severity,
      reportCount: row.report_count,
      slaDueAt: row.sla_due_at,
      inserted: row.inserted,
    };
  }

  async insertReport(tx: PoolClient, input: InsertReportInput): Promise<{ id: string }> {
    const { rows } = await tx.query<{ id: string }>(
      `INSERT INTO reports
         (case_id, reporter_user_id, reporter_trust_level, target_type, target_id,
          target_owner_user_id, reason_group, severity, description, evidence_snapshot,
          content_locale, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7::report_reason_group_enum,
               $8::moderation_severity_enum, $9, $10::jsonb, $11, $12)
       RETURNING id`,
      [
        input.caseId,
        input.reporterUserId,
        input.reporterTrustLevel,
        input.target.type,
        input.target.id,
        input.target.ownerUserId,
        input.reasonGroup,
        input.severity,
        input.description,
        JSON.stringify(input.target.snapshot),
        input.target.contentLocale,
        input.idempotencyKey,
      ],
    );
    return rows[0] as { id: string };
  }

  /**
   * Counts the report on a post or comment and moves its `moderation_state`
   * (`clean` to `flagged`; `under_review` when hidden). With `hide`, also hides
   * it. Events and users carry neither column, so they are a no-op here.
   * Returns false when `hide` matched no visible row.
   */
  async markContentReported(
    tx: PoolClient,
    type: ReportTargetTypeT,
    id: string,
    hide: boolean,
  ): Promise<boolean> {
    if (type !== 'post' && type !== 'comment') return true;
    const table = type === 'post' ? 'posts' : 'comments';
    const { rowCount } = await tx.query(
      `UPDATE ${table}
          SET report_count = report_count + 1,
              status = CASE WHEN $2 THEN 'hidden'::content_status_enum ELSE status END,
              moderation_state = CASE
                WHEN $2 THEN 'under_review'::moderation_state_enum
                WHEN moderation_state = 'clean' THEN 'flagged'::moderation_state_enum
                ELSE moderation_state END,
              updated_at = now()
        WHERE id = $1 AND (NOT $2 OR status = 'visible')`,
      [id, hide],
    );
    return rowCount === 1;
  }

  /** Suspends a published or pending event (the sources AD-9 suspends from). */
  async suspendEvent(tx: PoolClient, id: string): Promise<boolean> {
    const { rowCount } = await tx.query(
      `UPDATE events SET status = 'suspended', updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL AND status IN ('published', 'pending_review')`,
      [id],
    );
    return rowCount === 1;
  }

  /**
   * True when the target had a case closed as `no_violation` or `malicious_report`
   * inside the cooldown window: a moderator already looked and cleared it.
   */
  async hasRecentClearance(
    tx: PoolClient,
    type: ReportTargetTypeT,
    targetId: string,
    days: number,
  ): Promise<boolean> {
    const { rows } = await tx.query(
      `SELECT 1 FROM moderation_cases
        WHERE target_type = $1 AND target_id = $2 AND status = 'resolved'
          AND resolution_code IN ('no_violation', 'malicious_report')
          AND resolved_at > now() - $3::int * interval '1 day'
        LIMIT 1`,
      [type, targetId, days],
    );
    return rows.length > 0;
  }

  /**
   * Takes the reporter off the open case of this target when they are its
   * assignee. The INV-4 trigger forbids a handler who is also a reporter, so
   * leaving them assigned would make the case impossible to update later.
   * A case that was `in_review` goes back to `open`.
   */
  async unassignReporter(
    tx: PoolClient,
    reporterUserId: string,
    type: ReportTargetTypeT,
    targetId: string,
  ): Promise<void> {
    await tx.query(
      `UPDATE moderation_cases
          SET assigned_to_user_id = NULL, assigned_at = NULL,
              status = CASE WHEN status = 'in_review' THEN 'open'::moderation_case_status_enum
                            ELSE status END,
              updated_at = now()
        WHERE target_type = $2 AND target_id = $3 AND assigned_to_user_id = $1
          AND status IN ('open','in_review','awaiting_info','escalated')`,
      [reporterUserId, type, targetId],
    );
  }

  async markCaseAutoHidden(tx: PoolClient, caseId: string): Promise<void> {
    await tx.query(
      `UPDATE moderation_cases SET auto_hidden = true, updated_at = now() WHERE id = $1`,
      [caseId],
    );
  }

  /** The caller's reports, newest first; the cursor is a report id (uuidv7 sorts by time). */
  async listMine(
    reporterUserId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<MyReportRow[]> {
    // A hand-edited cursor must not reach the uuid cast (a 500): anything that is
    // not a full uuid means the first page.
    const parsed = z.uuid().safeParse(decodeCursor<{ id?: unknown }>(cursor)?.id);
    const afterId = parsed.success ? parsed.data : null;
    const { rows } = await this.pool.query<MyReportRow>(
      `SELECT ${STATUS_COLUMNS}, r.target_type, r.reason_group, r.created_at
         FROM reports r JOIN moderation_cases c ON c.id = r.case_id
        WHERE r.reporter_user_id = $1
          AND ($2::uuid IS NULL OR r.id < $2)
        ORDER BY r.id DESC
        LIMIT $3`,
      [reporterUserId, afterId, limit + 1],
    );
    return rows;
  }
}
