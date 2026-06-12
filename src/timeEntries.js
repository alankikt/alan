export function normalizeEntry(entry, date, dayInfo) {
  const normalized = {
    date,
    dayLabel: entry?.dayLabel || dayInfo.label,
    dayReason: entry?.dayReason || dayInfo.reason,
    sessions: Array.isArray(entry?.sessions) ? [...entry.sessions] : [],
  };

  if (!normalized.sessions.length && (entry?.in || entry?.out)) {
    normalized.sessions.push({
      in: entry.in,
      out: entry.out,
    });
  }

  return normalized;
}

export function stampEntry(entry, direction, timestamp, date, dayInfo) {
  const nextEntry = normalizeEntry(entry, date, dayInfo);
  nextEntry.dayLabel = dayInfo.label;
  nextEntry.dayReason = dayInfo.reason;

  if (direction === 'in') {
    if (!getActiveSession(nextEntry)) {
      nextEntry.sessions.push({ in: timestamp, out: undefined });
    }
  } else {
    const activeSession = getActiveSession(nextEntry);
    if (activeSession) {
      activeSession.out = timestamp;
    }
  }

  return nextEntry;
}

export function getActiveSession(entry) {
  return entry?.sessions?.find((session) => session.in && !session.out);
}

export function getFirstClockIn(entry) {
  return entry?.sessions?.find((session) => session.in)?.in;
}

export function getLastClockOut(entry) {
  return [...(entry?.sessions || [])].reverse().find((session) => session.out)?.out;
}

export function getTotalMilliseconds(entry, fallbackEnd) {
  return (entry?.sessions || []).reduce((total, session) => {
    if (!session.in) {
      return total;
    }

    const end = session.out || fallbackEnd;
    if (!end) {
      return total;
    }

    return total + Math.max(0, new Date(end) - new Date(session.in));
  }, 0);
}

export function getSessionSummary(entry, formatTime) {
  const sessions = entry?.sessions || [];
  if (!sessions.length) {
    return '–';
  }

  return sessions
    .map((session, index) => `${index + 1}: ${formatTime(session.in)}–${formatTime(session.out)}`)
    .join(', ');
}
