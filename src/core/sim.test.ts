/**
 * 봇 계측 — 난이도는 감이 아니라 세션 길이 분포로 (날아날아 HANDOFF 교훈).
 * 봇은 "아래 블록 위치를 노리되 반응 오차 σ(px)를 가진 사람". 오차는 속도에 비례해 커진다(빠를수록 못 맞춘다).
 *   SIM=1 npx vitest run src/core/sim.test.ts
 */
import { describe, expect, it } from 'vitest'
import { createGame, floors, tap, update } from './game'
import { Rng } from './rng'
import { seedFromKey } from './daily'

function gauss(r: Rng): number {
  const u = 1 - r.next()
  const v = r.next()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** 반응 오차 σ = base + k*speed. 결과: 층수·초 */
function runBot(seed: number, sigmaBase: number, sigmaPerSpeed: number, rngSeed: number, maxSec = 300): { floors: number; sec: number } {
  const g = createGame(seed)
  const r = new Rng(rngSeed)
  tap(g)
  const dt = 1 / 120
  while (g.phase === 'playing' && g.timeSec < maxSec) {
    // 블록이 목표 x를 지나는 순간을 노린다 — 그 프레임에서 오차만큼 빗나간 위치로 탭
    const top = g.layers[g.layers.length - 1]!
    const before = g.mover.x - top.x
    update(g, dt)
    const after = g.mover.x - top.x
    if ((before <= 0 && after >= 0) || (before >= 0 && after <= 0)) {
      const sigma = sigmaBase + sigmaPerSpeed * g.mover.speed
      g.mover.x = top.x + gauss(r) * sigma
      tap(g)
      g.events.length = 0
    }
  }
  return { floors: floors(g), sec: g.timeSec }
}

const SIM = process.env.SIM === '1'
describe.skipIf(!SIM)('봇 세션 분포', () => {
  it('플레이어 유형별 층수·세션 길이 (시드 12개, 오늘 시드)', () => {
    const seed = seedFromKey('2026-09-04')
    const types = [
      { name: '초보 σ=6+0.030v', base: 6, k: 0.03 },
      { name: '보통 σ=4+0.020v', base: 4, k: 0.02 },
      { name: '숙련 σ=2+0.012v', base: 2, k: 0.012 },
      { name: '상위 σ=1+0.006v', base: 1, k: 0.006 },
    ]
    const rows: string[] = []
    for (const t of types) {
      const fs: number[] = []
      const ss: number[] = []
      for (let i = 0; i < 12; i++) {
        const r = runBot(seed, t.base, t.k, 1000 + i)
        fs.push(r.floors)
        ss.push(r.sec)
      }
      const q = (a: number[], p: number) => a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]!
      rows.push(`${t.name}: 층 중앙 ${q(fs, 0.5)} (1/4 ${q(fs, 0.25)} · 3/4 ${q(fs, 0.75)}) · 초 중앙 ${q(ss, 0.5).toFixed(0)} (${q(ss, 0.25).toFixed(0)}~${q(ss, 0.75).toFixed(0)})`)
    }
    console.log('\n' + rows.join('\n') + '\n')
    expect(rows.length).toBe(4)
  })
})
