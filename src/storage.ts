/**
 * localStorage 저장 — 키 접두어 `nopi.v1`. 모든 접근은 try/catch (프라이빗 모드·용량 초과 대비).
 * 값은 전부 게임 수치. 리더보드 제출은 여기 값이 아니라 그 판의 인메모리 점수만 쓴다(보안 검토 C1).
 */
const NS = 'nopi.v1'
const BEST_KEY = `${NS}.best`
const DAILY_KEY = `${NS}.daily`
const STREAK_KEY = `${NS}.streak`
const TUTORIAL_KEY = `${NS}.tutorial-done`

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* 저장 불가 — 무시 */
  }
}

/** 역대 최고 층수 */
export function loadBest(): number {
  const n = Number(read(BEST_KEY))
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}
export function saveBest(floors: number): void {
  write(BEST_KEY, String(Math.floor(floors)))
}

/** 오늘의 최고 — 날짜 키가 다르면 0 */
export function loadDailyBest(key: string): number {
  try {
    const d = JSON.parse(read(DAILY_KEY) ?? 'null') as { key?: string; best?: number } | null
    return d && d.key === key && Number.isFinite(d.best) ? Math.max(0, Math.floor(d.best!)) : 0
  } catch {
    return 0
  }
}
export function saveDailyBest(key: string, floors: number): void {
  write(DAILY_KEY, JSON.stringify({ key, best: Math.floor(floors) }))
}

export interface Streak {
  /** 마지막으로 플레이한 날짜 키 */
  last: string
  /** 연속 일수 (오늘 포함) */
  count: number
}
export function loadStreak(): Streak {
  try {
    const s = JSON.parse(read(STREAK_KEY) ?? 'null') as Partial<Streak> | null
    if (s && typeof s.last === 'string' && Number.isFinite(s.count)) return { last: s.last, count: Math.max(0, Math.floor(s.count!)) }
  } catch {
    /* 손상 — 초기화 */
  }
  return { last: '', count: 0 }
}
export function saveStreak(s: Streak): void {
  write(STREAK_KEY, JSON.stringify(s))
}

export function isTutorialDone(): boolean {
  return read(TUTORIAL_KEY) === '1'
}
export function markTutorialDone(): void {
  write(TUTORIAL_KEY, '1')
}
