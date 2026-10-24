const HOUR = 60 * 60 * 1000;

function clock(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function dayLabel(ts: number, now: number): string {
  const start = (t: number) => new Date(t).setHours(0, 0, 0, 0);
  const diffDays = Math.round((start(ts) - start(now)) / (24 * HOUR));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// "Today, 6:00 PM"
export function formatDeadline(ts: number, now = Date.now()): string {
  return `${dayLabel(ts, now)}, ${clock(ts)}`;
}

// "6:00 PM", para "Due at 6:00 PM"
export function formatClockTime(ts: number): string {
  return clock(ts);
}

// 2700 -> "00:45:00"
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export interface DeadlineOption {
  label: string;
  dueAt: number;
}

export interface DayOption {
  offset: number;
  label: string;
}

export interface TimeSlotOption {
  hour: number;
  minute: number;
  label: string;
}

// Próximos días (hasta 14 días, máximo admitido por el servidor) para elegir fecha exacta.
export function buildDayOptions(now = Date.now(), maxDays = 13): DayOption[] {
  return Array.from({ length: maxDays + 1 }, (_, offset) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const datePart = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const label = offset === 0 ? `Today (${datePart})` : offset === 1 ? `Tomorrow (${datePart})` : datePart;
    return { offset, label };
  });
}

// Franjas de hora cada 30 minutos (de 6:00 AM a 11:30 PM).
export function buildTimeSlotOptions(): TimeSlotOption[] {
  const slots: TimeSlotOption[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (const minute of [0, 30]) {
      const d = new Date(2026, 0, 1, hour, minute, 0, 0);
      slots.push({ hour, minute, label: clock(d.getTime()) });
    }
  }
  return slots;
}

export function defaultTimeSlot(slots: TimeSlotOption[], now = Date.now()): TimeSlotOption {
  const nextHour = Math.min(23, Math.max(6, new Date(now).getHours() + 2));
  return slots.find((s) => s.hour === nextHour && s.minute === 0) ?? slots[slots.length - 4];
}

// Combina día (offset desde hoy) y hora/minuto. Si para hoy ya pasó esa hora, devuelve al menos +1h.
export function combineDayAndTime(dayOffset: number, hour: number, minute: number, now = Date.now()): number {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  const ts = d.getTime();
  return ts - now > 5 * 60 * 1000 ? ts : now + HOUR;
}

// Opciones de fecha límite para "Create a pact": siguientes horas en punto y mañana.
export function buildDeadlineOptions(now = Date.now()): DeadlineOption[] {
  const at = (dayOffset: number, hour: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
  };
  const candidates = [at(0, 18), at(0, 21), at(1, 9), at(1, 18)].filter((ts) => ts - now > 30 * 60 * 1000);
  const list = candidates.length >= 3 ? candidates : [now + 2 * HOUR, now + 4 * HOUR, at(1, 9), at(1, 18)];
  return list.map((dueAt) => ({ dueAt, label: formatDeadline(dueAt, now) }));
}
