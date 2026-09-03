/**
 * 게임 감각을 좌우하는 상수 전부. 밸런싱은 이 파일만 만진다. 근거는 docs/PROGRESS.md 계측 기록.
 * 단위: px는 설계 뷰포트(393×749) 기준 논리 px, 시간은 초.
 */
export const TUNING = {
  /** 설계 기준 뷰포트 (px) — frame.html 실측값 */
  viewW: 393,
  viewH: 749,
  /** 블록 높이 (px) */
  blockH: 34,
  /** 첫 블록(바닥) 폭 (px) — 이후 어긋난 만큼 잘려 줄어든다 */
  baseW: 190,
  /** 이동 블록이 왕복하는 범위: 화면 밖으로 이만큼(폭 비율)까지 나갔다 돌아온다 */
  overhang: 0.35,
  /** 이동 속도 (px/s): 층수 0에서 speedMin, rampFloors층에서 speedMax, 그 뒤 상한 */
  /** 1차 계측(B1 초안 210/520/40/620): 초보 12초·보통 16초로 D-001의 30~60초에 못 미치고 상위 봇은 영원히 산다
   *  → 느리게 시작해 길게 올리고(150→380, 60층), 램프 뒤엔 층당 +perFloor로 상한 1000까지 — 상위권도 언젠가 죽는다 */
  speed: { min: 150, max: 380, rampFloors: 60, perFloor: 4, cap: 1000 },
  /** 일일 시드가 층마다 곱하는 속도 변주 범위 — "오늘의 탑"이 날마다 다른 손맛을 갖는 축 */
  speedJitter: { lo: 0.85, hi: 1.2 },
  /** 딱 맞춤 판정 (px): 어긋남이 이 이하면 잘리지 않고 폭이 그대로 (콤보) */
  perfectTol: 7,
  /** 딱 맞춤을 이만큼 연속하면 폭이 growPx 회복된다 (baseW까지) — 실수를 만회하는 유일한 길 */
  perfectCombo: 3,
  growPx: 14,
  /** 이 폭(px) 아래로 잘리면 그 자리에서 끝 — 1px짜리 탑으로 버티는 재미없는 구간을 자른다 */
  minW: 10,
  /** 이어하기(리워드 광고) 판당 최대 횟수 — D-001 "1~2회" */
  maxContinues: 2,
  /** 이어하기 재출발: 폭을 이만큼(비율)까지 되돌려 준다 (직전 폭이 더 넓으면 그대로) */
  continueRestoreW: 0.6,
  /** 첫 층 출발 위치: 바닥 블록의 왼쪽/오른쪽 (일일 시드가 고른다) */
  startSideFromSeed: true,
} as const

export type Tuning = typeof TUNING
