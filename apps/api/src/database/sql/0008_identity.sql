-- Identity, sessions and profiles.
--
-- This is the migration 0002 promised: every `uuid` ownership column shipped
-- without a constraint so that adding one later would need no backfill. That
-- moment is now, and the foreign keys at the bottom close the loop.
--
-- Design follows docs/analysis/03-domain-va-du-lieu.md section 4. Columns that
-- only social login or the moderation console will use are included where their
-- absence would force a second migration over a table that already has rows.

CREATE TYPE user_role_enum AS ENUM (
  'member', 'curator', 'moderator', 'admin', 'super_admin'
);

CREATE TYPE user_status_enum AS ENUM (
  'pending', 'active', 'suspended', 'deactivated', 'deleted'
);

CREATE TYPE platform_enum AS ENUM ('ios', 'android', 'web');

CREATE TYPE expat_type_enum AS ENUM (
  'digital_nomad', 'long_term_resident', 'student', 'teacher',
  'business_owner', 'short_stay', 'local_host'
);

CREATE TYPE gender_enum AS ENUM ('female', 'male', 'non_binary', 'prefer_not_to_say');

CREATE TYPE profile_visibility_enum AS ENUM ('public', 'members_only', 'private');

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
-- `guest` is deliberately absent from user_role_enum: not being logged in is
-- the absence of a row here, not a value in it. Likewise `organizer`, which is
-- a per-event relationship, and `verified_member`, which is a trust level.

CREATE TABLE users (
  id                     uuid PRIMARY KEY DEFAULT uuidv7(),
  -- citext so "Anna@x.com" and "anna@x.com" cannot become two accounts.
  email                  citext,
  email_verified_at      timestamptz,
  phone                  varchar(20),
  phone_verified_at      timestamptz,
  -- Argon2id output. Null for an account that only ever used social login.
  password_hash          varchar(255),
  role                   user_role_enum NOT NULL DEFAULT 'member',
  trust_level            smallint NOT NULL DEFAULT 0
                           CHECK (trust_level BETWEEN 0 AND 5),
  trust_level_changed_at timestamptz,
  status                 user_status_enum NOT NULL DEFAULT 'active',
  locale                 varchar(5) NOT NULL DEFAULT 'en',
  timezone               varchar(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  suspended_until        timestamptz,
  suspension_reason      varchar(255),
  last_active_at         timestamptz,
  deletion_requested_at  timestamptz,
  anonymized_at          timestamptz,
  legal_hold_until       timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz,
  -- An account must be reachable by something, or nobody can ever sign back in.
  CONSTRAINT ck_users_has_identifier CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Partial over live rows: a deleted account must not block the address forever.
CREATE UNIQUE INDEX uq_users_email ON users (email)
  WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE UNIQUE INDEX uq_users_phone ON users (phone)
  WHERE deleted_at IS NULL AND phone IS NOT NULL;
CREATE INDEX idx_users_status_active ON users (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deletion_due ON users (deletion_requested_at)
  WHERE deletion_requested_at IS NOT NULL AND anonymized_at IS NULL;

-- ---------------------------------------------------------------------------
-- auth_sessions — one row per refresh token
-- ---------------------------------------------------------------------------
-- Only the SHA-256 of the token is stored. A database dump therefore yields no
-- usable session, and the hash is enough to recognise a token on presentation.

CREATE TABLE auth_sessions (
  id             uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id        uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash     char(64) NOT NULL,
  -- Rotation lineage. Presenting a token that was already rotated means it was
  -- copied, so the whole family is revoked rather than just that token.
  family_id      uuid NOT NULL,
  device_id      varchar(191),
  platform       platform_enum NOT NULL DEFAULT 'web',
  app_version    varchar(32),
  ip             inet,
  user_agent     varchar(255),
  expires_at     timestamptz NOT NULL,
  revoked_at     timestamptz,
  revoked_reason varchar(64),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_auth_sessions_token_hash ON auth_sessions (token_hash);
CREATE INDEX idx_auth_sessions_family ON auth_sessions (family_id);
CREATE INDEX idx_auth_sessions_user_live ON auth_sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- profiles — one per user, created with the account
-- ---------------------------------------------------------------------------

CREATE TABLE profiles (
  user_id               uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  handle                citext NOT NULL CHECK (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name          varchar(60) NOT NULL CHECK (length(btrim(display_name)) >= 1),
  headline              varchar(120),
  bio                   text CHECK (bio IS NULL OR length(bio) <= 1000),
  bio_locale            varchar(5),
  avatar_media_id       uuid REFERENCES media (id) ON DELETE SET NULL,
  nationality_code      char(2),
  spoken_languages      jsonb NOT NULL DEFAULT '[]'::jsonb,
  expat_type            expat_type_enum,
  home_area_id          uuid REFERENCES areas (id) ON DELETE SET NULL,
  in_da_nang_since      date,
  birth_year            smallint CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2100),
  gender                gender_enum,
  visibility            profile_visibility_enum NOT NULL DEFAULT 'public',
  show_area_publicly    boolean NOT NULL DEFAULT true,
  -- Raw signal total, internal only. The displayed ladder is users.trust_level.
  trust_points          integer NOT NULL DEFAULT 0,
  trust_recomputed_at   timestamptz,
  events_hosted_count   integer NOT NULL DEFAULT 0 CHECK (events_hosted_count >= 0),
  events_attended_count integer NOT NULL DEFAULT 0 CHECK (events_attended_count >= 0),
  no_show_count         integer NOT NULL DEFAULT 0 CHECK (no_show_count >= 0),
  rating_avg            numeric(3, 2),
  rating_count          integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_profiles_handle ON profiles (handle);
CREATE INDEX idx_profiles_home_area ON profiles (home_area_id) WHERE visibility = 'public';

-- ---------------------------------------------------------------------------
-- Close the ownership loop
-- ---------------------------------------------------------------------------
-- ON DELETE RESTRICT throughout: account deletion is a grace period plus an
-- anonymization job, never a cascade that silently erases a conversation the
-- other participant still needs, or an event other people RSVP'd to.

ALTER TABLE events              ADD CONSTRAINT fk_events_organizer
  FOREIGN KEY (organizer_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE rsvps               ADD CONSTRAINT fk_rsvps_user
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE waitlist_entries    ADD CONSTRAINT fk_waitlist_entries_user
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE posts               ADD CONSTRAINT fk_posts_author
  FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE comments            ADD CONSTRAINT fk_comments_user
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE reactions           ADD CONSTRAINT fk_reactions_user
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE media               ADD CONSTRAINT fk_media_owner
  FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE conversations       ADD CONSTRAINT fk_conversations_created_by
  FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE conversation_participants ADD CONSTRAINT fk_conversation_participants_user
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE messages            ADD CONSTRAINT fk_messages_sender
  FOREIGN KEY (sender_user_id) REFERENCES users (id) ON DELETE SET NULL;
