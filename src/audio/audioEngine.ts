import type { ViewPreferences } from '../ui/viewPreferences.ts'

/** Original asset-free Web Audio synthesis. Only starts after a user gesture. */
export class AudioEngine {
  private context?: AudioContext
  private master?: GainNode
  private hum?: OscillatorNode
  private shimmer?: OscillatorNode
  private humGain?: GainNode
  private shimmerGain?: GainNode
  private lastPhase = ''
  private available = true

  start(preferences: ViewPreferences) {
    if (!preferences.soundEnabled || !this.available) return
    try {
      if (!this.context) {
        const AudioConstructor = window.AudioContext
        if (!AudioConstructor) { this.available = false; return }
        const context = new AudioConstructor()
        this.context = context
        this.master = context.createGain()
        this.master.gain.value = 0
        this.master.connect(context.destination)
        const humGain = context.createGain()
        this.humGain = humGain
        humGain.gain.value = 0.075
        humGain.connect(this.master)
        const shimmerGain = context.createGain()
        this.shimmerGain = shimmerGain
        shimmerGain.gain.value = 0.018
        shimmerGain.connect(this.master)
        this.hum = context.createOscillator()
        this.hum.type = 'sine'
        this.hum.frequency.value = 62
        this.hum.connect(humGain)
        this.hum.start()
        this.shimmer = context.createOscillator()
        this.shimmer.type = 'triangle'
        this.shimmer.frequency.value = 124.5
        this.shimmer.connect(shimmerGain)
        this.shimmer.start()
      }
      void this.context.resume().catch(() => { this.available = false })
    } catch { this.available = false }
  }

  update(preferences: ViewPreferences, playing: boolean, progress: number, phaseName: string, energy = 0) {
    const context = this.context
    if (!context || !this.master) return
    const volume = preferences.soundEnabled ? preferences.soundVolume : 0
    const level = volume * (playing ? 1 : 0)
    this.master.gain.setTargetAtTime(level, context.currentTime, 0.18)
    // Sonic motion without downloaded audio. Reduced motion also simplifies the soundscape.
    const drive = preferences.reducedMotion ? 0 : Math.max(0, Math.min(1, Number.isFinite(energy) ? energy : 0))
    if (this.hum) this.hum.frequency.setTargetAtTime(62 + (preferences.reducedMotion ? 0 : Math.sin(progress * 24) * 3) + drive * 17, context.currentTime, 0.45)
    if (this.shimmer) this.shimmer.frequency.setTargetAtTime(124.5 + drive * 36, context.currentTime, 0.4)
    this.humGain?.gain.setTargetAtTime(0.055 + drive * 0.022, context.currentTime, 0.4)
    this.shimmerGain?.gain.setTargetAtTime(0.012 + drive * 0.024, context.currentTime, 0.4)
    if (playing && phaseName !== this.lastPhase && this.lastPhase) this.cue(phaseName === 'ARRIVAL' ? 'arrival' : 'phase', volume)
    this.lastPhase = phaseName
  }

  cue(kind: 'launch' | 'phase' | 'arrival', volume: number) {
    const context = this.context
    if (!context || !this.master || volume <= 0) return
    try {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const now = context.currentTime
      const duration = kind === 'arrival' ? 1.2 : kind === 'launch' ? 0.7 : 0.42
      const initial = kind === 'arrival' ? 290 : kind === 'launch' ? 145 : 230
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(initial, now)
      oscillator.frequency.exponentialRampToValueAtTime(initial * (kind === 'arrival' ? 1.6 : 1.2), now + duration)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
      oscillator.connect(gain)
      gain.connect(this.master)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
      oscillator.start(now)
      oscillator.stop(now + duration + 0.02)
    } catch { /* audio must never block the ride */ }
  }

  reset() { this.lastPhase = '' }

  dispose() {
    this.hum?.stop()
    this.shimmer?.stop()
    void this.context?.close().catch(() => {})
    this.context = undefined
  }
}
