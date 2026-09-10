-- Denormalized counters for the interaction tables.
--
-- Read paths outnumber writes by orders of magnitude on a feed, so counts are
-- cached on the parent row and maintained by trigger (decision D-10). They are
-- a display cache: no admission or permission decision may read them. A nightly
-- reconciliation job recomputes them from the source rows.
--
-- All deltas are computed from the transition, never by recounting: a hot post
-- would otherwise pay a full scan of its comments on every single write.

-- A comment counts toward its parent only while publicly readable. Hiding a
-- comment for moderation must lower the number the reader sees.
CREATE OR REPLACE FUNCTION comment_is_countable(
  p_status content_status_enum,
  p_deleted_at timestamptz
) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_status = 'visible' AND p_deleted_at IS NULL
$$;

CREATE OR REPLACE FUNCTION sync_comment_counters() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  was_countable boolean := false;
  is_countable  boolean := false;
  delta         integer;
  v_post_id     uuid;
  v_parent_id   uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    was_countable := comment_is_countable(OLD.status, OLD.deleted_at);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    is_countable := comment_is_countable(NEW.status, NEW.deleted_at);
  END IF;

  delta := is_countable::int - was_countable::int;
  IF delta = 0 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_post_id := OLD.post_id;
    v_parent_id := OLD.parent_id;
  ELSE
    v_post_id := NEW.post_id;
    v_parent_id := NEW.parent_id;
  END IF;

  -- Replies are included: the number under a post is what the reader counts on
  -- screen, which is every visible comment regardless of depth.
  IF v_post_id IS NOT NULL THEN
    UPDATE posts
       SET comment_count = comment_count + delta, updated_at = now()
     WHERE id = v_post_id;
  END IF;

  IF v_parent_id IS NOT NULL THEN
    UPDATE comments
       SET reply_count = reply_count + delta, updated_at = now()
     WHERE id = v_parent_id;
  END IF;

  RETURN NULL;
END $$;

CREATE TRIGGER trg_sync_comment_counters
  AFTER INSERT OR UPDATE OF status, deleted_at OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION sync_comment_counters();

-- Reactions have no status column: an un-react is a hard delete, so presence of
-- the row is the whole truth. The UPDATE branch exists so that a future
-- re-target cannot silently desynchronise two parents.
CREATE OR REPLACE FUNCTION sync_reaction_counters() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE posts SET reaction_count = reaction_count - 1, updated_at = now()
       WHERE id = OLD.post_id;
    ELSIF OLD.comment_id IS NOT NULL THEN
      UPDATE comments SET reaction_count = reaction_count - 1, updated_at = now()
       WHERE id = OLD.comment_id;
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE posts SET reaction_count = reaction_count + 1, updated_at = now()
       WHERE id = NEW.post_id;
    ELSIF NEW.comment_id IS NOT NULL THEN
      UPDATE comments SET reaction_count = reaction_count + 1, updated_at = now()
       WHERE id = NEW.comment_id;
    END IF;
  END IF;

  RETURN NULL;
END $$;

-- `kind` is deliberately absent from the UPDATE column list: switching a
-- reaction from 'like' to 'love' moves no count.
CREATE TRIGGER trg_sync_reaction_counters
  AFTER INSERT OR UPDATE OF post_id, comment_id, event_id OR DELETE ON reactions
  FOR EACH ROW EXECUTE FUNCTION sync_reaction_counters();

-- Message counters drive the inbox: ordering, the preview line and the unread
-- badge. The preview stores raw body text only; a message with no body (image,
-- shared event) leaves it NULL and the client renders a localized placeholder,
-- so no English string is ever frozen into a database row.
CREATE OR REPLACE FUNCTION sync_message_counters() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  was_countable boolean := false;
  is_countable  boolean := false;
  delta         integer;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    was_countable := comment_is_countable(OLD.status, OLD.deleted_at);
  END IF;
  is_countable := comment_is_countable(NEW.status, NEW.deleted_at);
  delta := is_countable::int - was_countable::int;

  IF delta = 0 THEN
    RETURN NULL;
  END IF;

  IF delta > 0 THEN
    UPDATE conversations
       SET message_count = message_count + 1,
           last_message_at = NEW.created_at,
           last_message_preview = left(NEW.body, 140),
           updated_at = now()
     WHERE id = NEW.conversation_id;

    -- The sender's own message is already read by definition.
    UPDATE conversation_participants
       SET unread_count = unread_count + 1
     WHERE conversation_id = NEW.conversation_id
       AND left_at IS NULL
       AND user_id IS DISTINCT FROM NEW.sender_user_id;
  ELSE
    UPDATE conversations
       SET message_count = greatest(message_count - 1, 0), updated_at = now()
     WHERE id = NEW.conversation_id;
  END IF;

  RETURN NULL;
END $$;

CREATE TRIGGER trg_sync_message_counters
  AFTER INSERT OR UPDATE OF status, deleted_at ON messages
  FOR EACH ROW EXECUTE FUNCTION sync_message_counters();
