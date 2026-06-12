const FIXED_HOLIDAYS = new Map([
  ['01-01', '1. nyttårsdag'],
  ['05-01', 'Arbeidernes dag'],
  ['05-17', 'Grunnlovsdag'],
  ['12-25', '1. juledag'],
  ['12-26', '2. juledag'],
]);

const MOVABLE_HOLIDAYS = [
  { offset: -3, name: 'Skjærtorsdag' },
  { offset: -2, name: 'Langfredag' },
  { offset: 0, name: '1. påskedag' },
  { offset: 1, name: '2. påskedag' },
  { offset: 39, name: 'Kristi himmelfartsdag' },
  { offset: 49, name: '1. pinsedag' },
  { offset: 50, name: '2. pinsedag' },
];

export const DAY_TYPES = {
  WORKDAY: 'workday',
  WEEKEND: 'weekend',
  HOLIDAY: 'holiday',
  VACATION: 'vacation',
  TIME_OFF: 'time-off',
};

export function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getNorwegianHolidays(year) {
  const holidays = new Map();

  for (const [monthDay, name] of FIXED_HOLIDAYS) {
    holidays.set(`${year}-${monthDay}`, name);
  }

  const easter = getEasterSunday(year);
  for (const holiday of MOVABLE_HOLIDAYS) {
    holidays.set(toDateKey(addDays(easter, holiday.offset)), holiday.name);
  }

  return holidays;
}

export function classifyNorwegianDay(date, customDaysOff = {}) {
  const dateKey = toDateKey(date);
  const customDay = customDaysOff[dateKey];

  if (customDay) {
    return {
      type: customDay.type,
      label: customDay.type === DAY_TYPES.VACATION ? 'Ferie' : 'Annen fridag',
      reason: customDay.note || 'Registrert av deg',
      isWorkday: false,
    };
  }

  const holidays = getNorwegianHolidays(date.getFullYear());
  const holidayName = holidays.get(dateKey);
  if (holidayName) {
    return {
      type: DAY_TYPES.HOLIDAY,
      label: 'Helligdag',
      reason: holidayName,
      isWorkday: false,
    };
  }

  if (date.getDay() === 0 || date.getDay() === 6) {
    return {
      type: DAY_TYPES.WEEKEND,
      label: 'Helg',
      reason: date.getDay() === 0 ? 'Søndag' : 'Lørdag',
      isWorkday: false,
    };
  }

  return {
    type: DAY_TYPES.WORKDAY,
    label: 'Arbeidsdag',
    reason: 'Ordinær norsk arbeidsdag',
    isWorkday: true,
  };
}

function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month, day);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
