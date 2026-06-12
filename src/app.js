import { classifyNorwegianDay, DAY_TYPES, toDateKey } from './calendar.js';
import {
  getActiveSession,
  getFirstClockIn,
  getLastClockOut,
  getSessionSummary,
  getTotalMilliseconds,
  normalizeEntry,
  stampEntry,
} from './timeEntries.js';

const STORAGE_KEYS = {
  entries: 'norsk-stempling:entries',
  daysOff: 'norsk-stempling:days-off',
};

const state = {
  entries: readStorage(STORAGE_KEYS.entries, {}),
  daysOff: readStorage(STORAGE_KEYS.daysOff, {}),
};

const elements = {
  currentTime: document.querySelector('#current-time'),
  currentDate: document.querySelector('#current-date'),
  dayBadge: document.querySelector('#day-badge'),
  workStatus: document.querySelector('#work-status'),
  dayMessage: document.querySelector('#day-message'),
  clockIn: document.querySelector('#clock-in'),
  clockOut: document.querySelector('#clock-out'),
  todayIn: document.querySelector('#today-in'),
  todayOut: document.querySelector('#today-out'),
  todayDuration: document.querySelector('#today-duration'),
  dayOffForm: document.querySelector('#dayoff-form'),
  dayOffDate: document.querySelector('#dayoff-date'),
  dayOffType: document.querySelector('#dayoff-type'),
  dayOffNote: document.querySelector('#dayoff-note'),
  dayOffList: document.querySelector('#dayoff-list'),
  logBody: document.querySelector('#log-body'),
  clearLog: document.querySelector('#clear-log'),
};

const formatter = new Intl.DateTimeFormat('nb-NO', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('nb-NO', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

elements.dayOffDate.value = toDateKey(new Date());
elements.clockIn.addEventListener('click', () => stamp('in'));
elements.clockOut.addEventListener('click', () => stamp('out'));
elements.dayOffForm.addEventListener('submit', addDayOff);
elements.clearLog.addEventListener('click', clearLog);

render();
setInterval(render, 1000);

function stamp(direction) {
  const now = new Date();
  const dateKey = toDateKey(now);
  const dayInfo = classifyNorwegianDay(now, state.daysOff);
  state.entries[dateKey] = stampEntry(
    state.entries[dateKey],
    direction,
    now.toISOString(),
    dateKey,
    dayInfo,
  );
  writeStorage(STORAGE_KEYS.entries, state.entries);
  render();
}

function addDayOff(event) {
  event.preventDefault();
  const date = elements.dayOffDate.value;

  state.daysOff[date] = {
    type: elements.dayOffType.value,
    note: elements.dayOffNote.value.trim(),
  };

  writeStorage(STORAGE_KEYS.daysOff, state.daysOff);
  elements.dayOffNote.value = '';
  render();
}

function removeDayOff(date) {
  delete state.daysOff[date];
  writeStorage(STORAGE_KEYS.daysOff, state.daysOff);
  render();
}

function clearLog() {
  if (!confirm('Vil du tømme hele stemplingsloggen?')) {
    return;
  }

  state.entries = {};
  writeStorage(STORAGE_KEYS.entries, state.entries);
  render();
}

function render() {
  const now = new Date();
  const dateKey = toDateKey(now);
  const todayEntry = state.entries[dateKey]
    ? normalizeEntry(state.entries[dateKey], dateKey, classifyNorwegianDay(now, state.daysOff))
    : undefined;
  const dayInfo = classifyNorwegianDay(now, state.daysOff);
  if (todayEntry) {
    state.entries[dateKey] = todayEntry;
  }

  elements.currentTime.textContent = timeFormatter.format(now);
  elements.currentDate.textContent = capitalize(formatter.format(now));
  elements.dayBadge.textContent = `${dayInfo.label}: ${dayInfo.reason}`;
  elements.dayBadge.dataset.type = dayInfo.type;
  elements.dayMessage.textContent = dayInfo.isWorkday
    ? 'Dette er en ordinær arbeidsdag.'
    : 'Dette er normalt fri i norsk kalender. Stempling er fortsatt mulig ved behov.';

  const activeSession = getActiveSession(todayEntry);
  const isClockedIn = Boolean(activeSession);
  elements.workStatus.textContent = isClockedIn
    ? `Stemplet inn siden ${formatStoredTime(activeSession.in)}`
    : 'Ikke stemplet inn';
  elements.clockIn.disabled = isClockedIn;
  elements.clockOut.disabled = !isClockedIn;

  elements.todayIn.textContent = formatStoredTime(getFirstClockIn(todayEntry));
  elements.todayOut.textContent = formatStoredTime(getLastClockOut(todayEntry));
  elements.todayDuration.textContent = formatMilliseconds(
    getTotalMilliseconds(todayEntry, isClockedIn ? now.toISOString() : undefined),
  );

  renderDaysOff();
  renderLog();
}

function renderDaysOff() {
  const days = Object.entries(state.daysOff).sort(([a], [b]) => a.localeCompare(b));
  elements.dayOffList.innerHTML = '';

  if (days.length === 0) {
    elements.dayOffList.innerHTML = '<li class="empty">Ingen egne fri- eller feriedager er registrert.</li>';
    return;
  }

  for (const [date, details] of days) {
    const item = document.createElement('li');
    const text = document.createElement('span');
    const button = document.createElement('button');
    const label = details.type === DAY_TYPES.VACATION ? 'Ferie' : 'Annen fridag';

    text.textContent = `${formatDateKey(date)} – ${label}${details.note ? ` (${details.note})` : ''}`;
    button.type = 'button';
    button.textContent = 'Fjern';
    button.className = 'link-button';
    button.addEventListener('click', () => removeDayOff(date));

    item.append(text, button);
    elements.dayOffList.append(item);
  }
}

function renderLog() {
  const rows = Object.values(state.entries)
    .map((entry) => normalizeEntry(entry, entry.date, { label: entry.dayLabel, reason: entry.dayReason }))
    .sort((a, b) => b.date.localeCompare(a.date));
  elements.logBody.innerHTML = '';

  if (rows.length === 0) {
    elements.logBody.innerHTML = '<tr><td colspan="5" class="empty">Ingen stemplinger ennå.</td></tr>';
    return;
  }

  for (const entry of rows) {
    const row = document.createElement('tr');
    const dayInfo = classifyNorwegianDay(new Date(`${entry.date}T12:00:00`), state.daysOff);
    const cells = [
      formatDateKey(entry.date),
      `${dayInfo.label}: ${dayInfo.reason}`,
      formatStoredTime(getFirstClockIn(entry)),
      `${formatStoredTime(getLastClockOut(entry))} (${getSessionSummary(entry, formatStoredTime)})`,
      formatMilliseconds(getTotalMilliseconds(entry)),
    ];

    for (const value of cells) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }

    elements.logBody.append(row);
  }
}

function formatStoredTime(value) {
  return value ? timeFormatter.format(new Date(value)) : '–';
}

function formatMilliseconds(milliseconds) {
  const totalMinutes = Math.floor(Math.max(0, milliseconds) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours} t ${minutes} min`;
}

function formatDateKey(dateKey) {
  return capitalize(formatter.format(new Date(`${dateKey}T12:00:00`)));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`Kunne ikke lese ${key} fra lokal lagring`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Kunne ikke lagre ${key} lokalt`, error);
    elements.dayMessage.textContent = 'Kunne ikke lagre lokalt i denne nettleseren. Sjekk at localStorage er tilgjengelig.';
  }
}
