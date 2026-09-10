import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ACTIVE_RSVP_STATUSES,
  RsvpStatus,
  SEAT_OCCUPYING,
} from '../src/rsvp.js';

const SQL_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../apps/api/src/database/sql/0002_rsvp_core.sql',
);

/**
 * Guards the contract between the TypeScript vocabulary and the hand-written
 * trigger SQL. If the two drift apart, the overbooking guard counts the wrong
 * statuses and the invariant silently stops holding.
 */
describe('RSVP vocabulary <-> trigger SQL', () => {
  const sql = readFileSync(SQL_PATH, 'utf8');

  const extractStatusList = (marker: string): string[] => {
    const section = sql.split(marker)[1];
    expect(section, `marker "${marker}" present in SQL`).toBeDefined();
    const match = /status IN \(([^)]+)\)/.exec(section as string);
    expect(match, `status IN (...) list after marker "${marker}"`).not.toBeNull();
    return (match as RegExpExecArray)[1]!
      .split(',')
      .map((s) => s.trim().replace(/'/g, ''));
  };

  it('trigger counts exactly the SEAT_OCCUPYING statuses', () => {
    const inTrigger = extractStatusList('-- vocabulary:seat-occupying');
    expect([...inTrigger].sort()).toEqual([...SEAT_OCCUPYING].sort());
  });

  it('unique-index predicate matches ACTIVE_RSVP_STATUSES', () => {
    const inIndex = extractStatusList('-- vocabulary:active-statuses');
    expect([...inIndex].sort()).toEqual([...ACTIVE_RSVP_STATUSES].sort());
  });

  it('every SQL status is a member of the RsvpStatus enum', () => {
    const all = [
      ...extractStatusList('-- vocabulary:seat-occupying'),
      ...extractStatusList('-- vocabulary:active-statuses'),
    ];
    for (const status of all) {
      expect(RsvpStatus.options).toContain(status);
    }
  });
});
