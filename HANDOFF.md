# Session Handoff
_Last updated: 2026-09-04 (B4 동결 · GRAC 제출물 작성)_

## 지금 상태

**높이높이 — Phase 0 완료. 사용자 실기기 판정 "다 좋다"로 밸런스 확정(D-005), 상단 칩 여백 하나만 고쳐 B4로 동결하고
GRAC 제출물 일습을 만들었다(`grac-제출/`). 접수 전 남은 것은 전부 사용자 몫 넷 — 심의용 웹 주소 게시 결정 · 제명 동명 재확인 ·
플레이 영상 촬영 · 접수.**

```
컨셉       원버튼 탑 쌓기 + 일일 시드 (D-001). 탭=낙하, 어긋난 만큼 잘림, 딱(±7px)=콤보, 3콤보=폭 +14px, 빗나가면 즉사
이름       **높이높이 / nopinopi** (D-002, 확정). GRAC에 「높이높이 스카이드」가 있어 보완 위험 인지 — 제명 변경 요청 경로 준비됨
경로       /Users/jsypsy/Documents/workspace/toss/nopinopi. 형제 앱: hanjulpang(출시) · shootingstar(출시·검수) · naranara(GRAC 접수)
코드       **BUILD 4 = GRAC 제출 동결본.** core(game·daily·tuning·rng) · render/renderer · main(카메라·이어하기·streak) · audio(WebAudio 3종)
           테스트 25개 + 봇 sim(skip, `SIM=1`). 개발 훅 `window.__nopi` — DEV 전용, 배포본 0건 확인
밸런스     확정(D-005): speed 150/380/60층/층당+4/상한1000 · perfectTol 7 · perfectCombo 3 · growPx 14 · minW 10 ·
           overhang 0.35 · maxContinues 2 · continueRestoreW 0.6 · speedJitter 0.85~1.2. **접수 뒤 변경 금지**
봇 계측    초보 21층·20초 · 보통 42층·34초 · 숙련 117층·62초 · 상위 292층·96초 (D-001 4번 30~60초 안)
콘솔       miniAppId **72506**, appName `nopinopi`, workspace 72091. 마지막 테스트 배포는 B3 `01a0680a…`(2026-09-04 01:12).
           **B4는 아직 배포 안 했다** — 배포하려면 사전 확인. minAge 19(기본값) → 출시 전 콘솔 웹에서 등급·카테고리·아이콘
저장소     github.com/jsypsy/nopinopi (**private** — GRAC 심의용 gh-pages를 쓰려면 public 전환이 필요하다, 사용자 결정 대기)
디자인     밝은 카툰(도형 + 굵은 외곽선 + 오프셋 그림자), 층 색 6색 순환, 층수에 따라 낮→노을→밤→우주. 에셋 0. 소리 3종(D-003)
GRAC       `grac-제출/` — 개요 974자 · 설명서 12쪽(스샷 8장) · 용량 3쪽 · 웹URL 3쪽 · 빌드 zip(86,800바이트).
           해시·절차·함정은 `grac-제출/README.md`
다음       사용자 넷(아래) → 그 뒤 Phase 1 잔여(순위 버튼·데모 카드·공유·뒤로가기 모달) → 아이콘·스토어 문안 → 콘솔 검수
```

## 다음 세션이 할 일

0. **접수 전 사용자 몫 넷** (`grac-제출/README.md`의 「접수 절차」와 같다):
   - **심의용 웹 주소 게시 결정** — 리포가 private이라 지금은 https://jsypsy.github.io/nopinopi/ 가 404다.
     `jsypsy/nopinopi`를 public으로 바꾸거나 `dist/`만 담은 별도 public 리포를 만든다. 게시 뒤 내려받아 zip과 SHA-256 대조.
     **게시하지 않기로 하면** 01·02·03 문서의 웹 주소 기재를 들어내야 한다(심의자가 접속을 요구할 수 있어 권장하지 않는다)
   - **제명 동명 재확인** (GRAC 등급분류 검색, 「높이높이」·「높이높이 스카이드」)
   - **플레이 영상 촬영** → `grac-제출/04_게임플레이영상_높이높이.mp4` (git 제외). **B4**로 찍는다
   - **접수 + 수수료 결제**
1. **접수 뒤** Phase 1 잔여 — 전부 UI 층이라 내용수정신고 대상이 아니고, 설명서 14항에 미리 적어 두었다:
   ① 결과 카드 [순위] 버튼(`platform.openLeaderboard` — 콘솔 앱 정보 승인 전엔 LEADERBOARD_NOT_FOUND가 정상) ·
   ② 시작 화면 데모 카드 · ③ [공유] · ④ 뒤로가기 확인 모달(플레이북 §3) ·
   ⑤ 자정 넘김 처리(시작 화면에서 `newGame()`이 날짜를 다시 읽는다 — 플레이 중 자정은 그 판 그대로)
2. **일일 리더보드**: 플랫폼 리더보드가 기간 리셋을 지원하는지 확인. 안 되면 역대 최고만 제출하고 "오늘 최고"는 로컬
3. **콘솔 메타**: 아이콘(코드로 그린 탑 한 컷을 PNG로) · 카테고리 게임>아케이드 · 등급(GRAC 뒤) · 설명 문안 ·
   핵심 지표(전환: 리워드 광고 시청 완료·몰입 플레이)

## 작업 도구

- 크롬 MCP 검수: `/tools/frame.html`(393×749) + `window.__nopi`. 촬영은 `node tools/shots.mjs`(헤드리스 크롬, `__shot.build(n, offsets)`·`miss()`)
- 빠른 타이틀 캡처: `npx vite --port 5177` 띄우고 크롬 `--headless=new --window-size=393,749 --screenshot`(캔버스가 가로 중심에서 벗어나 보이지만 헤드리스 창 문제, 실기기는 정상)
- 봇 계측: `SIM=1 npx vitest run src/core/sim.test.ts --reporter=verbose` — 유형 4개(σ=base+k·v)의 층수·초 사분위
- 배포: `npm run ait:build` → 콘솔 MCP(bundle_upload → curl PUT → bundle_upload_complete → bundle_build_status → bundle_test_push) →
  `tools/latest-deployment.json` 갱신 → `npm run ait:send`. 로컬 `ait deploy` 키는 정글훅 것이라 쓰지 않는다. MCP는 세션마다 `/mcp` 인증

## 잊지 말 것

- 설계 변경은 D-001 원칙 5에 비춰본다. 랜덤은 일일 시드 하나뿐(보상 확률 없음) — GRAC 문서에 "같은 날 같은 탑" 기재
- 리더보드 제출은 그 판의 인메모리 층수만, 저장값을 제출하지 않는다 (세 앱 보안 검토 C1). 광고 폴백은 `reason: fallback`으로 계측 (C2)
- 소리는 D-003으로 넣었다(D-022 미승계) — 합성만, 에셋 금지 유지. 최고기록 저장은 단조 증가(D-004). 개발 훅·프리셋은 DEV 전용(D-023). 배포 번들에서 `__nopi` 0건 확인 습관
- 배포 링크는 `intoss-private://nopinopi…`인지 확인하고 보낸다(날아날아 때 옛 슬러그 링크를 보낸 사고)
- **사용자가 신고·결정한 건은 되묻지 않는다** — 버그 신고·"사운드 넣어도 되겠다"는 그 자체가 지시. "적용할까요?"에 "무슨 확답?"이 돌아왔다. 사전 확인은 배포만
- 앱 안 상태 표시가 기기 상태(무음·볼륨)와 어긋날 수 있는 UI는 두지 않는다 — 소리 토글이 그래서 빠졌다(D-003 보완). 같은 이유로 "진동 켬/끔" 류도 넣지 않는다
- **GRAC 접수 뒤에는 규칙·수치·표현을 바꾸지 않는다** — 등급본 = 출시본. UI·버그 수정은 무방(플레이북 §4)
- 스크린샷 재촬영은 헤드리스 촬영기(`tools/grac-shots.mjs`)가 아니라 **크롬 MCP + `tools/frame.html`**로 한다.
  헤드리스는 `__nopi` 훅을 못 잡는다. 배경 탭의 rAF·타이머 조임 함정 셋은 `grac-제출/README.md`에 적어 두었다
- 디자인 개편은 사용자가 카툰 유지로 결정. `design/concepts/gen.mjs`(청사진·포스터·네온 시안)는 참고용 — 다시 꺼낼 때는 캔버스 재생성부터
- 문자 수신자 `tools/imessage.local.json`(gitignore) — naranara 것을 복사해 두었다
