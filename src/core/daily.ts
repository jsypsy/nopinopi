/**
 * 일일 시드 (D-001 2번): 같은 날엔 모두가 같은 탑을 쌓는다.
 * 날짜 키는 **한국 시간(UTC+9)** 기준 — 이용자가 전부 한국이고, 자정에 바뀌는 게 직관적이다.
 * core는 시계를 모르므로 `now`(epoch ms)는 바깥에서 넣는다.
 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 'YYYY-MM-DD' (KST) */
export function dailyKey(nowMs: number): string {
  const d = new Date(nowMs + KST_OFFSET_MS)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 다음 자정(KST)까지 남은 ms — "N시간 뒤 새 탑" 표시용 */
export function msUntilNextDay(nowMs: number): number {
  const local = nowMs + KST_OFFSET_MS
  const dayMs = 24 * 60 * 60 * 1000
  return dayMs - (local % dayMs)
}

/** 날짜 키 → 32비트 시드 (FNV-1a). 문자열이 같으면 시드가 같다 */
export function seedFromKey(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0 || 1
}

/** 'YYYY-MM-DD' → 'M월 D일' */
export function dailyLabel(key: string): string {
  const [, m, d] = key.split('-')
  return `${Number(m)}월 ${Number(d)}일`
}
