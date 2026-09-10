-- Community interaction schema: posts, comments, reactions and messaging.
--
-- Covers docs/analysis/03-domain-va-du-lieu.md section 8 (comments,
-- conversations, conversation_participants, messages) and adds two tables that
-- section does not define: `posts` and `reactions`.
--
-- Ownership columns are plain uuid without a FK, matching 0002: the users table
-- arrives with the auth migration and adds the constraints then, so no backfill
-- is needed later.
--
-- Deletion follows the three-tier policy: `status` hides, `deleted_at` soft
-- deletes, a scheduled job anonymizes. Reactions are the single exception and
-- are hard deleted, for the same reason `follows` is: an un-react carries no
-- historical value, so a partial unique index would only add cost.

CREATE TYPE content_status_enum AS ENUM (
  'visible', 'pending_review', 'hidden', 'removed'
);

CREATE TYPE moderation_state_enum AS ENUM (
  'clean', 'flagged', 'under_review', 'actioned'
);

CREATE TYPE post_kind_enum AS ENUM (
  'question', 'recommendation', 'notice', 'looking_for'
);

-- 'going' is a soft interest signal on an event and never occupies a seat.
-- Seat admission is decided exclusively by rsvps + assert_capacity() (0002).
CREATE TYPE reaction_kind_enum AS ENUM (
  'like', 'love', 'helpful', 'celebrate', 'going'
);

CREATE TYPE conversation_type_enum AS ENUM ('direct', 'event_group');

CREATE TYPE conversation_request_status_enum AS ENUM (
  'pending', 'accepted', 'declined', 'blocked'
);

CREATE TYPE message_type_enum AS ENUM ('text', 'image', 'event_share', 'system');

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------
-- A community post carries no time, capacity or RSVP: those belong to events.
-- The distinction is enforced by shape, not by convention — there is no
-- starts_at column to abuse.

CREATE TABLE posts (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  author_user_id   uuid NOT NULL,
  -- Null means city-wide. Area scoping is what makes the feed usable at all;
  -- an unscoped feed in a 15k-person community degrades within weeks.
  area_id          uuid REFERENCES areas (id),
  kind             post_kind_enum NOT NULL DEFAULT 'question',
  body             text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 5000),
  body_locale      varchar(5),
  -- Media is uploaded straight to object storage; only the key reaches the API.
  media_ids        uuid[] NOT NULL DEFAULT '{}'
                     CHECK (coalesce(array_length(media_ids, 1), 0) <= 4),
  related_event_id uuid REFERENCES events (id) ON DELETE SET NULL,
  status           content_status_enum NOT NULL DEFAULT 'visible',
  moderation_state moderation_state_enum NOT NULL DEFAULT 'clean',
  comment_count    integer NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  reaction_count   integer NOT NULL DEFAULT 0 CHECK (reaction_count >= 0),
  report_count     integer NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  is_edited        boolean NOT NULL DEFAULT false,
  edited_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);

-- Feed queries always carry the visibility predicate, so it belongs in the
-- index rather than in the heap scan that follows it.
CREATE INDEX idx_posts_feed ON posts (created_at DESC)
  WHERE status = 'visible' AND deleted_at IS NULL;

CREATE INDEX idx_posts_area_feed ON posts (area_id, created_at DESC)
  WHERE status = 'visible' AND deleted_at IS NULL;

CREATE INDEX idx_posts_author ON posts (author_user_id, created_at DESC);

CREATE INDEX idx_posts_moderation ON posts (moderation_state, created_at)
  WHERE moderation_state IN ('flagged', 'under_review');

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------
-- Section 8.1 attaches comments to events only. Posts are commentable too, so
-- the target is a pair of real FKs guarded by a CHECK rather than the
-- target_type/target_id pair reserved for the five genuinely open tables.

CREATE TABLE comments (
  id                 uuid PRIMARY KEY DEFAULT uuidv7(),
  event_id           uuid REFERENCES events (id) ON DELETE CASCADE,
  post_id            uuid REFERENCES posts (id) ON DELETE CASCADE,
  occurrence_id      uuid REFERENCES event_occurrences (id) ON DELETE CASCADE,
  parent_id          uuid REFERENCES comments (id) ON DELETE CASCADE,
  -- Two levels only. A reply to a reply is flattened onto level 1; deeper
  -- threads are unreadable on a phone.
  depth              smallint NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 1),
  user_id            uuid NOT NULL,
  body               text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  body_locale        varchar(5),
  mentioned_user_ids uuid[] NOT NULL DEFAULT '{}'
                       CHECK (coalesce(array_length(mentioned_user_ids, 1), 0) <= 10),
  status             content_status_enum NOT NULL DEFAULT 'visible',
  moderation_state   moderation_state_enum NOT NULL DEFAULT 'clean',
  is_pinned          boolean NOT NULL DEFAULT false,
  is_edited          boolean NOT NULL DEFAULT false,
  edited_at          timestamptz,
  reaction_count     integer NOT NULL DEFAULT 0 CHECK (reaction_count >= 0),
  reply_count        integer NOT NULL DEFAULT 0 CHECK (reply_count >= 0),
  report_count       integer NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  CONSTRAINT ck_comments_single_target
    CHECK (num_nonnulls(event_id, post_id) = 1),
  CONSTRAINT ck_comments_occurrence_within_event
    CHECK (occurrence_id IS NULL OR event_id IS NOT NULL)
);

CREATE INDEX idx_comments_event_thread
  ON comments (event_id, is_pinned DESC, created_at DESC)
  WHERE parent_id IS NULL AND status = 'visible' AND deleted_at IS NULL;

CREATE INDEX idx_comments_post_thread
  ON comments (post_id, is_pinned DESC, created_at DESC)
  WHERE parent_id IS NULL AND status = 'visible' AND deleted_at IS NULL;

CREATE INDEX idx_comments_replies ON comments (parent_id, created_at)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_comments_user ON comments (user_id, created_at DESC);

CREATE INDEX idx_comments_moderation ON comments (moderation_state, created_at)
  WHERE moderation_state IN ('flagged', 'under_review');

-- ---------------------------------------------------------------------------
-- reactions
-- ---------------------------------------------------------------------------

CREATE TABLE reactions (
  id         uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id    uuid NOT NULL,
  post_id    uuid REFERENCES posts (id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments (id) ON DELETE CASCADE,
  event_id   uuid REFERENCES events (id) ON DELETE CASCADE,
  kind       reaction_kind_enum NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_reactions_single_target
    CHECK (num_nonnulls(post_id, comment_id, event_id) = 1)
);

-- One reaction per user per target: switching from 'like' to 'love' is an
-- UPDATE of `kind`, never a second row. Three partial indexes rather than one
-- composite because two of the three columns are always NULL.
CREATE UNIQUE INDEX uq_reactions_post ON reactions (user_id, post_id)
  WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX uq_reactions_comment ON reactions (user_id, comment_id)
  WHERE comment_id IS NOT NULL;
CREATE UNIQUE INDEX uq_reactions_event ON reactions (user_id, event_id)
  WHERE event_id IS NOT NULL;

-- Backs the per-kind breakdown shown under a post ("12 like, 3 helpful").
CREATE INDEX idx_reactions_post_kind ON reactions (post_id, kind)
  WHERE post_id IS NOT NULL;
CREATE INDEX idx_reactions_comment_kind ON reactions (comment_id, kind)
  WHERE comment_id IS NOT NULL;
CREATE INDEX idx_reactions_event_kind ON reactions (event_id, kind)
  WHERE event_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- conversations / conversation_participants / messages
-- ---------------------------------------------------------------------------

CREATE TABLE conversations (
  id                     uuid PRIMARY KEY DEFAULT uuidv7(),
  type                   conversation_type_enum NOT NULL DEFAULT 'direct',
  user_a_id              uuid,
  user_b_id              uuid,
  event_id               uuid REFERENCES events (id) ON DELETE CASCADE,
  occurrence_id          uuid REFERENCES event_occurrences (id) ON DELETE CASCADE,
  created_by_user_id     uuid NOT NULL,
  -- A stranger must ask first. Until accepted, the opener may send at most
  -- request_message_quota messages.
  request_status         conversation_request_status_enum NOT NULL DEFAULT 'pending',
  request_message_quota  smallint NOT NULL DEFAULT 1
                           CHECK (request_message_quota BETWEEN 0 AND 3),
  min_trust_level_to_join smallint NOT NULL DEFAULT 0
                           CHECK (min_trust_level_to_join BETWEEN 0 AND 5),
  status                 varchar(20) NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'archived', 'closed')),
  last_message_at        timestamptz,
  -- Pre-truncated so the inbox list never joins messages.
  last_message_preview   varchar(140),
  message_count          integer NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  moderation_state       moderation_state_enum NOT NULL DEFAULT 'clean',
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz,
  CONSTRAINT ck_conversations_shape CHECK (
    (type = 'direct' AND user_a_id IS NOT NULL AND user_b_id IS NOT NULL AND event_id IS NULL)
    OR
    (type = 'event_group' AND event_id IS NOT NULL AND user_a_id IS NULL AND user_b_id IS NULL)
  ),
  -- Canonical pair order; without it the partial unique index below cannot
  -- recognise (A,B) and (B,A) as the same conversation.
  CONSTRAINT ck_conversations_pair_order
    CHECK (user_a_id IS NULL OR user_a_id < user_b_id)
);

-- Partial twice over: event_group rows have both columns NULL, and a
-- moderation-removed conversation must not lock the pair out of ever messaging
-- again.
CREATE UNIQUE INDEX uq_conversations_direct_pair
  ON conversations (user_a_id, user_b_id)
  WHERE type = 'direct' AND deleted_at IS NULL;

CREATE UNIQUE INDEX uq_conversations_occurrence ON conversations (occurrence_id)
  WHERE type = 'event_group' AND occurrence_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_conversations_recent ON conversations (last_message_at DESC)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX idx_conversations_requests
  ON conversations (user_b_id, created_at DESC)
  WHERE request_status = 'pending';

CREATE TABLE conversation_participants (
  conversation_id      uuid NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  user_id              uuid NOT NULL,
  role                 varchar(20) NOT NULL DEFAULT 'member'
                         CHECK (role IN ('owner', 'member')),
  joined_at            timestamptz NOT NULL DEFAULT now(),
  last_read_message_id uuid,
  last_read_at         timestamptz,
  unread_count         integer NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  muted_until          timestamptz,
  -- Leaving keeps the history readable; it does not delete the row.
  left_at              timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_inbox
  ON conversation_participants (user_id, conversation_id) WHERE left_at IS NULL;

CREATE INDEX idx_conv_participants_unread
  ON conversation_participants (user_id)
  WHERE unread_count > 0 AND left_at IS NULL;

CREATE TABLE messages (
  id                    uuid PRIMARY KEY DEFAULT uuidv7(),
  conversation_id       uuid NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_user_id        uuid,
  type                  message_type_enum NOT NULL DEFAULT 'text',
  body                  text CHECK (body IS NULL OR length(body) <= 4000),
  body_locale           varchar(5),
  media_id              uuid,
  shared_event_id       uuid REFERENCES events (id) ON DELETE SET NULL,
  reply_to_message_id   uuid REFERENCES messages (id) ON DELETE SET NULL,
  -- Idempotency key owned by the client: a mobile retry after a dropped
  -- connection must not produce a second message.
  client_message_id     uuid,
  status                content_status_enum NOT NULL DEFAULT 'visible',
  moderation_state      moderation_state_enum NOT NULL DEFAULT 'clean',
  is_flagged_by_filter  boolean NOT NULL DEFAULT false,
  edited_at             timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,
  CONSTRAINT ck_messages_sender CHECK (
    (type = 'system' AND sender_user_id IS NULL)
    OR (type <> 'system' AND sender_user_id IS NOT NULL)
  ),
  CONSTRAINT ck_messages_payload CHECK (
    (type = 'text'        AND body IS NOT NULL AND length(btrim(body)) > 0)
    OR (type = 'image'    AND media_id IS NOT NULL)
    OR (type = 'event_share' AND shared_event_id IS NOT NULL)
    OR (type = 'system'   AND body IS NOT NULL)
  )
);

-- Scrolling a thread. `id` stands in for created_at because UUIDv7 sorts by
-- time: one less column in the index and no ties to break.
CREATE INDEX idx_messages_thread ON messages (conversation_id, id DESC);

-- Partial because system messages carry no client_message_id, and a full
-- UNIQUE over a column that is NULL for most rows is both wrong and wasteful.
CREATE UNIQUE INDEX uq_messages_idempotency
  ON messages (conversation_id, sender_user_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

CREATE INDEX idx_messages_flagged ON messages (created_at)
  WHERE is_flagged_by_filter AND moderation_state = 'clean';

-- No full-text index on messages. Private conversations stay out of every
-- shared search index; this is a privacy decision, not a performance one.
