import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyNorwegianDay, DAY_TYPES, getNorwegianHolidays, toDateKey } from '../src/calendar.js';

test('finner faste norske helligdager', () => {
  const holidays = getNorwegianHolidays(2026);

  assert.equal(holidays.get('2026-01-01'), '1. nyttårsdag');
  assert.equal(holidays.get('2026-05-17'), 'Grunnlovsdag');
  assert.equal(holidays.get('2026-12-25'), '1. juledag');
});

test('beregner bevegelige helligdager fra påske', () => {
  const holidays = getNorwegianHolidays(2026);

  assert.equal(holidays.get('2026-04-02'), 'Skjærtorsdag');
  assert.equal(holidays.get('2026-04-03'), 'Langfredag');
  assert.equal(holidays.get('2026-04-06'), '2. påskedag');
  assert.equal(holidays.get('2026-05-14'), 'Kristi himmelfartsdag');
});

test('klassifiserer arbeidsdag, helg, ferie og fridag', () => {
  assert.equal(classifyNorwegianDay(new Date('2026-06-12T12:00:00')).type, DAY_TYPES.WORKDAY);
  assert.equal(classifyNorwegianDay(new Date('2026-06-13T12:00:00')).type, DAY_TYPES.WEEKEND);

  const vacation = classifyNorwegianDay(new Date('2026-07-06T12:00:00'), {
    '2026-07-06': { type: DAY_TYPES.VACATION, note: 'Sommerferie' },
  });
  assert.equal(vacation.type, DAY_TYPES.VACATION);
  assert.equal(vacation.reason, 'Sommerferie');
});

test('lager lokal datonøkkel', () => {
  assert.equal(toDateKey(new Date(2026, 5, 12, 8, 30)), '2026-06-12');
});
