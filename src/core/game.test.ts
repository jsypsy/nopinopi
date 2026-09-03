import { describe, expect, it } from 'vitest'
import { continueRun, continuesLeft, createGame, floors, speedFor, tap, update } from './game'
import { dailyKey, msUntilNextDay, seedFromKey } from './daily'
import { TUNING } from './tuning'

/** 이동 블록을 아래 블록 기준 offset 자리에 두고 탭 */
function dropAt(g: ReturnType<typeof createGame>, offset: number): void {
  const top = g.layers[g.layers.length - 1]!
  g.mover.x = top.x + offset
  tap(g)
}

describe('쌓기 규칙', () => {
  it('시작 화면의 첫 탭은 시작만 한다 — 블록이 떨어지지 않는다', () => {
    const g = createGame(1)
    expect(g.phase).toBe('ready')
    tap(g)
    expect(g.phase).toBe('playing')
    expect(floors(g)).toBe(0)
  })

  it('어긋난 만큼 잘려 폭이 준다 — 오른쪽으로 30px 밀리면 30px 잘린다', () => {
    const g = createGame(1)
    tap(g)
    dropAt(g, 30)
    expect(floors(g)).toBe(1)
    const top = g.layers[1]!
    expect(top.w).toBeCloseTo(TUNING.baseW - 30)
    expect(top.x).toBeCloseTo(g.layers[0]!.x + 30)
    expect(g.events).toEqual(['place'])
  })

  it('왼쪽으로 어긋나도 잘린다 — 왼쪽 가장자리는 아래 블록에 맞춰진다', () => {
    const g = createGame(1)
    tap(g)
    dropAt(g, -40)
    const top = g.layers[1]!
    expect(top.w).toBeCloseTo(TUNING.baseW - 40)
    expect(top.x).toBeCloseTo(g.layers[0]!.x)
  })

  it('perfectTol 안이면 딱 — 잘리지 않고 콤보', () => {
    const g = createGame(1)
    tap(g)
    dropAt(g, TUNING.perfectTol)
    expect(g.layers[1]!.w).toBe(TUNING.baseW)
    expect(g.combo).toBe(1)
    expect(g.events).toEqual(['perfect'])
  })

  it('딱을 perfectCombo번 이으면 폭이 growPx 회복된다 (baseW 상한)', () => {
    const g = createGame(1)
    tap(g)
    dropAt(g, 50) // 폭 140
    for (let i = 0; i < TUNING.perfectCombo; i++) dropAt(g, 0)
    const top = g.layers[g.layers.length - 1]!
    expect(top.w).toBeCloseTo(TUNING.baseW - 50 + TUNING.growPx)
    expect(g.events).toContain('grow')
    // 이미 꽉 찬 폭은 더 안 자란다
    const g2 = createGame(1)
    tap(g2)
    for (let i = 0; i < TUNING.perfectCombo; i++) dropAt(g2, 0)
    expect(g2.layers[g2.layers.length - 1]!.w).toBe(TUNING.baseW)
  })

  it('겹침이 없으면 즉사, minW보다 좁아도 즉사', () => {
    const g = createGame(1)
    tap(g)
    dropAt(g, TUNING.baseW + 5)
    expect(g.phase).toBe('dead')
    expect(g.events).toEqual(['miss'])
    expect(floors(g)).toBe(0)
    const g2 = createGame(1)
    tap(g2)
    dropAt(g2, TUNING.baseW - TUNING.minW + 1)
    expect(g2.phase).toBe('dead')
  })

  it('층마다 출발 방향이 번갈고, 폭은 직전 층을 따른다', () => {
    const g = createGame(7)
    tap(g)
    const d0 = g.mover.dir
    dropAt(g, 20)
    expect(g.mover.dir).toBe(-d0)
    expect(g.mover.w).toBeCloseTo(TUNING.baseW - 20)
    dropAt(g, 0)
    expect(g.mover.dir).toBe(d0)
  })

  it('이동 블록은 범위 끝에서 되돌아온다', () => {
    const g = createGame(1)
    tap(g)
    for (let i = 0; i < 600; i++) update(g, 1 / 60)
    const over = g.mover.w * TUNING.overhang
    expect(g.mover.x).toBeGreaterThanOrEqual(-over - 1)
    expect(g.mover.x).toBeLessThanOrEqual(TUNING.viewW - g.mover.w + over + 1)
  })

  it('속도는 층수와 함께 오르고 상한이 있다', () => {
    const g = createGame(3)
    expect(speedFor(g, 30)).toBeGreaterThan(speedFor(g, 1) * 0.9)
    expect(speedFor(g, 500)).toBeLessThanOrEqual(TUNING.speed.cap)
  })
})

describe('이어하기', () => {
  it('죽은 뒤 이어하면 폭이 continueRestoreW까지 회복되고 층수는 유지된다', () => {
    const g = createGame(1)
    tap(g)
    dropAt(g, 100) // 폭 90
    dropAt(g, 100) // 겹침 -10 → 사망
    expect(g.phase).toBe('dead')
    expect(floors(g)).toBe(1)
    expect(continueRun(g)).toBe(true)
    expect(g.phase).toBe('playing')
    expect(floors(g)).toBe(1)
    expect(g.layers[1]!.w).toBeCloseTo(TUNING.baseW * TUNING.continueRestoreW)
    expect(continuesLeft(g)).toBe(TUNING.maxContinues - 1)
  })

  it('횟수를 다 쓰면 이어하기가 안 된다', () => {
    const g = createGame(1)
    tap(g)
    for (let i = 0; i < TUNING.maxContinues; i++) {
      dropAt(g, TUNING.baseW + 1)
      expect(continueRun(g)).toBe(true)
    }
    dropAt(g, TUNING.baseW + 1)
    expect(continueRun(g)).toBe(false)
    expect(g.phase).toBe('dead')
  })
})

describe('일일 시드', () => {
  it('같은 날짜 키면 시드·속도 패턴·출발 방향이 같다', () => {
    const a = createGame(seedFromKey('2026-09-04'))
    const b = createGame(seedFromKey('2026-09-04'))
    expect(a.mover.dir).toBe(b.mover.dir)
    for (let f = 1; f < 20; f++) expect(speedFor(a, f)).toBe(speedFor(b, f))
  })

  it('다른 날짜면 패턴이 다르다', () => {
    const a = createGame(seedFromKey('2026-09-04'))
    const b = createGame(seedFromKey('2026-09-05'))
    const diff = Array.from({ length: 20 }, (_, f) => speedFor(a, f + 1) !== speedFor(b, f + 1)).filter(Boolean).length
    expect(diff).toBeGreaterThan(10)
  })

  it('날짜 키는 KST 기준이다 — UTC 15시는 한국 자정을 넘긴다', () => {
    expect(dailyKey(Date.UTC(2026, 8, 4, 14, 59))).toBe('2026-09-04')
    expect(dailyKey(Date.UTC(2026, 8, 4, 15, 0))).toBe('2026-09-05')
    expect(msUntilNextDay(Date.UTC(2026, 8, 4, 14, 0))).toBe(60 * 60 * 1000)
  })
})
