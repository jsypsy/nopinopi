/** 부트스트랩 — 고정 스텝 시뮬레이션 + 카메라 + 입력/렌더/플랫폼 연결 */
import { Analytics } from './analytics'
import { dailyKey, dailyLabel, seedFromKey } from './core/daily'
import { continueRun, continuesLeft, createGame, floors, tap, update } from './core/game'
import { TUNING } from './core/tuning'
import { bindPointer } from './input/pointer'
import { createPlatform } from './platform'
import { cancelHostTopInset } from './platform/adapter'
import { Renderer } from './render/renderer'
import { loadBest, loadDailyBest, loadMuted, loadStreak, saveBest, saveDailyBest, saveMuted, saveStreak } from './storage'
import { Sfx } from './audio'

const SIM_STEP = 1 / 120
/** 사망 직후 오입력으로 바로 재시작되는 것 방지 (초) */
const RESTART_LOCK = 1.0

const platform = createPlatform()
const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const renderer = new Renderer(ctx)
const analytics = new Analytics(platform)
const sfx = new Sfx(loadMuted())
let adBusy = false

/** 오늘 — 자정을 넘기면 시작 화면에서 새 탑으로 갈아탄다 */
let todayKey = dailyKey(Date.now())
let game = createGame(seedFromKey(todayKey))
let best = loadBest()
let dailyBest = loadDailyBest(todayKey)
let streak = loadStreak()
const cam = { y: 0 }
let deadAt = 0
let resultSaved = false

// 개발 전용 훅 — 프로덕션 번들에서 제거된다 (D-023 승계)
if (import.meta.env.DEV) {
  ;(window as unknown as { __nopi: unknown }).__nopi = {
    get game() {
      return game
    },
    tuning: TUNING,
    floors: () => floors(game),
    tap: () => { if (game.phase === 'ready') startRun(); else { tap(game); drainEvents(performance.now()) } },
    stepOnce: (dt = 0) => tick(performance.now(), dt),
  }
}

function viewportSize(): { w: number; h: number } {
  const vv = window.visualViewport
  return { w: Math.round(vv?.width ?? window.innerWidth), h: Math.round(vv?.height ?? window.innerHeight) }
}

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const { w, h } = viewportSize()
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const vv = window.visualViewport
  canvas.style.top = `${Math.round(vv?.offsetTop ?? 0)}px`
  canvas.style.left = `${Math.round(vv?.offsetLeft ?? 0)}px`
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

/** 오늘 처음 시작할 때 연속 일수를 갱신한다 — 어제 했으면 +1, 아니면 1 */
function bumpStreak(): void {
  if (streak.last === todayKey) return
  const y = new Date(Date.parse(todayKey + 'T00:00:00Z') - 24 * 3600 * 1000)
  const yesterday = y.toISOString().slice(0, 10)
  streak = { last: todayKey, count: streak.last === yesterday ? streak.count + 1 : 1 }
  saveStreak(streak)
}

function newGame(): void {
  const key = dailyKey(Date.now())
  if (key !== todayKey) {
    todayKey = key
    dailyBest = loadDailyBest(todayKey)
  }
  game = createGame(seedFromKey(todayKey))
  // 다시 하기는 ready 프레임 없이 바로 playing으로 가므로 여기서 저장값을 다시 읽는다 —
  // 안 읽으면 세션 내 옛 최고와 비교해 더 낮은 층수를 저장하는 버그(B1 실기기 보고)
  best = loadBest()
  dailyBest = loadDailyBest(todayKey)
  cam.y = 0
  resultSaved = false
  renderer.reset()
}

function startRun(): void {
  bumpStreak()
  tap(game) // ready → playing
  analytics.gameStart(performance.now(), streak.count)
}

function restart(): void {
  newGame()
  startRun()
}

async function tryContinue(): Promise<void> {
  if (adBusy || game.phase !== 'dead' || continuesLeft(game) <= 0) return
  adBusy = true
  let rewarded = false
  let fallback = false
  try {
    const r = await platform.showRewardedAd('continue')
    rewarded = r.rewarded
    fallback = !!r.fallback
  } catch {
    rewarded = false
  }
  analytics.adReward('continue', rewarded, fallback ? 'fallback' : 'earned')
  adBusy = false
  if (!rewarded || game.phase !== 'dead') return
  if (continueRun(game)) {
    resultSaved = false
    last = performance.now()
    acc = 0
  }
}

bindPointer(
  canvas,
  (x, y) => {
    sfx.unlock()
    if (game.phase === 'dead') {
      if (performance.now() - deadAt < RESTART_LOCK * 1000) return
      const hit = renderer.hitDeathButton(x, y)
      if (hit === 'continue') void tryContinue()
      else if (hit === 'retry' && !adBusy) restart()
      return
    }
    if (game.phase === 'ready') {
      if (renderer.hitMuteButton(x, y)) {
        sfx.muted = !sfx.muted
        saveMuted(sfx.muted)
        if (!sfx.muted) sfx.unlock()
        return
      }
      startRun()
      return
    }
    tap(game)
    drainEvents(performance.now())
  },
  () => {},
)

function drainEvents(now: number): void {
  for (const ev of game.events) {
    if (ev === 'place') {
      renderer.onPlaced(game, now, false)
      sfx.tap()
    } else if (ev === 'perfect') {
      renderer.onPlaced(game, now, true)
      sfx.perfect(game.combo)
    } else if (ev === 'grow') renderer.onGrow(game, now)
    else if (ev === 'miss') {
      renderer.onMiss(game, now)
      sfx.miss()
    }
  }
  game.events.length = 0
}

let last = performance.now()
let acc = 0
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  tick(now, dt)
  requestAnimationFrame(frame)
}

function tick(now: number, dt: number): void {
  if (game.phase === 'playing') {
    acc += dt
    while (acc >= SIM_STEP) {
      update(game, SIM_STEP)
      acc -= SIM_STEP
    }
    analytics.tick(now, floors(game))
  }
  if (game.phase === 'dead' && !resultSaved) {
    deadAt = now
    resultSaved = true
    const n = floors(game)
    const isBest = n > best
    const isDaily = n > dailyBest
    analytics.gameOver({ score: n, isBest, isDailyBest: isDaily, continued: game.continues > 0, perfects: game.perfects, bestCombo: game.bestCombo }, now)
    // 점수 제출은 플레이가 끝난 뒤, 그 판의 인메모리 층수만 (보안 검토 C1)
    if (n > 0) void platform.submitScore(n)
    // 표시용 최고는 카드 연출이 끝난 뒤 갱신되게 저장만 먼저
    if (isBest) saveBest(n)
    if (isDaily) saveDailyBest(todayKey, n)
  }
  if (game.phase === 'ready' && (best !== loadBest() || dailyBest !== loadDailyBest(todayKey))) {
    best = loadBest()
    dailyBest = loadDailyBest(todayKey)
  }
  // 카메라: 맨 위 층의 윗면이 화면 58% 높이에 오게. 아래로는 땅(0) 아래로 내려가지 않는다
  const { w, h } = viewportSize()
  const s = w / TUNING.viewW
  const topWorld = (game.layers.length + 1) * TUNING.blockH
  const targetCam = Math.max(0, topWorld - (h * 0.42) / s)
  cam.y += (targetCam - cam.y) * Math.min(1, dt * 6)
  const insets = cancelHostTopInset(platform.safeArea(), screen.height, h)
  renderer.draw(
    game,
    cam,
    w,
    h,
    insets.top,
    { best, dailyBest, dateLabel: dailyLabel(todayKey), streak: streak.last === todayKey ? streak.count : streak.count, muted: sfx.muted },
    { continuesLeft: continuesLeft(game), maxContinues: TUNING.maxContinues, adBusy },
    now,
  )
}

async function boot(): Promise<void> {
  await platform.init()
  platform.applyScreenPolicy()
  window.addEventListener('resize', resize)
  window.visualViewport?.addEventListener('resize', resize)
  window.visualViewport?.addEventListener('scroll', resize)
  resize()
  requestAnimationFrame(frame)
}

void boot()
