// 높이높이 디자인 컨셉 3안 — 아트보드 생성기. `node gen.mjs` → *.dc.html + canvas.json
import { writeFileSync } from 'node:fs'
const W = 393, H = 749, BH = 34
const KO = `-apple-system, 'Apple SD Gothic Neo', 'Pretendard', system-ui, sans-serif`
const MONO = `ui-monospace, 'SF Mono', Menlo, 'Apple SD Gothic Neo', monospace`

// 플레이 화면 공통 탑(52층, 보이는 12층) — 세 안 모두 같은 형태로 비교 공정
const TOP_Y = Math.round(H * 0.42)
const PLAY = [
  { w: 158, x: 118, p: false }, { w: 158, x: 118, p: true }, { w: 152, x: 124, p: false }, { w: 152, x: 124, p: true },
  { w: 152, x: 124, p: true }, { w: 146, x: 124, p: false }, { w: 146, x: 124, p: true }, { w: 140, x: 130, p: false },
  { w: 140, x: 130, p: true }, { w: 140, x: 130, p: true }, { w: 134, x: 136, p: false }, { w: 134, x: 136, p: true },
]
const playY = (k) => TOP_Y + (PLAY.length - 1 - k) * BH
const MOVER = { x: 44, w: 134, y: TOP_Y - BH }

const page = (title, bodyCss, inner) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin: 0; ${bodyCss} }
    a { color: inherit; } a:hover { color: inherit; }
    * { box-sizing: border-box; }
  </style>
</helmet>
<div data-title="${title}" style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; ${bodyCss}">
${inner}
</div>
</x-dc>
</body>
</html>
`
const abs = (x, y, w, h, style, inner = '') =>
  `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; ${style}">${inner}</div>`

// ───────────────────────── A. 청사진 (Blueprint) ─────────────────────────
const A = {
  bg: '#0e2a4f', line: 'rgba(255,255,255,0.08)', lineBold: 'rgba(255,255,255,0.16)', ink: '#eaf2ff', dim: 'rgba(234,242,255,0.55)',
  cyan: '#6fd3ff', red: '#ff5d4d',
}
const aGrid = `background-color: ${A.bg}; background-image:
  linear-gradient(${A.lineBold} 1px, transparent 1px), linear-gradient(90deg, ${A.lineBold} 1px, transparent 1px),
  linear-gradient(${A.line} 1px, transparent 1px), linear-gradient(90deg, ${A.line} 1px, transparent 1px);
  background-size: 170px 170px, 170px 170px, 34px 34px, 34px 34px; background-position: -1px -1px; color: ${A.ink}; font-family: ${KO};`
const aBlock = (x, y, w, perfect, opts = {}) => {
  const fill = perfect
    ? `background-color: rgba(111,211,255,0.10); background-image: repeating-linear-gradient(135deg, rgba(111,211,255,0.35) 0 1px, transparent 1px 7px);`
    : `background-color: rgba(255,255,255,0.06);`
  const border = opts.mover ? `border: 1.5px dashed ${A.cyan};` : `border: 1.5px solid ${A.ink};`
  return abs(x, y, w, BH, `${border} ${fill} ${opts.extra ?? ''}`)
}
const aDimLabel = (x, y, text, color = A.dim) =>
  abs(x, y, 80, 14, `font-family: ${MONO}; font-size: 10px; letter-spacing: 0.04em; color: ${color}; white-space: nowrap;`, text)
const aTitleBlock = (dateText) => `
  <div style="position: absolute; left: 16px; right: 16px; top: 18px; display: flex; justify-content: space-between; align-items: flex-start;">
    <div style="display: flex; flex-direction: column; gap: 2px;">
      <div style="font-family: ${MONO}; font-size: 10px; letter-spacing: 0.14em; color: ${A.dim};">DWG · 오늘의 탑</div>
      <div style="font-family: ${MONO}; font-size: 13px; letter-spacing: 0.06em; color: ${A.ink};">${dateText}</div>
    </div>
    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
      <div style="font-family: ${MONO}; font-size: 10px; letter-spacing: 0.14em; color: ${A.dim};">REV</div>
      <div style="font-family: ${MONO}; font-size: 13px; color: ${A.ink};">B2</div>
    </div>
  </div>`
const aCorner = `
  ${abs(8, 8, W - 16, H - 16, `border: 1px solid rgba(255,255,255,0.28); pointer-events: none;`)}
  ${abs(8, 8, 10, 10, `border-left: 2px solid ${A.ink}; border-top: 2px solid ${A.ink};`)}
  ${abs(W - 18, 8, 10, 10, `border-right: 2px solid ${A.ink}; border-top: 2px solid ${A.ink};`)}
  ${abs(8, H - 18, 10, 10, `border-left: 2px solid ${A.ink}; border-bottom: 2px solid ${A.ink};`)}
  ${abs(W - 18, H - 18, 10, 10, `border-right: 2px solid ${A.ink}; border-bottom: 2px solid ${A.ink};`)}`

// A · 시작
const aStart = () => {
  const groundY = 640
  let s = aCorner + aTitleBlock('2026-09-04 · 오늘 처음')
  // 땅: 굵은 선 + 해칭
  s += abs(0, groundY, W, 1.5, `background: ${A.ink};`)
  s += abs(0, groundY + 2, W, H - groundY, `background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 1px, transparent 1px 9px);`)
  s += aBlock(101, groundY - BH, 190, false)
  s += aBlock(240, groundY - BH * 2, 190, false, { mover: true })
  // 치수선: 바닥 폭 190
  s += abs(101, groundY + 14, 190, 1, `background: ${A.cyan};`)
  s += abs(101, groundY + 10, 1, 9, `background: ${A.cyan};`)
  s += abs(290, groundY + 10, 1, 9, `background: ${A.cyan};`)
  s += aDimLabel(178, groundY + 20, '190', A.cyan)
  // 타이틀
  s += `<div style="position: absolute; left: 28px; top: 150px; display: flex; flex-direction: column; gap: 14px;">
    <div style="font-family: ${MONO}; font-size: 11px; letter-spacing: 0.22em; color: ${A.cyan};">SHEET 01 / DAILY TOWER</div>
    <div style="font-size: 64px; line-height: 0.98; font-weight: 800; letter-spacing: -0.03em; color: ${A.ink};">높이<br>높이</div>
    <div style="width: 120px; height: 1.5px; background: ${A.ink};"></div>
    <div style="font-size: 15px; line-height: 1.5; color: ${A.dim}; white-space: pre-line;">오늘의 탑, 몇 층까지?
모두가 같은 도면으로 쌓아요.</div>
  </div>`
  // 기록 표 (title block 스타일)
  s += `<div style="position: absolute; left: 28px; top: 386px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 220px; border: 1px solid rgba(255,255,255,0.35);">
    <div style="padding: 6px 10px; border-right: 1px solid rgba(255,255,255,0.35); border-bottom: 1px solid rgba(255,255,255,0.35); font-family: ${MONO}; font-size: 10px; color: ${A.dim}; letter-spacing: 0.1em;">오늘 최고</div>
    <div style="padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.35); font-family: ${MONO}; font-size: 13px; color: ${A.ink}; text-align: right;">— 층</div>
    <div style="padding: 6px 10px; border-right: 1px solid rgba(255,255,255,0.35); font-family: ${MONO}; font-size: 10px; color: ${A.dim}; letter-spacing: 0.1em;">역대 최고</div>
    <div style="padding: 6px 10px; font-family: ${MONO}; font-size: 13px; color: ${A.ink}; text-align: right;">37 층</div>
  </div>`
  // CTA
  s += `<div style="position: absolute; left: 28px; right: 28px; top: 470px; height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: ${A.cyan}; color: #07203c; font-size: 17px; font-weight: 800; letter-spacing: -0.01em;">
    <span>탭해서 시작</span><span style="font-family: ${MONO}; font-size: 11px; letter-spacing: 0.16em; font-weight: 600;">TAP ▸</span>
  </div>`
  s += abs(28, 538, W - 56, 14, `font-family: ${MONO}; font-size: 10px; letter-spacing: 0.08em; color: ${A.dim};`, '탭 = 낙하 · 어긋난 만큼 잘림 · ±7px면 딱')
  return page('A 청사진 · 시작', aGrid, s)
}
// A · 플레이
const aPlay = () => {
  let s = aCorner + aTitleBlock('2026-09-04')
  for (let k = 0; k < PLAY.length; k++) s += aBlock(PLAY[k].x, playY(k), PLAY[k].w, PLAY[k].p)
  s += aBlock(MOVER.x, MOVER.y, MOVER.w, false, { mover: true })
  // 가이드: 아래 블록 가장자리 연장선
  const top = PLAY[PLAY.length - 1]
  s += abs(top.x, MOVER.y - 10, 1, BH + 20, `border-left: 1px dashed rgba(111,211,255,0.7);`)
  s += abs(top.x + top.w, MOVER.y - 10, 1, BH + 20, `border-left: 1px dashed rgba(111,211,255,0.7);`)
  // 층수: 좌측 치수선 형태
  s += abs(24, TOP_Y, 1, H - TOP_Y - 40, `background: rgba(255,255,255,0.35);`)
  s += abs(20, TOP_Y, 9, 1, `background: ${A.ink};`)
  s += `<div style="position: absolute; left: 24px; top: 66px; display: flex; flex-direction: column; gap: 6px;">
    <div style="display: flex; align-items: baseline; gap: 6px;">
      <div style="font-family: ${MONO}; font-size: 56px; font-weight: 700; letter-spacing: -0.04em; color: ${A.ink}; line-height: 1;">52</div>
      <div style="font-family: ${MONO}; font-size: 13px; letter-spacing: 0.1em; color: ${A.dim};">F</div>
    </div>
    <div style="font-family: ${MONO}; font-size: 10px; letter-spacing: 0.1em; color: ${A.dim};">오늘 52 · 역대 52</div>
  </div>`
  // 눈금 라벨
  for (const [k, lbl] of [[8, '48'], [4, '44']]) s += aDimLabel(30, playY(k) + 11, lbl)
  // 콤보 표시 (딱 ×2)
  s += `<div style="position: absolute; left: ${top.x + top.w + 10}px; top: ${playY(PLAY.length - 1) + 9}px; font-family: ${MONO}; font-size: 11px; letter-spacing: 0.12em; color: ${A.cyan};">딱 ×2</div>`
  // 하단 기록
  return page('A 청사진 · 플레이', aGrid, s)
}
// A · 결과
const aResult = () => {
  let s = aCorner + aTitleBlock('2026-09-04')
  for (let k = 0; k < PLAY.length; k++) s += aBlock(PLAY[k].x, playY(k) + 120, PLAY[k].w, PLAY[k].p, { extra: 'opacity: 0.35;' })
  s += abs(0, 0, W, H, `background: rgba(6,20,40,0.55);`)
  // 카드: 도면 표제란
  s += `<div style="position: absolute; left: 28px; right: 28px; top: 150px; border: 1.5px solid ${A.ink}; background: ${A.bg};">
    <div style="display: flex; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.35); font-family: ${MONO}; font-size: 10px; letter-spacing: 0.14em; color: ${A.dim};">
      <span>RESULT · 이번 탑</span><span>2026-09-04</span>
    </div>
    <div style="display: flex; align-items: baseline; gap: 10px; padding: 22px 14px 6px;">
      <div style="font-family: ${MONO}; font-size: 88px; font-weight: 700; letter-spacing: -0.05em; line-height: 1; color: ${A.ink};">112</div>
      <div style="font-size: 20px; font-weight: 700; color: ${A.dim};">층</div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid rgba(255,255,255,0.35);">
      <div style="padding: 10px 14px; border-right: 1px solid rgba(255,255,255,0.35); display: flex; flex-direction: column; gap: 4px;"><span style="font-family: ${MONO}; font-size: 9px; letter-spacing: 0.14em; color: ${A.dim};">딱</span><span style="font-family: ${MONO}; font-size: 16px; color: ${A.ink};">98</span></div>
      <div style="padding: 10px 14px; border-right: 1px solid rgba(255,255,255,0.35); display: flex; flex-direction: column; gap: 4px;"><span style="font-family: ${MONO}; font-size: 9px; letter-spacing: 0.14em; color: ${A.dim};">오늘 최고</span><span style="font-family: ${MONO}; font-size: 16px; color: ${A.cyan};">112 ▲</span></div>
      <div style="padding: 10px 14px; display: flex; flex-direction: column; gap: 4px;"><span style="font-family: ${MONO}; font-size: 9px; letter-spacing: 0.14em; color: ${A.dim};">역대</span><span style="font-family: ${MONO}; font-size: 16px; color: ${A.cyan};">신기록</span></div>
    </div>
  </div>`
  // 스탬프
  s += `<div style="position: absolute; left: 236px; top: 96px; width: 116px; height: 44px; transform: rotate(-9deg); border: 2.5px solid ${A.red}; color: ${A.red}; display: flex; align-items: center; justify-content: center; font-family: ${MONO}; font-size: 16px; font-weight: 700; letter-spacing: 0.24em; background: rgba(14,42,79,0.9);">끝 · END</div>`
  // 버튼
  s += `<div style="position: absolute; left: 28px; right: 28px; top: 428px; display: flex; flex-direction: column; gap: 12px;">
    <div style="height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; background: ${A.cyan}; color: #07203c; font-size: 16px; font-weight: 800;">
      <span>광고 보고 이어하기</span><span style="font-family: ${MONO}; font-size: 12px; letter-spacing: 0.12em; padding: 3px 8px; border: 1.5px solid #07203c;">1/2</span>
    </div>
    <div style="height: 50px; display: flex; align-items: center; justify-content: center; border: 1.5px solid ${A.ink}; color: ${A.ink}; font-size: 15px; font-weight: 700;">다시 하기</div>
  </div>`
  return page('A 청사진 · 결과', aGrid, s)
}

// ───────────────────────── B. 포스터 (Editorial) ─────────────────────────
const B = { bg: '#f3efe6', ink: '#15130f', red: '#e4432a', mute: 'rgba(21,19,15,0.55)', rule: 'rgba(21,19,15,0.18)' }
const bBody = `background: ${B.bg}; color: ${B.ink}; font-family: ${KO};`
const bBlock = (x, y, w, perfect, mover = false) =>
  abs(x, y, w, BH - 3, mover ? `border: 3px solid ${B.red}; background: transparent;` : `background: ${perfect ? B.red : B.ink};`)
const bHeader = (right) => `
  <div style="position: absolute; left: 22px; right: 22px; top: 22px; display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid ${B.ink}; padding-bottom: 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.02em;">
    <span>높이높이</span><span style="color: ${B.mute};">${right}</span>
  </div>`
const bStart = () => {
  const groundY = 664
  let s = bHeader('2026.09.04 · 오늘의 탑')
  s += `<div style="position: absolute; left: 18px; top: 72px; font-size: 128px; line-height: 0.88; font-weight: 900; letter-spacing: -0.06em; color: ${B.ink};">높이<br>높이</div>`
  s += abs(22, 318, 120, 4, `background: ${B.red};`)
  s += `<div style="position: absolute; left: 22px; right: 22px; top: 338px; display: flex; flex-direction: column; gap: 10px;">
    <div style="font-size: 20px; line-height: 1.35; font-weight: 700; letter-spacing: -0.02em;">오늘의 탑, 몇 층까지?</div>
    <div style="font-size: 14px; line-height: 1.55; color: ${B.mute}; white-space: pre-line;">같은 날엔 모두가 같은 탑을 쌓아요.
탭하면 떨어지고, 어긋난 만큼 잘려요.</div>
  </div>`
  s += `<div style="position: absolute; left: 22px; right: 22px; top: 444px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid ${B.rule}; border-bottom: 1px solid ${B.rule};">
    <div style="padding: 12px 0; display: flex; flex-direction: column; gap: 2px; border-right: 1px solid ${B.rule};"><span style="font-size: 11px; color: ${B.mute}; letter-spacing: 0.04em;">역대 최고</span><span style="font-size: 26px; font-weight: 900; letter-spacing: -0.03em;">37</span></div>
    <div style="padding: 12px 0 12px 16px; display: flex; flex-direction: column; gap: 2px;"><span style="font-size: 11px; color: ${B.mute}; letter-spacing: 0.04em;">오늘 최고</span><span style="font-size: 26px; font-weight: 900; letter-spacing: -0.03em;">—</span></div>
  </div>`
  s += `<div style="position: absolute; left: 22px; right: 22px; top: 526px; height: 56px; background: ${B.ink}; color: ${B.bg}; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 800; letter-spacing: -0.01em;">탭해서 시작</div>`
  s += abs(0, groundY, W, 3, `background: ${B.ink};`)
  s += bBlock(101, groundY - BH, 190, false)
  s += bBlock(232, groundY - BH * 2, 190, false, true)
  return page('B 포스터 · 시작', bBody, s)
}
const bPlay = () => {
  let s = bHeader('2026.09.04 · 오늘 52 · 역대 52')
  s += `<div style="position: absolute; left: 14px; top: 46px; display: flex; align-items: baseline; gap: 4px;">
    <div style="font-size: 132px; line-height: 1; font-weight: 900; letter-spacing: -0.07em; color: ${B.ink};">52</div>
    <div style="font-size: 22px; font-weight: 800; color: ${B.ink};">층</div>
  </div>`
  s += `<div style="position: absolute; left: 22px; top: 196px; display: flex; gap: 8px; align-items: center; font-size: 12px; font-weight: 700; color: ${B.red};"><span style="display: inline-block; width: 10px; height: 10px; background: ${B.red};"></span><span>딱 ×2</span></div>`
  for (let k = 0; k < PLAY.length; k++) s += bBlock(PLAY[k].x, playY(k), PLAY[k].w, PLAY[k].p)
  s += bBlock(MOVER.x, MOVER.y, MOVER.w, false, true)
  const top = PLAY[PLAY.length - 1]
  s += abs(top.x, MOVER.y - 12, 1, BH + 24, `border-left: 1.5px dashed ${B.ink}; opacity: 0.5;`)
  s += abs(top.x + top.w, MOVER.y - 12, 1, BH + 24, `border-left: 1.5px dashed ${B.ink}; opacity: 0.5;`)
  // 층 눈금(오른쪽)
  for (const [k, lbl] of [[11, '52'], [7, '48'], [3, '44']]) s += abs(W - 52, playY(k) + 9, 30, 14, `font-size: 11px; font-weight: 700; color: ${B.mute}; text-align: right;`, lbl)
  return page('B 포스터 · 플레이', bBody, s)
}

// ───────────────────────── C. 네온 나이트 (Neon) ─────────────────────────
const C = { bg: '#07070f', ink: '#f2f2ff', dim: 'rgba(242,242,255,0.5)' }
const cBody = `background: radial-gradient(120% 60% at 50% 100%, #14122b 0%, ${C.bg} 60%); color: ${C.ink}; font-family: ${KO};`
// 층수에 따라 색상 회전: 40층대 = 시안~바이올렛
const hue = (i) => 300 - i * 2.2
const cBlock = (x, y, w, i, perfect, mover = false) => {
  const h = hue(i)
  const col = `hsl(${h} 100% ${perfect ? 72 : 62}%)`
  const glow = mover ? `0 0 18px hsl(${h} 100% 60% / 0.9), 0 0 2px ${col}` : `0 0 ${perfect ? 14 : 8}px hsl(${h} 100% 60% / ${perfect ? 0.7 : 0.4})`
  return abs(x, y, w, BH - 4, `border: 1.5px solid ${col}; background: hsl(${h} 60% ${mover ? 22 : 12}% / 0.9); box-shadow: ${glow}; border-radius: 3px;`)
}
const cStart = () => {
  const groundY = 650
  let s = ''
  s += abs(0, groundY, W, 2, `background: #9d7bff; box-shadow: 0 0 16px #9d7bff, 0 0 40px rgba(157,123,255,0.5);`)
  s += cBlock(101, groundY - BH + 2, 190, 0, false)
  s += cBlock(236, groundY - BH * 2 + 2, 190, 1, false, true)
  s += `<div style="position: absolute; left: 0; right: 0; top: 168px; display: flex; flex-direction: column; align-items: center; gap: 18px;">
    <div style="font-size: 12px; letter-spacing: 0.42em; color: ${C.dim}; font-weight: 500;">2026 · 09 · 04</div>
    <div style="font-size: 72px; line-height: 1; font-weight: 200; letter-spacing: 0.12em; color: ${C.ink}; text-shadow: 0 0 18px rgba(157,123,255,0.9), 0 0 48px rgba(157,123,255,0.5);">높이높이</div>
    <div style="font-size: 15px; letter-spacing: 0.06em; color: ${C.dim}; font-weight: 300;">오늘의 탑, 몇 층까지?</div>
  </div>`
  s += `<div style="position: absolute; left: 0; right: 0; top: 372px; display: flex; justify-content: center; gap: 40px;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;"><span style="font-size: 10px; letter-spacing: 0.3em; color: ${C.dim};">역대</span><span style="font-size: 30px; font-weight: 200; letter-spacing: 0.04em;">37</span></div>
    <div style="width: 1px; background: rgba(242,242,255,0.2);"></div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;"><span style="font-size: 10px; letter-spacing: 0.3em; color: ${C.dim};">오늘</span><span style="font-size: 30px; font-weight: 200; letter-spacing: 0.04em;">—</span></div>
  </div>`
  s += `<div style="position: absolute; left: 60px; right: 60px; top: 490px; height: 54px; border-radius: 27px; border: 1.5px solid #9d7bff; color: ${C.ink}; display: flex; align-items: center; justify-content: center; font-size: 15px; letter-spacing: 0.2em; font-weight: 500; box-shadow: 0 0 20px rgba(157,123,255,0.55), inset 0 0 20px rgba(157,123,255,0.25);">탭해서 시작</div>`
  s += abs(0, 560, W, 14, `font-size: 11px; letter-spacing: 0.08em; color: ${C.dim}; text-align: center; font-weight: 300;`, '탭 = 낙하 · 딱 맞추면 안 잘려요')
  return page('C 네온 · 시작', cBody, s)
}
const cPlay = () => {
  let s = ''
  s += `<div style="position: absolute; left: 0; right: 0; top: 44px; display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <div style="font-size: 108px; line-height: 1; font-weight: 200; letter-spacing: -0.02em; color: ${C.ink}; text-shadow: 0 0 22px hsl(${hue(52)} 100% 65% / 0.8);">52</div>
    <div style="font-size: 11px; letter-spacing: 0.36em; color: ${C.dim};">오늘 52 · 역대 52</div>
  </div>`
  for (let k = 0; k < PLAY.length; k++) s += cBlock(PLAY[k].x, playY(k) + 2, PLAY[k].w, 41 + k, PLAY[k].p)
  s += cBlock(MOVER.x, MOVER.y + 2, MOVER.w, 53, false, true)
  const top = PLAY[PLAY.length - 1]
  s += abs(top.x, MOVER.y - 10, 1, BH + 20, `border-left: 1px dashed hsl(${hue(53)} 100% 70% / 0.6);`)
  s += abs(top.x + top.w, MOVER.y - 10, 1, BH + 20, `border-left: 1px dashed hsl(${hue(53)} 100% 70% / 0.6);`)
  s += `<div style="position: absolute; left: ${top.x + top.w + 12}px; top: ${playY(PLAY.length - 1) + 8}px; font-size: 12px; letter-spacing: 0.2em; color: hsl(${hue(52)} 100% 75%); text-shadow: 0 0 10px hsl(${hue(52)} 100% 65%);">딱 ×2</div>`
  s += abs(0, 0, W, H, `background: repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px); pointer-events: none;`)
  s += abs(W - 46, H - 30, 30, 14, `font-size: 10px; letter-spacing: 0.1em; color: rgba(242,242,255,0.3); text-align: right;`, 'B2')
  return page('C 네온 · 플레이', cBody, s)
}

writeFileSync('Main.dc.html', aStart())
writeFileSync('APlay.dc.html', aPlay())
writeFileSync('AResult.dc.html', aResult())
writeFileSync('BStart.dc.html', bStart())
writeFileSync('BPlay.dc.html', bPlay())
writeFileSync('CStart.dc.html', cStart())
writeFileSync('CPlay.dc.html', cPlay())

const row = (y, files, titles) => files.map((f, i) => ({ file: f, x: i * (W + 90), y, w: W, h: H, title: titles[i] }))
const canvas = {
  artboards: [
    ...row(0, ['Main.dc.html', 'APlay.dc.html', 'AResult.dc.html'], ['A 청사진 · 시작', 'A 청사진 · 플레이', 'A 청사진 · 결과']),
    ...row(H + 200, ['BStart.dc.html', 'BPlay.dc.html'], ['B 포스터 · 시작', 'B 포스터 · 플레이']),
    ...row((H + 200) * 2, ['CStart.dc.html', 'CPlay.dc.html'], ['C 네온 · 시작', 'C 네온 · 플레이']),
  ],
  annotations: [
    { id: 'brief', x: -320, y: 0, w: 280, text: '높이높이 디자인 개편 — 3개 방향\n\n현재(B1)는 날아날아의 밝은 카툰 어휘(굵은 외곽선·오프셋 그림자·파스텔·알약 칩)를 그대로 써서 같은 앱처럼 보인다.\n세 안 모두 Canvas 2D·에셋 0·시스템 폰트로 구현 가능한 범위에서 그렸다. 탑·이동 블록·가이드선은 세 안이 같은 형태(52층 장면)라 비교가 공정하다.' },
    { id: 'a-note', x: -320, y: 140, w: 280, text: 'A 청사진 (추천)\n"탑을 쌓는다 = 건축 도면". 진한 청색 종이 + 격자 + 흰 선 블록, 딱 맞춘 층은 해칭. 층수는 치수선처럼 읽힌다. 일일 시드가 "오늘의 도면(DWG·날짜)"으로 자연스럽게 서사가 된다.\n\n장점: 선만으로 그려 Canvas 구현이 가장 쉽고 가볍다. 세 형제 앱과 완전히 다른 톤.\n트레이드오프: 차가운 인상 — 캐주얼 토스 이용자에겐 "귀엽지 않다"고 읽힐 수 있다. 밤·우주 같은 고도 변화 연출은 격자 밀도·선 색으로 대체해야 한다.' },
    { id: 'b-note', x: -320, y: H + 200, w: 280, text: 'B 포스터\n오프화이트 종이 + 검정 + 버밀리언 하나. 거대한 층수 타이포가 화면의 주인공, 블록은 검정 막대(딱 맞춘 층만 빨강).\n\n장점: 스크린샷 한 장이 포스터처럼 보여 공유·스토어 노출에 강하다. 밝은 배경이라 낮에도 잘 보인다.\n트레이드오프: 블록이 전부 검정이라 "올라간다"는 보상감이 약하다. 층수 숫자가 화면 위 1/4을 차지해 카메라(맨 위 층 42%) 여유가 줄어든다.' },
    { id: 'c-note', x: -320, y: (H + 200) * 2, w: 280, text: 'C 네온 나이트\n거의 검정 배경 + 발광 테두리 블록. 하늘 색이 아니라 블록의 색상(hue)이 층수마다 돌아가서 "올라감"을 표현한다. 얇은 200 웨이트 타이포.\n\n장점: 하이스코어 게임 문법에 가장 익숙하고, 어두운 배경에서 이어하기 버튼·광고 전환이 두드러진다.\n트레이드오프: 글로우(shadowBlur)는 모바일 Canvas에서 비싸다 — 층당 1회 그리기라 감당은 되지만 계측 필요. 하이퍼캐주얼 네온은 흔해서 차별화가 약하다.' },
  ],
  launch: { view: 'canvas' },
}
writeFileSync('canvas.json', JSON.stringify(canvas, null, 2))
console.log('ok', canvas.artboards.length, 'artboards')
