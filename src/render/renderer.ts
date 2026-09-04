/**
 * 캔버스 렌더러 — 밝은 카툰. 도형·굵은 외곽선·오프셋 그림자. 에셋 없음.
 * 월드: x는 논리 px(393 기준), 층 i의 바닥 y = i * blockH (위로 갈수록 커진다). 화면 변환은 cam.y가 담당.
 */
import type { Game, Layer } from '../core/game'
import { floors } from '../core/game'
import { TUNING } from '../core/tuning'
import { BUILD } from '../version'

export interface Camera {
  /** 화면 아래에서 tower 바닥(층 0)의 바닥이 얼마나 위에 있는가 (월드 px) — 클수록 탑이 내려가 보인다 */
  y: number
}

/** 결과 카드가 필요로 하는 바깥 상태 */
export interface DeathUi {
  continuesLeft: number
  maxContinues: number
  adBusy: boolean
}

/** HUD·시작 화면이 필요로 하는 바깥 상태 */
export interface HudInfo {
  best: number
  dailyBest: number
  dateLabel: string
  streak: number
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const COL = {
  ink: '#243447',
  inkSoft: '#5b6b80',
  card: '#ffffff',
  cardTint: '#eef6ff',
  accent: '#ff7f3f',
  gold: '#ffcc33',
  scrim: 'rgba(36,52,71,0.38)',
}
const FONT = 'system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif'
/** 층 색 — 6색 순환, 밝은 파스텔 */
const BLOCK_COLORS = ['#ff8a80', '#ffb74d', '#fff176', '#aed581', '#4fc3f7', '#b39ddb']

interface FallingPiece {
  x: number
  y: number
  w: number
  vy: number
  vx: number
  rot: number
  vr: number
  color: string
  t0: number
}
interface Popup {
  text: string
  x: number
  y: number
  t0: number
  color: string
}
interface DeathFx {
  t0: number
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const easeOutBack = (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2)

export class Renderer {
  private pieces: FallingPiece[] = []
  private popups: Popup[] = []
  private death: DeathFx | null = null
  private deathButtons: { continue: Rect | null; retry: Rect | null; rank: Rect | null } = { continue: null, retry: null, rank: null }
  /** 낙하 연출: 놓인 순간의 층과 시각 */
  private dropAt = -1e9
  private shakeAt = -1e9

  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  reset(): void {
    this.pieces = []
    this.popups = []
    this.death = null
  }

  hitDeathButton(x: number, y: number): 'continue' | 'retry' | 'rank' | null {
    const inside = (r: Rect | null) => !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
    if (inside(this.deathButtons.continue)) return 'continue'
    if (inside(this.deathButtons.retry)) return 'retry'
    if (inside(this.deathButtons.rank)) return 'rank'
    return null
  }

  /** 층이 늘었을 때 잘린 조각·팝업을 만든다 — main이 events를 읽고 부른다 */
  onPlaced(g: Game, now: number, perfect: boolean): void {
    const top = g.layers[g.layers.length - 1]!
    const i = g.layers.length - 1
    const color = BLOCK_COLORS[i % BLOCK_COLORS.length]!
    this.dropAt = now
    if (!perfect) {
      const off = g.lastOffset
      const w = Math.abs(off)
      if (w > 0.5) {
        const x = off > 0 ? top.x + top.w : top.x - w
        this.pieces.push({ x, y: i * TUNING.blockH, w, vy: 40, vx: off > 0 ? 60 : -60, rot: 0, vr: (off > 0 ? 1 : -1) * 2.2, color, t0: now })
      }
    } else {
      this.popups.push({ text: g.combo >= 2 ? `딱! ×${g.combo}` : '딱!', x: top.x + top.w / 2, y: (i + 1) * TUNING.blockH, t0: now, color: COL.gold })
    }
  }

  onGrow(g: Game, now: number): void {
    const top = g.layers[g.layers.length - 1]!
    this.popups.push({ text: '폭 회복!', x: top.x + top.w / 2, y: (g.layers.length + 0.6) * TUNING.blockH, t0: now, color: '#aed581' })
  }

  onMiss(g: Game, now: number): void {
    const m = g.mover
    const i = g.layers.length
    const color = BLOCK_COLORS[i % BLOCK_COLORS.length]!
    this.pieces.push({ x: m.x, y: i * TUNING.blockH, w: m.w, vy: 0, vx: m.dir * 40, rot: 0, vr: m.dir * 1.6, color, t0: now })
    this.shakeAt = now
  }

  draw(g: Game, cam: Camera, w: number, h: number, topInset: number, hud: HudInfo, ui: DeathUi, now: number): void {
    const ctx = this.ctx
    const u = h / TUNING.viewH
    const s = w / TUNING.viewW // 월드→화면 (가로 기준)
    const bh = TUNING.blockH
    if (g.phase === 'dead' && !this.death) this.death = { t0: now }
    if (g.phase !== 'dead') {
      this.death = null
      this.deathButtons = { continue: null, retry: null, rank: null }
    }
    const deadT = this.death ? now - this.death.t0 : 0
    // 월드 y(위로 +) → 화면 y. 바닥의 바닥이 화면 아래에서 cam.y 만큼 위
    const toY = (wy: number) => h - (wy - cam.y) * s
    const toX = (wx: number) => wx * s

    this.drawSky(w, h, cam, s, now)

    // 흔들림 (빗나감)
    ctx.save()
    const sk = clamp01(1 - (now - this.shakeAt) / 350)
    if (sk > 0) ctx.translate(Math.sin(now / 18) * 6 * u * sk, 0)

    // 땅
    const groundY = toY(0)
    ctx.fillStyle = '#8bd36a'
    ctx.fillRect(0, groundY, w, h - groundY + 50)
    ctx.strokeStyle = COL.ink
    ctx.lineWidth = 3 * u
    ctx.beginPath()
    ctx.moveTo(0, groundY)
    ctx.lineTo(w, groundY)
    ctx.stroke()

    // 층
    const first = Math.max(0, Math.floor((cam.y - bh) / bh) - 1)
    for (let i = first; i < g.layers.length; i++) {
      const L = g.layers[i]!
      const y = toY((i + 1) * bh)
      if (y > h + bh * s) continue
      if (y < -bh * s) break
      const squash = i === g.layers.length - 1 && i > 0 ? 1 - 0.18 * clamp01(1 - (now - this.dropAt) / 160) : 1
      this.block(toX(L.x), y + bh * s * (1 - squash), L.w * s, bh * s * squash, BLOCK_COLORS[i % BLOCK_COLORS.length]!, u, L.perfect)
    }

    // 잘린 조각
    const dt = 1 / 60
    this.pieces = this.pieces.filter((p) => now - p.t0 < 2000)
    for (const p of this.pieces) {
      p.vy -= 1400 * dt
      p.y += p.vy * dt
      p.x += p.vx * dt
      p.rot += p.vr * dt
      ctx.save()
      ctx.translate(toX(p.x + p.w / 2), toY(p.y + bh / 2))
      ctx.rotate(-p.rot)
      ctx.globalAlpha = clamp01(1 - (now - p.t0 - 1200) / 800)
      this.block(-(p.w * s) / 2, -(bh * s) / 2, p.w * s, bh * s, p.color, u, false)
      ctx.restore()
    }

    // 이동 블록
    if (g.phase === 'playing') {
      const m = g.mover
      const y = toY((g.layers.length + 1) * bh)
      ctx.fillStyle = 'rgba(36,52,71,0.12)'
      ctx.fillRect(toX(m.x) + 6 * u, y + 6 * u, m.w * s, bh * s)
      this.block(toX(m.x), y, m.w * s, bh * s, BLOCK_COLORS[g.layers.length % BLOCK_COLORS.length]!, u, false)
      // 아래 블록 가장자리 가이드 — "어디에 맞추는지"가 항상 보여야 죽음이 납득된다
      const top = g.layers[g.layers.length - 1]!
      ctx.setLineDash([4 * u, 5 * u])
      ctx.strokeStyle = 'rgba(36,52,71,0.35)'
      ctx.lineWidth = 2 * u
      ctx.beginPath()
      ctx.moveTo(toX(top.x), y - 6 * u)
      ctx.lineTo(toX(top.x), y + bh * s + 6 * u)
      ctx.moveTo(toX(top.x + top.w), y - 6 * u)
      ctx.lineTo(toX(top.x + top.w), y + bh * s + 6 * u)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // 팝업
    this.popups = this.popups.filter((p) => now - p.t0 < 900)
    for (const p of this.popups) {
      const t = (now - p.t0) / 900
      ctx.save()
      ctx.globalAlpha = 1 - t * t
      ctx.translate(toX(p.x), toY(p.y) - 26 * u - t * 40 * u)
      ctx.rotate(-0.08)
      const sc = 0.6 + 0.4 * easeOutBack(clamp01(t * 4))
      ctx.scale(sc, sc)
      ctx.font = `900 ${Math.round(22 * u)}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = COL.ink
      ctx.lineWidth = 5 * u
      ctx.strokeText(p.text, 0, 0)
      ctx.fillStyle = p.color
      ctx.fillText(p.text, 0, 0)
      ctx.restore()
    }
    ctx.restore()

    this.drawHud(g, w, h, u, topInset, hud)
    if (g.phase === 'ready') this.drawReady(w, h, u, now, hud)
    if (this.death) this.drawDeathCard(g, w, h, u, deadT, hud, ui)
  }

  // ── 배경 ──────────────────────────────────────────────────────────

  /** 하늘: 층수에 따라 낮 → 노을 → 밤 → 우주. 구름은 월드 고도에 고정(패럴랙스) */
  private drawSky(w: number, h: number, cam: Camera, s: number, now: number): void {
    const ctx = this.ctx
    const alt = cam.y / (TUNING.blockH * 80) // 0 = 땅, 1 = 80층
    const stops: Array<[number, string, string]> = [
      [0, '#bfe8f5', '#e8f7ff'],
      [0.35, '#ffb37a', '#ffe3c2'],
      [0.7, '#2c3e6b', '#6b7fb3'],
      [1.2, '#0b1030', '#26305e'],
    ]
    let a = stops[0]!
    let b = stops[stops.length - 1]!
    for (let i = 0; i < stops.length - 1; i++) {
      if (alt >= stops[i]![0] && alt < stops[i + 1]![0]) {
        a = stops[i]!
        b = stops[i + 1]!
      }
    }
    const t = clamp01((alt - a[0]) / Math.max(1e-6, b[0] - a[0]))
    const mix = (c1: string, c2: string) => {
      const p = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
      const [r1, g1, b1] = p(c1)
      const [r2, g2, b2] = p(c2)
      return `rgb(${Math.round(r1! + (r2! - r1!) * t)},${Math.round(g1! + (g2! - g1!) * t)},${Math.round(b1! + (b2! - b1!) * t)})`
    }
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, mix(a[1], b[1]))
    grad.addColorStop(1, mix(a[2], b[2]))
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    // 별 (밤 이상)
    if (alt > 0.5) {
      ctx.fillStyle = `rgba(255,255,255,${clamp01((alt - 0.5) / 0.4)})`
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 97) % 393) * s
        const sy = (((i * 61) % 900) - ((cam.y * 0.15) % 900) + 900) % 900
        const r = (i % 3 === 0 ? 2 : 1.2) * s
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // 구름 — 월드 고도 고정, 느린 패럴랙스
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    for (let i = 0; i < 6; i++) {
      const wy = 260 + i * 330
      const sy = h - (wy - cam.y * 0.6) * s
      if (sy < -60 || sy > h + 60) continue
      const sx = ((i * 140 + now / (90 + i * 20)) % (393 + 160)) * s - 80 * s
      this.cloud(sx, sy, (0.8 + (i % 3) * 0.25) * s)
    }
  }

  private cloud(x: number, y: number, k: number): void {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.arc(x, y, 22 * k, 0, Math.PI * 2)
    ctx.arc(x + 26 * k, y - 10 * k, 28 * k, 0, Math.PI * 2)
    ctx.arc(x + 56 * k, y, 22 * k, 0, Math.PI * 2)
    ctx.fill()
  }

  // ── 블록 ──────────────────────────────────────────────────────────

  private block(x: number, y: number, w: number, h: number, fill: string, u: number, perfect: boolean): void {
    const ctx = this.ctx
    const r = Math.min(8 * u, h / 3)
    ctx.fillStyle = COL.ink
    this.roundRect(x + 3 * u, y + 3 * u, w, h, r)
    ctx.fill()
    this.roundRect(x, y, w, h, r)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = COL.ink
    ctx.lineWidth = 2.5 * u
    ctx.stroke()
    // 윗면 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    this.roundRect(x + 4 * u, y + 3 * u, Math.max(0, w - 8 * u), h * 0.28, r * 0.6)
    ctx.fill()
    if (perfect && w > 30 * u) {
      ctx.fillStyle = COL.gold
      this.star(x + w - 12 * u, y + h / 2, 5 * u)
    }
  }

  // ── HUD·화면 ──────────────────────────────────────────────────────

  private drawHud(g: Game, w: number, h: number, u: number, topInset: number, hud: HudInfo): void {
    const ctx = this.ctx
    const top = topInset + 16 * u
    const n = floors(g)
    // 층수 (왼쪽 위)
    ctx.font = `900 ${Math.round(28 * u)}px ${FONT}`
    const t = `${n}층`
    const tw = ctx.measureText(t).width + 30 * u
    this.chip(14 * u, top, tw, 46 * u, COL.card, 3 * u)
    ctx.fillStyle = COL.ink
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(t, 29 * u, top + 33 * u)
    // 오늘 최고 (그 아래)
    ctx.font = `800 ${Math.round(13 * u)}px ${FONT}`
    const bt = `오늘 ${Math.max(hud.dailyBest, n)}층 · 역대 ${Math.max(hud.best, n)}층`
    // 좌우 여백을 12u로 맞춘다: [12u][별 11u][6u][글자][12u]
    const bw = ctx.measureText(bt).width + 41 * u
    const by = top + 52 * u
    this.chip(14 * u, by, bw, 30 * u, COL.gold, 3 * u)
    // 별은 chip()이 남긴 금색 fillStyle을 물려받아 금색-위-금색으로 안 보였다 —
    // 보이지 않는 별이 왼쪽 여백만 잡아먹어 좌우가 어긋나 보였다 (B4에서 수정)
    ctx.fillStyle = COL.ink
    this.star(31.5 * u, by + 15 * u, 5.5 * u)
    ctx.fillStyle = COL.ink
    ctx.fillText(bt, 43 * u, by + 20 * u)
    // 오늘의 탑 (오른쪽 위)
    ctx.font = `800 ${Math.round(12 * u)}px ${FONT}`
    const dt = `${hud.dateLabel}의 탑`
    const dw = ctx.measureText(dt).width + 24 * u
    this.chip(w - 14 * u - dw, top + 8 * u, dw, 28 * u, COL.card, 2 * u)
    ctx.fillStyle = COL.inkSoft
    ctx.fillText(dt, w - 14 * u - dw + 12 * u, top + 27 * u)
    // 빌드 표식
    ctx.font = `700 ${Math.round(12 * u)}px ${FONT}`
    ctx.textAlign = 'right'
    ctx.globalAlpha = 0.5
    ctx.fillStyle = COL.ink
    ctx.fillText(`B${BUILD}`, w - 10 * u, h - 8 * u)
    ctx.globalAlpha = 1
  }

  private drawReady(w: number, h: number, u: number, now: number, hud: HudInfo): void {
    const ctx = this.ctx
    const cx = w / 2
    const ty = h * 0.34
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = `900 ${Math.round(56 * u)}px ${FONT}`
    ctx.lineJoin = 'round'
    ctx.strokeStyle = COL.ink
    ctx.lineWidth = 8 * u
    ctx.strokeText('높이높이', cx, ty)
    ctx.fillStyle = COL.accent
    ctx.fillText('높이높이', cx, ty)
    this.pill('오늘의 탑, 몇 층까지?', cx, ty + 30 * u, `800 ${Math.round(14 * u)}px ${FONT}`, COL.card, COL.ink, 12 * u, 0, u, true)
    const info = hud.streak > 1 ? `${hud.dateLabel} · ${hud.streak}일째 쌓는 중` : `${hud.dateLabel} · 오늘 처음`
    this.pill(info, cx, ty + 64 * u, `800 ${Math.round(13 * u)}px ${FONT}`, COL.gold, COL.ink, 12 * u, 0, u, true)
    // 조작 안내
    this.pill('탭하면 블록이 떨어져요 · 딱 맞추면 안 잘려요', cx, h * 0.62, `700 ${Math.round(12 * u)}px ${FONT}`, COL.card, COL.inkSoft, 12 * u, 0, u, true)
    ctx.save()
    ctx.translate(cx, h * 0.62 + 52 * u)
    const pulse = 1 + 0.03 * Math.sin(now / 260)
    ctx.scale(pulse, pulse)
    this.pill('탭해서 시작', 0, 0, `900 ${Math.round(17 * u)}px ${FONT}`, COL.accent, '#ffffff', 34 * u, 4 * u, u, false, 46 * u)
    ctx.restore()
  }

  private drawDeathCard(g: Game, w: number, h: number, u: number, deadT: number, hud: HudInfo, ui: DeathUi): void {
    const ctx = this.ctx
    const scrim = clamp01((deadT - 250) / 350)
    if (scrim <= 0) return
    ctx.fillStyle = COL.scrim
    ctx.globalAlpha = scrim
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1
    const cx = w / 2
    const cardW = 300 * u
    const cardH = 150 * u
    const cardY = h / 2 - 40 * u
    const tp = clamp01((deadT - 300) / 380)
    if (tp > 0) {
      ctx.save()
      ctx.translate(cx, cardY - 56 * u)
      const sc = 0.5 + 0.5 * easeOutBack(tp)
      ctx.scale(sc, sc)
      ctx.rotate(-6 * (Math.PI / 180))
      ctx.globalAlpha = Math.min(1, tp * 2)
      this.starburst(0, 0, 100 * u, 62 * u, 12)
      ctx.fillStyle = COL.gold
      ctx.fill()
      ctx.strokeStyle = COL.ink
      ctx.lineWidth = 3 * u
      ctx.lineJoin = 'round'
      ctx.stroke()
      ctx.fillStyle = COL.ink
      ctx.font = `900 ${Math.round(44 * u)}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('끝', 0, 2 * u)
      ctx.restore()
    }
    const cp = clamp01((deadT - 450) / 300)
    if (cp <= 0) return
    const n = floors(g)
    ctx.save()
    ctx.globalAlpha = cp
    ctx.translate(0, (1 - cp) * 20 * u)
    this.card(cx - cardW / 2, cardY, cardW, cardH, 20 * u, 4 * u)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = COL.inkSoft
    ctx.font = `800 ${Math.round(14 * u)}px ${FONT}`
    ctx.fillText('이번 탑', cx, cardY + 32 * u)
    const countP = clamp01((deadT - 550) / 650)
    const shown = Math.round(n * (1 - Math.pow(1 - countP, 3)))
    ctx.fillStyle = COL.ink
    ctx.font = `900 ${Math.round(56 * u)}px ${FONT}`
    ctx.fillText(`${shown}층`, cx, cardY + 88 * u)
    const bp = clamp01((deadT - 1250) / 300)
    if (bp > 0) {
      ctx.save()
      ctx.translate(cx, cardY + 122 * u)
      ctx.scale(easeOutBack(bp), easeOutBack(bp))
      const isDaily = n > hud.dailyBest
      const isBest = n > hud.best
      const label = isBest ? '역대 신기록!' : isDaily ? '오늘 신기록!' : `오늘 최고 ${hud.dailyBest}층`
      this.pill(`${label} · 딱 ${g.perfects}번`, 0, 0, `800 ${Math.round(14 * u)}px ${FONT}`, COL.gold, COL.ink, 12 * u, 0, u, true)
      ctx.restore()
    }
    ctx.restore()
    const hp = clamp01((deadT - 1500) / 300)
    this.deathButtons = { continue: null, retry: null, rank: null }
    if (hp > 0) {
      ctx.save()
      ctx.globalAlpha = hp
      // 버튼은 두 줄이다 — 주 행동 하나(꽉 찬 폭) + 보조 둘(반반).
      // 세 줄로 늘어놨더니 "장황하다"는 지적을 받았다(2026-09-05)
      const btnW = 260 * u
      const halfW = 124 * u
      const y1 = cardY + cardH + 40 * u
      const y2 = y1 + 58 * u
      const primaryH = 52 * u
      const secondH = 44 * u
      if (ui.continuesLeft > 0) {
        // 「광고」는 문구에 남긴다 — 심사·GRAC 문서에 "버튼 문구에 광고를 명시"로 적었다
        const label = ui.adBusy ? '광고 불러오는 중…' : '광고 보고 이어하기'
        ctx.save()
        ctx.translate(cx, y1)
        if (ui.adBusy) ctx.globalAlpha = hp * 0.7
        this.chip(-btnW / 2, -primaryH / 2, btnW, primaryH, COL.accent, 4 * u)
        ctx.fillStyle = '#ffffff'
        ctx.font = `900 ${Math.round(16 * u)}px ${FONT}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const badge = `${ui.maxContinues - ui.continuesLeft + 1}/${ui.maxContinues}`
        const labelW = ctx.measureText(label).width
        const badgeW = 32 * u
        const gap = 7 * u
        const total = labelW + (ui.adBusy ? 0 : gap + badgeW)
        ctx.fillText(label, -total / 2 + labelW / 2, 1 * u)
        if (!ui.adBusy) {
          const bx = -total / 2 + labelW + gap
          this.chip(bx, -10 * u, badgeW, 20 * u, COL.gold, 0)
          ctx.fillStyle = COL.ink
          ctx.font = `800 ${Math.round(11 * u)}px ${FONT}`
          ctx.fillText(badge, bx + badgeW / 2, 1 * u)
        }
        ctx.restore()
        this.deathButtons.continue = { x: cx - btnW / 2, y: y1 - primaryH / 2, w: btnW, h: primaryH }
        // 보조 둘 — 나란히
        this.flatButton('다시', cx - (halfW + 12 * u) / 2, y2, halfW, secondH, COL.card, COL.inkSoft, u, 0, 15, 'replay')
        this.deathButtons.retry = { x: cx - (halfW + 12 * u) / 2 - halfW / 2, y: y2 - secondH / 2, w: halfW, h: secondH }
        this.flatButton('순위', cx + (halfW + 12 * u) / 2, y2, halfW, secondH, COL.card, COL.inkSoft, u, 0, 15, 'rank')
        this.deathButtons.rank = { x: cx + (halfW + 12 * u) / 2 - halfW / 2, y: y2 - secondH / 2, w: halfW, h: secondH }
      } else {
        // 이어하기를 다 쓰면 「다시 하기」가 주 행동이 된다
        this.flatButton('다시 하기', cx, y1, btnW, primaryH, COL.accent, '#ffffff', u, 4 * u, 17)
        this.deathButtons.retry = { x: cx - btnW / 2, y: y1 - primaryH / 2, w: btnW, h: primaryH }
        this.flatButton('순위', cx, y2, halfW, secondH, COL.card, COL.inkSoft, u, 0, 15, 'rank')
        this.deathButtons.rank = { x: cx - halfW / 2, y: y2 - secondH / 2, w: halfW, h: secondH }
      }
      ctx.restore()
    }
  }

  // ── 도형 헬퍼 ──────────────────────────────────────────────────────

  private card(x: number, y: number, w: number, h: number, r: number, shadow: number): void {
    const ctx = this.ctx
    ctx.fillStyle = COL.ink
    this.roundRect(x + shadow, y + shadow, w, h, r)
    ctx.fill()
    this.roundRect(x, y, w, h, r)
    ctx.fillStyle = COL.card
    ctx.fill()
    ctx.strokeStyle = COL.ink
    ctx.lineWidth = 2.5
    ctx.stroke()
  }

  private chip(x: number, y: number, w: number, h: number, fill: string, shadow: number): void {
    const ctx = this.ctx
    if (shadow > 0) {
      ctx.fillStyle = COL.ink
      this.roundRect(x + shadow, y + shadow, w, h, h / 2)
      ctx.fill()
    }
    this.roundRect(x, y, w, h, h / 2)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = COL.ink
    ctx.lineWidth = Math.max(1.5, shadow * 0.66)
    ctx.stroke()
  }

  /**
   * 폭이 정해진 버튼 — 결과 카드의 두 줄 배치용.
   * `pill`은 글자 길이만큼 늘어나서 나란히 놓으면 크기가 제각각이 된다
   */
  private flatButton(
    text: string,
    cx: number,
    cy: number,
    w: number,
    h: number,
    fill: string,
    color: string,
    u: number,
    shadow = 0,
    fontPx = 15,
    icon?: 'replay' | 'rank',
  ): void {
    const ctx = this.ctx
    this.chip(cx - w / 2, cy - h / 2, w, h, fill, shadow)
    if (shadow === 0) {
      ctx.strokeStyle = COL.ink
      ctx.lineWidth = 2 * u
      this.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2)
      ctx.stroke()
    }
    ctx.font = `${shadow > 0 ? 900 : 800} ${Math.round(fontPx * u)}px ${FONT}`
    ctx.textBaseline = 'middle'
    if (icon) {
      // 아이콘 + 글자를 한 덩어리로 보고 가운데 맞춘다
      const iconS = 18 * u
      const gap = 6 * u
      const textW = ctx.measureText(text).width
      const left = cx - (iconS + gap + textW) / 2
      if (icon === 'replay') this.iconReplay(left + iconS / 2, cy, iconS / 2, u)
      else this.iconRank(left + iconS / 2, cy, iconS)
      ctx.fillStyle = color
      ctx.textAlign = 'left'
      ctx.fillText(text, left + iconS + gap, cy + 1 * u)
    } else {
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.fillText(text, cx, cy + 1 * u)
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
  }

  /** 되감기 화살표 — 열린 원호 + 끝의 삼각 화살촉 */
  private iconReplay(cx: number, cy: number, r: number, u: number): void {
    const ctx = this.ctx
    const end = -Math.PI * 0.35 // 화살촉이 앉는 자리(오른쪽 위)
    ctx.strokeStyle = COL.ink
    ctx.lineWidth = 2.4 * u
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.82, end + Math.PI * 0.45, end + Math.PI * 2)
    ctx.stroke()
    ctx.lineCap = 'butt'
    const px = cx + Math.cos(end) * r * 0.82
    const py = cy + Math.sin(end) * r * 0.82
    const tx = Math.cos(end + Math.PI / 2)
    const ty = Math.sin(end + Math.PI / 2)
    const nx = Math.cos(end)
    const ny = Math.sin(end)
    ctx.beginPath()
    ctx.moveTo(px + tx * r * 0.62, py + ty * r * 0.62)
    ctx.lineTo(px + nx * r * 0.5, py + ny * r * 0.5)
    ctx.lineTo(px - nx * r * 0.5, py - ny * r * 0.5)
    ctx.closePath()
    ctx.fillStyle = COL.ink
    ctx.fill()
  }

  /** 시상대 — 게임의 블록 세 칸(1위 가운데). 컨셉이 곧 아이콘이다 */
  private iconRank(cx: number, cy: number, s: number): void {
    const ctx = this.ctx
    const k = s / 24
    const bar = (x: number, y: number, w: number, h: number, color: string) => {
      const rx = cx + (x - 12) * k
      const ry = cy + (y - 12.5) * k
      this.roundRect(rx, ry, w * k, h * k, 1.6 * k)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = COL.ink
      ctx.lineWidth = Math.max(1.2, 2.2 * k)
      ctx.lineJoin = 'round'
      ctx.stroke()
    }
    bar(2.4, 11, 6.6, 8, '#4fc3f7')
    bar(15.6, 13.4, 6, 5.6, '#aed581')
    bar(9, 6, 6.6, 13, COL.gold)
  }

  private pill(text: string, cx: number, cy: number, font: string, fill: string, color: string, padX: number, shadow: number, u: number, thin: boolean, height?: number): void {
    const ctx = this.ctx
    ctx.font = font
    const tw = ctx.measureText(text).width
    const size = Number.parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? '14')
    const h = height ?? size + 12 * u
    const w = tw + padX * 2
    this.chip(cx - w / 2, cy - h / 2, w, h, fill, shadow)
    if (thin) {
      ctx.strokeStyle = COL.ink
      ctx.lineWidth = 2 * u
      this.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2)
      ctx.stroke()
    }
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, cx, cy + 1 * u)
    ctx.textBaseline = 'alphabetic'
  }

  private star(cx: number, cy: number, r: number): void {
    const ctx = this.ctx
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const rr = i % 2 === 0 ? r : r * 0.45
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
    }
    ctx.closePath()
    ctx.fill()
  }

  private starburst(cx: number, cy: number, rx: number, ry: number, points: number): void {
    const ctx = this.ctx
    ctx.beginPath()
    for (let i = 0; i < points * 2; i++) {
      const a = (i * Math.PI) / points
      const k = i % 2 === 0 ? 1 : 0.8
      ctx.lineTo(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k)
    }
    ctx.closePath()
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx
    const rr = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.lineTo(x + w - rr, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
    ctx.lineTo(x + w, y + h - rr)
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
    ctx.lineTo(x + rr, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
    ctx.lineTo(x, y + rr)
    ctx.quadraticCurveTo(x, y, x + rr, y)
    ctx.closePath()
  }
}

export type { Layer }
