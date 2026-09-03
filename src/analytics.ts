/**
 * 콘솔 핵심 지표용 이벤트. 접두어 `nopi_`. 값은 전부 게임 수치 — 개인 식별 값을 싣지 않는다(보안 검토 4항).
 * core는 시간을 모르므로 플레이 시간은 여기서 센다.
 */
import type { EventParams, PlatformAdapter, RewardedAdPlacement } from './platform/adapter'

const PREFIX = 'nopi_'
/** "몰입했다"고 볼 플레이 시간(초) — 대표 전환 지표 후보. 분포를 보고 조정 */
export const DEEP_PLAY_SEC = 60

/** 층수 밴드 — 콘솔 조건은 파라미터 값으로 거는 것이라 구간이 필요하다 */
export function scoreBand(floors: number): string {
  if (floors < 10) return 'u10'
  if (floors < 20) return '10'
  if (floors < 40) return '20'
  if (floors < 70) return '40'
  return '70+'
}

export class Analytics {
  private startedAt = 0
  private deepSent = false
  constructor(private platform: PlatformAdapter) {}

  private send(name: string, params: EventParams = {}): void {
    this.platform.track(PREFIX + name, params)
  }

  gameStart(now: number, streak: number): void {
    this.startedAt = now
    this.deepSent = false
    this.send('game_start', { streak })
  }

  /** 매 프레임 — 몰입 시간이 지나면 한 번만 */
  tick(now: number, floors: number): void {
    if (this.deepSent || this.startedAt === 0) return
    if ((now - this.startedAt) / 1000 >= DEEP_PLAY_SEC) {
      this.deepSent = true
      this.send('deep_play', { sec: DEEP_PLAY_SEC, score: floors })
    }
  }

  gameOver(r: { score: number; isBest: boolean; isDailyBest: boolean; continued: boolean; perfects: number; bestCombo: number }, now: number): void {
    const playSec = this.startedAt ? Math.round((now - this.startedAt) / 1000) : 0
    this.send('game_over', {
      score: r.score,
      score_band: scoreBand(r.score),
      play_sec: playSec,
      is_best: r.isBest,
      is_daily_best: r.isDailyBest,
      continued: r.continued,
      perfects: r.perfects,
      best_combo: r.bestCombo,
    })
    this.startedAt = 0
  }

  adReward(placement: RewardedAdPlacement, rewarded: boolean, reason: 'earned' | 'fallback'): void {
    this.send('ad_reward', { placement, rewarded, reason })
  }

  share(ok: boolean, score: number): void {
    this.send('share', { ok, score })
  }

  leaderboardOpen(): void {
    this.send('leaderboard_open')
  }
}
