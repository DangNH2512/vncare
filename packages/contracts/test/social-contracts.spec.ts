import { describe, expect, it } from 'vitest';
import { CommentResponse } from '../src/comment.js';
import { ConversationResponse, MessageResponse } from '../src/chat.js';
import {
  FollowResponse,
  ListFollowingQuery,
  SuggestionQuery,
} from '../src/follow.js';
import { PostResponse } from '../src/post.js';
import { PublicProfileResponse } from '../src/profile.js';
import { UserSummary } from '../src/user-summary.js';

const id = '3f2c1b7e-5a4d-4c1e-9b0a-1a2b3c4d5e6f';
const summary = { userId: id, handle: 'an', displayName: 'An', trustLevel: 2 };

describe('UserSummary', () => {
  it('strips email and role instead of passing them through', () => {
    const parsed = UserSummary.parse({ ...summary, email: 'a@b.co', role: 'admin' });
    expect(parsed).toEqual(summary);
    expect(parsed).not.toHaveProperty('email');
    expect(parsed).not.toHaveProperty('role');
  });

  it('rejects a trust level outside T0-T5', () => {
    expect(UserSummary.safeParse({ ...summary, trustLevel: 6 }).success).toBe(false);
  });
});

describe('new Social fields are nullable and required', () => {
  const field = (schema: { shape: Record<string, unknown> }, key: string) =>
    schema.shape[key] as { safeParse: (v: unknown) => { success: boolean } };

  it.each([
    ['PostResponse.author', PostResponse, 'author'],
    ['CommentResponse.author', CommentResponse, 'author'],
    ['MessageResponse.sender', MessageResponse, 'sender'],
    ['ConversationResponse.event', ConversationResponse, 'event'],
    ['ConversationResponse.chatWindow', ConversationResponse, 'chatWindow'],
    ['PublicProfileResponse.viewerIsFollowing', PublicProfileResponse, 'viewerIsFollowing'],
  ])('%s accepts null and rejects undefined', (_n, schema, key) => {
    const f = field(schema as never, key);
    expect(f.safeParse(null).success).toBe(true);
    expect(f.safeParse(undefined).success).toBe(false);
  });

  it('nested participant user is nullable and required', () => {
    const participants = (ConversationResponse.shape.participants as unknown as {
      element: { shape: Record<string, { safeParse: (v: unknown) => { success: boolean } }> };
    }).element;
    expect(participants.shape.user!.safeParse(null).success).toBe(true);
    expect(participants.shape.user!.safeParse(undefined).success).toBe(false);
  });

  it('keeps pre-existing fields unchanged', () => {
    expect(Object.keys(PostResponse.shape)).toEqual(
      expect.arrayContaining(['authorUserId', 'body', 'viewerReaction']),
    );
    expect(Object.keys(MessageResponse.shape)).toContain('senderUserId');
    expect(Object.keys(CommentResponse.shape)).toContain('userId');
  });
});

describe('follow contracts', () => {
  it('FollowResponse only accepts following: true', () => {
    const base = { userId: id, notify: false, createdAt: '2026-01-01T00:00:00.000Z' };
    expect(FollowResponse.safeParse({ ...base, following: true }).success).toBe(true);
    expect(FollowResponse.safeParse({ ...base, following: false }).success).toBe(false);
  });

  it('ListFollowingQuery defaults to 20 and caps at 50', () => {
    expect(ListFollowingQuery.parse({}).limit).toBe(20);
    expect(ListFollowingQuery.safeParse({ limit: 51 }).success).toBe(false);
  });

  it('SuggestionQuery defaults to 3 and caps at 10', () => {
    expect(SuggestionQuery.parse({}).limit).toBe(3);
    expect(SuggestionQuery.safeParse({ limit: 11 }).success).toBe(false);
    expect(SuggestionQuery.safeParse({ limit: 0 }).success).toBe(false);
  });
});
