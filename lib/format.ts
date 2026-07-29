export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function msToHMS(ms: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export function fmtPickup(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`;
}

/** dateStr(YYYY-MM-DD) 기준 오늘로부터 며칠 남았는지. 지난 날짜면 음수. */
export function getDDay(dateStr: string, now: Date = new Date()): number {
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** start~end(YYYY-MM-DD, 둘 다 포함) 사이의 모든 날짜를 오름차순으로 나열. 값이 비었거나 end가 start보다 이르면 빈 배열. */
export function expandDateRange(start: string, end: string): string[] {
  if (!start || !end) return [];
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (endDate < startDate) return [];
  const dates: string[] = [];
  for (const d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    );
  }
  return dates;
}
