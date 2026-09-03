# Session Handoff
_Last updated: 2026-09-04 (BUILD 2 테스트 배포)_

## 지금 상태

**높이높이 — Phase 0 프로토타입 완성 (BUILD 1). 코어·카툰 렌더·일일 시드·이어하기·계측·저장까지 한 번에. 콘솔 `nopinopi`(miniAppId 72506) 등록 완료(사용자), B1 테스트 배포 `01a067ea…` 문자 전송 완료.**

```
컨셉       원버튼 탑 쌓기 + 일일 시드 (D-001). 탭=낙하, 어긋난 만큼 잘림, 딱(±7px)=콤보, 3콤보=폭 +14px, 빗나가면 즉사
이름       **높이높이 / nopinopi** (D-002, 확정). GRAC에 「높이높이 스카이드」가 있어 보완 위험 인지 — 제명 변경 요청 경로 준비됨
경로       /Users/jsypsy/Documents/workspace/toss/nopinopi. 형제 앱: hanjulpang(출시) · shootingstar(출시·검수) · naranara(GRAC 접수)
코드       BUILD 1 — core(game·daily·tuning·rng) · render/renderer(하늘 고도 변화·잘린 조각·팝업·결과 카드) · main(카메라·이어하기·streak)
           테스트 25개 + 봇 sim(skip, `SIM=1`). 개발 훅 `window.__nopi`(game·tuning·floors·tap·stepOnce) — DEV 전용
봇 계측    (탭 오차 σ=base+k·속도, 시드 12) 초보 21층·20초 · 보통 42층·34초 · 숙련 117층·62초 · 상위 292층·96초.
           봇은 첫 교차에서 바로 탭하므로 사람은 이보다 길다. D-001 4번(30~60초) 안. 1차(210/520/40/620)는 12~16초라 느리게 시작해 길게 올렸다
콘솔       miniAppId **72506**, appName `nopinopi`, workspace 72091. B2 테스트 배포 `01a06804…`(2026-09-04 01:06, 콘솔 MCP, 문자 전송; B1은 `01a067ea…`). minAge 19(기본값) → 출시 전 콘솔 웹에서 등급·카테고리·아이콘
저장소     github.com/jsypsy/nopinopi (private — GRAC 심의용 gh-pages가 필요해지면 public으로)
디자인     밝은 카툰(도형 + 굵은 외곽선 + 오프셋 그림자), 층 색 6색 순환, 층수에 따라 낮→노을→밤→우주. 에셋 0. **소리 있음**(D-003 — WebAudio 합성 3종, 타이틀 토글). 디자인 개편 시안 3안은 반려(`design/concepts/`)
다음       실기기 판정 → Phase 1 잔여(튜토리얼 데모 카드·리더보드 버튼·공유·뒤로가기 모달) → 아이콘·스토어 문안 → GRAC
```

## 다음 세션이 할 일

0. **B1 실기기 판정** (링크는 문자로 감). 볼 것:
   - **손맛**: 탭 반응 지연이 느껴지는가(포인터다운에서 탭, 120Hz 고정 스텝). 블록이 화면 밖으로 35% 나갔다 오는 왕복이 답답한가
   - **세션 길이**: 한 판이 몇 초인가. 봇 기준 보통 34초. 너무 짧으면 `speed.min` 150→130, 길면 `perfectTol` 7→5
   - **딱 판정**: ±7px이 "맞췄는데 잘렸다"로 억울한가 — 억울하면 9까지
   - **폭 회복(3콤보 +14px)**이 만회로 느껴지는가, 상위권 무한 생존을 만드는가(봇 상위 96초에서 죽는다)
   - **카메라·하늘**: 맨 위 층이 화면 42%에 오는 추적, 노을(28층~)·밤(56층~)·우주(96층~)가 "올라간다"를 파는가
   - **일일 시드가 느껴지는가** — 속도 변주 0.85~1.2만으로 "오늘 탑은 다르다"가 안 읽히면 바람(블록 표류)·리듬(속도 파형) 변주 추가
1. **Phase 1 잔여**: 시작 화면 데모 카드(날아날아 `drawStartDemo` 문법) · 결과 카드에 [순위]·[공유] · 뒤로가기 확인 모달(플레이북 §3) ·
   자정 넘김 처리(시작 화면에서 `newGame()`이 날짜를 다시 읽는다 — 플레이 중 자정은 그 판 그대로)
2. **일일 리더보드**: 플랫폼 리더보드가 기간 리셋을 지원하는지 확인(`Game.setLeaderboardScore` 문서·콘솔). 안 되면 역대 최고만 제출하고 "오늘 최고"는 로컬
3. **콘솔 메타**: 아이콘(코드로 그린 탑 한 컷을 PNG로) · 카테고리 게임>아케이드 · 등급(GRAC 뒤) · 설명 문안 · 핵심 지표(전환: 리워드 광고 시청 완료·몰입 플레이)
4. **GRAC**: naranara/grac-제출 구성 복제(README·make-pdf·촬영기). 제명 동명 재검색(「높이높이 스카이드」와의 관계 소명 준비)

## 작업 도구

- 크롬 MCP 검수: `/tools/frame.html`(393×749) + `window.__nopi`. 촬영은 `node tools/shots.mjs`(헤드리스 크롬, `__shot.build(n, offsets)`·`miss()`)
- 봇 계측: `SIM=1 npx vitest run src/core/sim.test.ts --reporter=verbose` — 유형 4개(σ=base+k·v)의 층수·초 사분위
- 배포: `npm run ait:build` → 콘솔 MCP(bundle_upload → curl PUT → bundle_upload_complete → bundle_build_status → bundle_test_push) →
  `tools/latest-deployment.json` 갱신 → `npm run ait:send`. 로컬 `ait deploy` 키는 정글훅 것이라 쓰지 않는다. MCP는 세션마다 `/mcp` 인증

## 잊지 말 것

- 설계 변경은 D-001 원칙 5에 비춰본다. 랜덤은 일일 시드 하나뿐(보상 확률 없음) — GRAC 문서에 "같은 날 같은 탑" 기재
- 리더보드 제출은 그 판의 인메모리 층수만, 저장값을 제출하지 않는다 (세 앱 보안 검토 C1). 광고 폴백은 `reason: fallback`으로 계측 (C2)
- 소리는 D-003으로 넣었다(D-022 미승계) — 합성만, 에셋 금지 유지. 최고기록 저장은 단조 증가(D-004). 개발 훅·프리셋은 DEV 전용(D-023). 배포 번들에서 `__nopi` 0건 확인 습관
- 배포 링크는 `intoss-private://nopinopi…`인지 확인하고 보낸다(날아날아 때 옛 슬러그 링크를 보낸 사고)
- 문자 수신자 `tools/imessage.local.json`(gitignore) — naranara 것을 복사해 두었다
