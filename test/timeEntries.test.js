import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getActiveSession,
  getFirstClockIn,
  getLastClockOut,
  getSessionSummary,
  getTotalMilliseconds,
  normalizeEntry,
  stampEntry,
} from '../src/timeEntries.js';

const dayInfo = {
  label: 'Arbeidsdag',
  reason: 'Ordinær norsk arbeidsdag',
};

test('kan stemple inn, ut og inn igjen samme dag', () => {
  const date = '2026-06-12';
  let entry = stampEntry(undefined, 'in', '2026-06-12T08:00:00.000Z', date, dayInfo);
  entry = stampEntry(entry, 'out', '2026-06-12T11:00:00.000Z', date, dayInfo);
  entry = stampEntry(entry, 'in', '2026-06-12T12:00:00.000Z', date, dayInfo);

  assert.equal(entry.sessions.length, 2);
  assert.deepEqual(entry.sessions[0], {
    in: '2026-06-12T08:00:00.000Z',
    out: '2026-06-12T11:00:00.000Z',
  });
  assert.deepEqual(entry.sessions[1], {
    in: '2026-06-12T12:00:00.000Z',
    out: undefined,
  });
  assert.deepEqual(getActiveSession(entry), entry.sessions[1]);
});

test('beregner total arbeidstid på tvers av flere økter', () => {
  const entry = {
    date: '2026-06-12',
    sessions: [
      { in: '2026-06-12T08:00:00.000Z', out: '2026-06-12T11:30:00.000Z' },
      { in: '2026-06-12T12:00:00.000Z', out: '2026-06-12T15:15:00.000Z' },
    ],
  };

  assert.equal(getTotalMilliseconds(entry), 6.75 * 60 * 60 * 1000);
  assert.equal(getFirstClockIn(entry), '2026-06-12T08:00:00.000Z');
  assert.equal(getLastClockOut(entry), '2026-06-12T15:15:00.000Z');
});

test('migrerer gammel lagret inn-ut-struktur til økter', () => {
  const migrated = normalizeEntry(
    {
      date: '2026-06-12',
      in: '2026-06-12T08:00:00.000Z',
      out: '2026-06-12T16:00:00.000Z',
    },
    '2026-06-12',
    dayInfo,
  );

  assert.deepEqual(migrated.sessions, [
    { in: '2026-06-12T08:00:00.000Z', out: '2026-06-12T16:00:00.000Z' },
  ]);
});

test('lager lesbar øktoppsummering', () => {
  const entry = {
    sessions: [
      { in: 'a', out: 'b' },
      { in: 'c', out: undefined },
    ],
  };

  assert.equal(getSessionSummary(entry, (value) => value || '–'), '1: a–b, 2: c––');
});
