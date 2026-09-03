# 높이높이 — 앱인토스 출시용 원버튼 탑 쌓기 (일일 시드)

**모든 응답과 문서는 한국어로 작성한다.**

## 프로젝트 개요

원버튼 하이스코어 게임. 블록이 좌우로 왕복하고, 탭하면 떨어져 아래 블록 위에 얹힌다. 어긋난 만큼 잘려
폭이 줄고, 빗나가면 즉사. 점수는 층수. **같은 날엔 모두가 같은 탑**(일일 시드, D-001)을 쌓는다 —
세 앱(한줄팡·슈팅스타·날아날아) 지표에서 "돌아올 이유"가 없다는 것이 드러나 처음 넣는 리텐션 장치다.
[한줄팡](https://github.com/jsypsy/hanjulpang) · [슈팅스타](https://github.com/jsypsy/shootingstar) ·
[날아날아](https://github.com/jsypsy/naranara)에 이은 네 번째 토스 미니앱.

> **설계 1순위는 리워드 광고 수익**(D-001, 날아날아 D-001 승계). 규칙은 "이어하기 광고가 팔리는가"에서
> 역산한다: 누적 점수 · 즉사 · 내 탓인 죽음 · 30~60초 세션 · 이어하기 판당 2회.
> **소리는 없다**(날아날아 D-022 승계 — 넣었다 뺀 이력이 있다). 세션 인수인계는 `HANDOFF.md`.

## 명령어

- `npm run dev` — 개발 서버. 화면 검수는 `/tools/frame.html`(393×749 실측 뷰포트)
- `npm run build` — 타입 체크 + 프로덕션 빌드 · `npm test` — vitest (core 대상)
- 배포: `npm run ait:build` 후 **콘솔 MCP**(플레이북 §8: bundle_upload → PUT → upload_complete → test_push) → `ait:send`.
  **배포는 언제나 사전 확인을 받는다.** 콘솔 미니앱은 아직 미등록(HANDOFF)
- 빌드 표식: `src/version.ts`의 `BUILD`를 밸런스·조작 변경마다 +1 — 타이틀 우하단에 찍힌다

## 기술 스택 및 제약

날아날아에서 그대로 이어받는다 (세 번 출시로 검증된 구성):

- Vite + TypeScript, **프레임워크 없음** — Canvas 2D 직접 렌더링. **런타임 의존성 추가 금지**
- `core/`는 순수 로직 — 시계·난수·DOM을 모른다. 일일 시드도 `now`를 바깥에서 받는다(`core/daily.ts`)
- 저장: localStorage 키 접두어 `nopi.v1` · 계측: `src/analytics.ts`, 접두어 `nopi_` — 처음부터
- 앱인토스 SDK: `src/platform/index.ts`가 토스 WebView면 AitAdapter, 브라우저면 MockAdapter. 게임 코드는
  PlatformAdapter 인터페이스만 호출. `cancelHostTopInset` 보정 필수
- 개발 훅 `window.__nopi`·URL 프리셋은 **`import.meta.env.DEV` 안에만** (날아날아 D-023 — 배포본 치트 0건이 GRAC 문서와 맞아야 한다)

**날아날아에서 이식한 것** (복사본 — 원본 수정이 자동으로 넘어오지 않는다): `src/platform/` · `storage.ts`(키만 교체) ·
`analytics.ts`(밴드 재정의) · `input/pointer.ts` · `core/rng.ts` · `tools/` · `.github/workflows/deploy.yml` · `docs/PLATFORM_PLAYBOOK.md`

## 심사·등급 요건

플레이북 §3 표. 리워드 광고 사전 로딩, 뒤로가기 확인 모달, 점수 제출은 플레이 완료 후. GRAC는 날아날아
`grac-제출/` 구성을 그대로 복제한다(README·촬영·PDF 도구). 접수 전 제명 동명 검색.

## 문서 지도

- `HANDOFF.md` — 세션 인수인계 · `docs/PROJECT_PLAN.md` — 설계·단계 · `docs/DECISIONS.md` — 결정 기록(D-번호)
- `docs/PROGRESS.md` — 작업 일지 · `docs/PLATFORM_PLAYBOOK.md` — 출시 절차 전체 · `docs/SECURITY_REVIEW.md`는 세 앱 검토 결과를 이 앱 설계에 반영했다(리더보드 제출은 인메모리 점수만·상한)

## 작업 방식 (사용자 요청)

- 질문에는 답만 한다. 배포는 사전 확인. 디자인 변경은 렌더해서 검수 뒤 배포
- 기기 이슈는 계측이 먼저다. 난이도 판정은 감이 아니라 봇·계측 분포로
