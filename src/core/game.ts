/**
 * 게임 상태머신 — 순수 로직. 입력은 tap(), 시간은 update(dt)로만 들어온다. Math.random·시계 금지.
 *
 * 규칙 (D-001):
 * - 블록이 좌우로 왕복한다. 탭하면 그 자리에 떨어져 아래 블록 위에 얹힌다
 * - 아래 블록과 겹치지 않은 부분은 잘려 나간다 → 폭이 줄어든다. 겹침이 없거나 minW보다 좁으면 즉사
 * - 어긋남이 perfectTol 이하면 "딱" — 잘리지 않고 콤보. perfectCombo번 연속이면 폭이 growPx 회복
 * - 점수 = 층수. 층이 오를수록 빨라진다. 일일 시드가 층마다 속도 변주와 출발 방향을 정한다
 */
import { Rng, stageSeed } from './rng'
import { TUNING } from './tuning'

export type Phase = 'ready' | 'playing' | 'dead'
export type GameEvent = 'place' | 'perfect' | 'grow' | 'miss'

export interface Layer {
  /** 왼쪽 가장자리 x (px) */
  x: number
  w: number
  /** 딱 맞춘 층인가 — 렌더러가 표시 */
  perfect: boolean
}

export interface Mover {
  x: number
  w: number
  /** +1 오른쪽으로, -1 왼쪽으로 */
  dir: 1 | -1
  speed: number
}

export interface Game {
  seed: number
  phase: Phase
  /** 쌓인 층 (0번이 바닥) */
  layers: Layer[]
  /** 지금 움직이는 블록 */
  mover: Mover
  /** 연속 딱 맞춤 */
  combo: number
  /** 이번 판 최대 콤보 */
  bestCombo: number
  /** 이번 판 딱 맞춤 횟수 */
  perfects: number
  /** 이어하기 사용 횟수 */
  continues: number
  /** 경과 시간 (초) — 세션 길이 계측 */
  timeSec: number
  /** 마지막 탭의 어긋남 (px, 부호 있음) — 연출용 */
  lastOffset: number
  /** 이번 틱에 일어난 일 — 호출부가 읽고 비운다 */
  events: GameEvent[]
}

/** 층수 = 점수. 바닥은 세지 않는다 */
export function floors(g: Game): number {
  return g.layers.length - 1
}

/** 층 n에 쓰는 시드 — 같은 날(seed)·같은 층이면 같은 값 */
function floorRng(g: Game, floor: number): Rng {
  return new Rng(stageSeed(g.seed, floor))
}

/** 층 n의 이동 속도 (px/s): 1차 램프 + 일일 변주 */
export function speedFor(g: Game, floor: number): number {
  const sp = TUNING.speed
  const t = Math.min(1, floor / sp.rampFloors)
  const base = sp.min + (sp.max - sp.min) * t
  const extra = Math.max(0, floor - sp.rampFloors) * sp.perFloor
  const jitter = floorRng(g, floor).range(TUNING.speedJitter.lo, TUNING.speedJitter.hi)
  return Math.min(sp.cap, (base + extra) * jitter)
}

/** 새 이동 블록 — 직전 층 폭으로, 층마다 반대쪽에서 출발 (첫 층의 쪽은 시드가 정한다) */
function spawnMover(g: Game): Mover {
  const top = g.layers[g.layers.length - 1]!
  const floor = floors(g) + 1
  const seedSide = TUNING.startSideFromSeed ? (floorRng(g, 0).next() < 0.5 ? 1 : -1) : 1
  const dir: 1 | -1 = ((floor % 2 === 1 ? 1 : -1) * seedSide) as 1 | -1
  const w = top.w
  const over = w * TUNING.overhang
  return {
    w,
    dir,
    speed: speedFor(g, floor),
    x: dir === 1 ? -over : TUNING.viewW - w + over,
  }
}

export function createGame(seed: number): Game {
  const baseX = (TUNING.viewW - TUNING.baseW) / 2
  const g: Game = {
    seed,
    phase: 'ready',
    layers: [{ x: baseX, w: TUNING.baseW, perfect: false }],
    mover: { x: 0, w: TUNING.baseW, dir: 1, speed: 0 },
    combo: 0,
    bestCombo: 0,
    perfects: 0,
    continues: 0,
    timeSec: 0,
    lastOffset: 0,
    events: [],
  }
  g.mover = spawnMover(g)
  return g
}

/** 시작 화면에서 첫 탭 — 시작만 하고 떨어뜨리지는 않는다 */
export function start(g: Game): void {
  if (g.phase === 'ready') g.phase = 'playing'
}

export function update(g: Game, dt: number): void {
  if (g.phase !== 'playing') return
  g.timeSec += dt
  const m = g.mover
  const over = m.w * TUNING.overhang
  const lo = -over
  const hi = TUNING.viewW - m.w + over
  m.x += m.dir * m.speed * dt
  if (m.x > hi) {
    m.x = hi - (m.x - hi)
    m.dir = -1
  } else if (m.x < lo) {
    m.x = lo + (lo - m.x)
    m.dir = 1
  }
}

/** 탭 — 블록을 떨어뜨린다. 겹침만큼 남기고 잘라 얹는다 */
export function tap(g: Game): void {
  if (g.phase === 'ready') {
    start(g)
    return
  }
  if (g.phase !== 'playing') return
  const m = g.mover
  const top = g.layers[g.layers.length - 1]!
  const offset = m.x - top.x
  g.lastOffset = offset
  if (Math.abs(offset) <= TUNING.perfectTol) {
    // 딱 — 잘리지 않는다. 콤보가 차면 폭 회복
    g.combo += 1
    g.perfects += 1
    g.bestCombo = Math.max(g.bestCombo, g.combo)
    let w = top.w
    if (g.combo % TUNING.perfectCombo === 0 && w < TUNING.baseW) {
      w = Math.min(TUNING.baseW, w + TUNING.growPx)
      g.events.push('grow')
    }
    // 폭이 자라면 가운데 기준으로 양쪽 확장
    const cx = top.x + top.w / 2
    g.layers.push({ x: cx - w / 2, w, perfect: true })
    g.events.push('perfect')
  } else {
    const left = Math.max(m.x, top.x)
    const right = Math.min(m.x + m.w, top.x + top.w)
    const w = right - left
    g.combo = 0
    if (w < TUNING.minW) {
      g.phase = 'dead'
      g.events.push('miss')
      return
    }
    g.layers.push({ x: left, w, perfect: false })
    g.events.push('place')
  }
  g.mover = spawnMover(g)
}

export function continuesLeft(g: Game): number {
  return Math.max(0, TUNING.maxContinues - g.continues)
}

/**
 * 이어하기 — 죽은 자리에서 다시. 폭은 바닥 폭의 continueRestoreW까지 되돌려 준다
 * (빗나간 직전 폭이 더 넓었으면 그대로). 층수는 그대로 이어진다
 */
export function continueRun(g: Game): boolean {
  if (g.phase !== 'dead' || continuesLeft(g) <= 0) return false
  const top = g.layers[g.layers.length - 1]!
  const w = Math.max(top.w, TUNING.baseW * TUNING.continueRestoreW)
  const cx = top.x + top.w / 2
  g.layers[g.layers.length - 1] = { x: cx - w / 2, w, perfect: false }
  g.continues += 1
  g.combo = 0
  g.phase = 'playing'
  g.mover = spawnMover(g)
  return true
}
