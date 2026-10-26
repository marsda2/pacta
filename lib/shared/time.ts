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
  shortWeekday: string;
  monthDay: string;
  weekdayIndex: number;
}

export type TimePeriod = 'morning' | 'afternoon' | 'evening';

export interface TimeSlotOption {
  hour: number;
  minute: number;
  label: string;
  period: TimePeriod;
}

export const WEEKDAYS = [
  { id: 1, short: 'M', name: 'Mon' },
  { id: 2, short: 'T', name: 'Tue' },
  { id: 3, short: 'W', name: 'Wed' },
  { id: 4, short: 'T', name: 'Thu' },
  { id: 5, short: 'F', name: 'Fri' },
  { id: 6, short: 'S', name: 'Sat' },
  { id: 0, short: 'S', name: 'Sun' },
] as const;

export function formatScheduledDays(days?: number[]): string {
  if (!days || days.length === 0) return '';
  const order = [1, 2, 3, 4, 5, 6, 0];
  const sorted = [...new Set(days)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return sorted.map((d) => WEEKDAYS.find((w) => w.id === d)?.name ?? '').filter(Boolean).join(', ');
}

export function currentWeekday(now = Date.now()): number {
  return new Date(now).getDay();
}

export function isTodayScheduled(days?: number[], now = Date.now()): boolean {
  if (!days || days.length === 0) return false;
  return days.includes(new Date(now).getDay());
}

// Próximos días (hasta 14 días, máximo admitido por el servidor) para elegir fecha exacta.
export function buildDayOptions(now = Date.now(), maxDays = 13): DayOption[] {
  return Array.from({ length: maxDays + 1 }, (_, offset) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const datePart = `${weekday}, ${monthDay}`;
    const label = offset === 0 ? `Today (${datePart})` : offset === 1 ? `Tomorrow (${datePart})` : datePart;
    const shortWeekday = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : weekday;
    return { offset, label, shortWeekday, monthDay, weekdayIndex: d.getDay() };
  });
}

function periodOf(hour: number): TimePeriod {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

// Franjas de hora cada 30 minutos (de 6:00 AM a 11:30 PM).
export function buildTimeSlotOptions(): TimeSlotOption[] {
  const slots: TimeSlotOption[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (const minute of [0, 30]) {
      const d = new Date(2026, 0, 1, hour, minute, 0, 0);
      slots.push({ hour, minute, label: clock(d.getTime()), period: periodOf(hour) });
    }
  }
  return slots;
}

// Si el día elegido es Hoy (offset === 0), oculta todas las horas que ya han pasado.
export function filterAvailableTimeSlots(slots: TimeSlotOption[], dayOffset: number, now = Date.now()): TimeSlotOption[] {
  if (dayOffset > 0) return slots;
  return slots.filter((s) => {
    const d = new Date(now);
    d.setHours(s.hour, s.minute, 0, 0);
    return d.getTime() - now >= 10 * 60 * 1000;
  });
}

export function defaultTimeSlot(slots: TimeSlotOption[], now = Date.now()): TimeSlotOption {
  const remainingToday = filterAvailableTimeSlots(slots, 0, now);
  if (remainingToday.length > 0) {
    return remainingToday[Math.min(1, remainingToday.length - 1)];
  }
  const nextHour = Math.min(23, Math.max(6, new Date(now).getHours() + 2));
  return slots.find((s) => s.hour === nextHour && s.minute === 0) ?? slots[slots.length - 4];
}

// Parsea una hora escrita por el usuario ("19:30", "7:30 pm", "8am") y verifica que no haya pasado si es Hoy.
export function parseCustomTime(raw: string): TimeSlotOption | null {
  const trimmed = raw.trim().toLowerCase();
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(trimmed);
  if (!match) return null;
  let hour = Number.parseInt(match[1], 10);
  const minute = match[2] ? Number.parseInt(match[2], 10) : 0;
  const mer = match[3];
  if (minute < 0 || minute > 59) return null;
  if (mer === 'pm' && hour >= 1 && hour <= 11) hour += 12;
  else if (mer === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;
  const d = new Date(2026, 0, 1, hour, minute, 0, 0);
  return { hour, minute, label: clock(d.getTime()), period: periodOf(hour) };
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
