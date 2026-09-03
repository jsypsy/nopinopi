/**
 * GRAC 제출용 스크린샷 촬영 — 헤드리스 크롬 + CDP. (tools/shots.mjs의 검수용 6장면을 제출용 8장면으로 늘린 것)
 *
 * ⚠️ **2026-09-04 현재 이 스크립트는 동작하지 않는다.** 헤드리스 크롬에서 페이지가 뜨고 그림도 그려지는데
 * `window.__nopi`(DEV 훅)가 평가 컨텍스트에 끝내 안 붙는다(vite 8 + 헤드리스). B4 제출본 8장은
 * **크롬 MCP + tools/frame.html**로 찍었다 — 절차와 함정 셋은 `grac-제출/README.md`의
 * "다시 찍는 방법" 절에 적어 두었다. 이 파일은 장면 목록(SCENES)의 기록으로 남긴다.
 *
 *   node tools/grac-shots.mjs [출력폴더]   (기본 assets/grac-스크린샷 — 01_게임설명서의 {{IMG:...}}와 1:1)
 *
 * - 393×749 CSS px · devicePixelRatio 3 = 앱인토스 실측 뷰포트, 실제 폰과 같은 논리 해상도
 * - 장면 연출은 `src/main.ts`의 DEV 전용 `window.__nopi` 훅으로 게임 상태를 직접 만든다.
 *   HANDOFF "순간이동 캡처 함정" 그대로: ① 매달린 몸은 anchor를 풀고 옮긴다 ② 찬스는 chanceStepM=1e9로 밀어두고
 *   찬스 장면은 sonic 플래그를 직접 켠다 ③ 저장값(최고기록)은 모듈 로드 때 읽으므로 localStorage를 심은 뒤 reload
 * - 헤드리스 크롬은 rAF가 실시간으로 돌므로 카메라 추적·연출은 wait(ms)로 실제 시간을 흘려 잡는다
 * - 파일명은 01_게임설명서의 {{IMG:...}} 자리표시자와 1:1 — 어긋나면 PDF에 빈 칸이 생긴다
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve(process.argv[2] ?? 'assets/grac-스크린샷')
const PORT = 5199
const CDP = 9333
const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((p) => existsSync(p))

/** 페이지 안에 심는 장면 도우미 — 미터 단위로 순간이동, 매달리기, 위협 거리 조절 */
const HELPERS = `
  window.__shot = (() => {
    // 훅은 늦게 잡는다 — vite가 첫 로드 뒤 의존성 최적화로 페이지를 한 번 더 새로고침할 수 있다
    const N = new Proxy({}, { get: (_, k) => window.__nopi[k] })
    const g = () => window.__nopi.game
    /** n층까지 결정적으로 쌓는다 — offsets[i]만큼 어긋나게 (기본 딱) */
    function build(n, offsets = []) {
      const G = g()
      if (G.phase === 'ready') N.tap()
      for (let i = 0; i < n; i++) {
        const top = G.layers[G.layers.length - 1]
        G.mover.x = top.x + (offsets[i] ?? 0)
        N.tap()
      }
    }
    return {
      build,
      miss() { const G = g(); const top = G.layers[G.layers.length - 1]; G.mover.x = top.x + top.w + 30; N.tap() },
      start() { if (g().phase === 'ready') N.tap() },
    }
  })()
`

/** 촬영 장면 — js를 실행하고 wait(ms)만큼 실제 시간을 흘린 뒤 화면을 뜬다 */
const SCENES = [
  { file: '01-시작화면', js: '', wait: 1000 },
  { file: '02-플레이-초반', js: '__shot.build(4, [12, -20, 0, 25])', wait: 700 },
  { file: '03-딱-콤보', js: '__shot.build(2, [30, -25]); __shot.build(3, [0, 0, 0])', wait: 150 },
  // 장면은 누적이다 — 02(4층) → 03(9층) → 04(37층 노을) → 05(67층 밤) → 06(112층 우주) → 07(빗나감)
  { file: '04-노을', js: '__shot.build(28, Array.from({length:28}, (_, i) => (i % 4 === 3 ? 9 : 0)))', wait: 1800 },
  { file: '05-밤', js: '__shot.build(30, Array.from({length:30}, (_, i) => (i % 5 === 4 ? 6 : 0)))', wait: 1800 },
  { file: '06-우주', js: '__shot.build(45, Array.from({length:45}, (_, i) => (i % 6 === 5 ? 5 : 0)))', wait: 2200 },
  { file: '07-게임오버-이어하기', js: '__shot.miss()', wait: 2400 },
  // 새 판에서 이어하기를 다 쓴 상태로 빗나가기 — 죽은 게임은 되살릴 훅이 없어 페이지를 다시 연다
  { file: '08-게임오버-다시하기', reload: true, js: '__nopi.game.continues = 2; __shot.build(6, [15, -10, 0, 0, 0, 20]); __shot.miss()', wait: 2400 },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url)
      if (r.ok) return await r.json().catch(() => ({}))
    } catch {
      /* 아직 안 떴다 */
    }
    await sleep(500)
  }
  throw new Error(`시간 초과: ${url}`)
}

/** 최소 CDP 클라이언트 — Node 24의 내장 WebSocket만 쓴다 */
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl)
  const pending = new Map()
  let id = 0
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', res)
    ws.addEventListener('error', rej)
  })
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    const p = pending.get(m.id)
    if (!p) return
    pending.delete(m.id)
    m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result)
  })
  return {
    ready,
    send(method, params = {}, sessionId) {
      const n = ++id
      return new Promise((res, rej) => {
        pending.set(n, { res, rej })
        ws.send(JSON.stringify({ id: n, method, params, sessionId }))
      })
    },
    close: () => ws.close(),
  }
}

const vite = spawn(
  process.execPath,
  // vite 8은 기본이 IPv6 localhost 바인딩이라 127.0.0.1 접속이 거부된다 (맥에서 확인)
  ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
  { stdio: 'ignore' },
)
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${CDP}`,
    '--disable-gpu',
    '--mute-audio',
    '--no-first-run',
    '--user-data-dir=' + resolve(process.env.TMPDIR ?? process.env.TEMP ?? '.', 'nopi-shots-profile'),
    'about:blank',
  ],
  { stdio: 'ignore' },
)
const bye = () => {
  vite.kill()
  chrome.kill()
}
process.on('exit', bye)

try {
  if (!CHROME) throw new Error('Chrome을 찾지 못했다')
  await waitFor(`http://127.0.0.1:${PORT}/`)
  const ver = await waitFor(`http://127.0.0.1:${CDP}/json/version`)
  const c = cdp(ver.webSocketDebuggerUrl)
  await c.ready

  const { targetId } = await c.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await c.send('Target.attachToTarget', { targetId, flatten: true })
  const S = (m, p) => c.send(m, p, sessionId)
  const evalJs = async (expression, label) => {
    const r = await S('Runtime.evaluate', { expression, awaitPromise: false })
    if (r.exceptionDetails) throw new Error(`${label}: ${JSON.stringify(r.exceptionDetails)}`)
  }
  /** 훅이 붙을 때까지 기다린다 (vite 의존성 최적화 새로고침 대비) */
  const waitHook = async () => {
    for (let i = 0; i < 40; i++) {
      const r = await S('Runtime.evaluate', { expression: "typeof window.__nopi === 'object' && !!window.__nopi.game" })
      if (r.result?.value === true) return
      await sleep(250)
    }
    throw new Error('window.__nopi 훅이 붙지 않았다')
  }

  await S('Page.enable')
  await S('Runtime.enable')
  // 실제 폰과 같은 조건 — 앱인토스 실측 뷰포트(393×749) · dpr 3
  await S('Emulation.setDeviceMetricsOverride', { width: 393, height: 749, deviceScaleFactor: 3, mobile: true })
  await S('Page.navigate', { url: `http://127.0.0.1:${PORT}/` })
  await sleep(2500)
  // 최고 기록(역대 37층)을 심어 HUD의 「오늘·역대」 칩을 실제 플레이처럼 만든다
  await evalJs("localStorage.setItem('nopi.v1.best','37')", 'seed')
  await S('Page.reload')
  await sleep(2500)
  await waitHook()
  await evalJs(HELPERS, 'helpers')

  mkdirSync(OUT, { recursive: true })
  for (const s of SCENES) {
    if (s.reload) {
      await S('Page.reload')
      await sleep(2500)
      await waitHook()
      await evalJs(HELPERS, 'helpers')
    }
    if (s.js) await evalJs(s.js, s.file)
    await sleep(s.wait)
    if (s.then) {
      await evalJs(s.then, s.file + ' (then)')
      await sleep(s.thenWait ?? 200)
    }
    // 컴포지터 캡처는 DOM 오버레이도 찍으므로 dev 진단 배지를 숨긴다
    await evalJs(
      "document.querySelectorAll('body > div').forEach(d => { if (getComputedStyle(d).position === 'fixed') d.style.display = 'none' })",
      'hide-badges',
    )
    const shot = await S('Page.captureScreenshot', { format: 'png' })
    writeFileSync(resolve(OUT, `${s.file}.png`), Buffer.from(shot.data, 'base64'))
    console.log(`✓ ${s.file}.png`)
  }
  c.close()
} finally {
  bye()
}
