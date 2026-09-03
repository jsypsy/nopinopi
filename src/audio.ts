/**
 * 소리 — WebAudio 합성 3종. 에셋 0 유지 (D-003).
 *   tap    탭 낙하 '톡'      짧은 저음 클릭
 *   perfect 딱 '띵'          콤보마다 반음씩 올라가는 사인 톤
 *   miss   빗나감 '쿵'       하강 노이즈 + 저음
 * AudioContext는 첫 사용자 제스처에서 만든다(iOS 자동재생 정책). 실패하면 조용히 무음.
 * 앱 안 뮤트 토글은 없다(D-003 보완) — 웹뷰는 기기 무음 스위치를 읽을 수 없어 UI가 실제 상태와 어긋난다. 볼륨은 기기에 맡긴다.
 */
export class Sfx {
  private ctx: AudioContext | null = null
  private failed = false

  /** 포인터다운마다 부른다 — 컨텍스트 생성·재개 (iOS는 제스처 안에서만 resume가 통한다) */
  unlock(): void {
    if (this.failed) return
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AC) {
          this.failed = true
          return
        }
        this.ctx = new AC()
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume()
    } catch {
      this.failed = true
    }
  }

  tap(): void {
    const c = this.ready()
    if (!c) return
    const t = c.currentTime
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'triangle'
    o.frequency.setValueAtTime(320, t)
    o.frequency.exponentialRampToValueAtTime(140, t + 0.06)
    g.gain.setValueAtTime(0.18, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    o.connect(g).connect(c.destination)
    o.start(t)
    o.stop(t + 0.09)
  }

  /** combo 1부터 — 반음씩 올라가며 12콤보에서 한 옥타브 */
  perfect(combo: number): void {
    const c = this.ready()
    if (!c) return
    const t = c.currentTime
    const base = 880 * Math.pow(2, Math.min(combo - 1, 12) / 12)
    for (const [mul, gain, dur] of [[1, 0.16, 0.22], [2, 0.05, 0.14]] as const) {
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(base * mul, t)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(gain, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(g).connect(c.destination)
      o.start(t)
      o.stop(t + dur + 0.02)
    }
  }

  miss(): void {
    const c = this.ready()
    if (!c) return
    const t = c.currentTime
    // 저음 하강
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(160, t)
    o.frequency.exponentialRampToValueAtTime(40, t + 0.35)
    g.gain.setValueAtTime(0.2, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    o.connect(g).connect(c.destination)
    o.start(t)
    o.stop(t + 0.42)
    // 노이즈 버스트
    const n = c.createBufferSource()
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.15), c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    n.buffer = buf
    const ng = c.createGain()
    ng.gain.setValueAtTime(0.12, t)
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    n.connect(lp).connect(ng).connect(c.destination)
    n.start(t)
  }

  private ready(): AudioContext | null {
    if (this.failed || !this.ctx || this.ctx.state !== 'running') return null
    return this.ctx
  }
}
