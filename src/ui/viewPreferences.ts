export type QualityPreset = 'auto' | 'performance' | 'quality'

export interface ViewPreferences {
  reducedMotion: boolean
  highContrast: boolean
  minimalHud: boolean
  quality: QualityPreset
  soundEnabled: boolean
  soundVolume: number
}

const KEY = 'worlds-apart.view-preferences.v1'
export const defaultViewPreferences = (prefersReducedMotion = false): ViewPreferences => ({
  reducedMotion: prefersReducedMotion,
  highContrast: false,
  minimalHud: false,
  quality: 'auto',
  soundEnabled: true,
  soundVolume: 0.55,
})

export function readViewPreferences(): ViewPreferences {
  const defaults = defaultViewPreferences(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? 'null')
    if (!stored || typeof stored !== 'object') return defaults
    const candidate = stored as Record<string, unknown>
    return {
      reducedMotion: typeof candidate.reducedMotion === 'boolean' ? candidate.reducedMotion : defaults.reducedMotion,
      highContrast: candidate.highContrast === true,
      minimalHud: candidate.minimalHud === true,
      quality: candidate.quality === 'performance' || candidate.quality === 'quality' ? candidate.quality : 'auto',
      soundEnabled: candidate.soundEnabled !== false,
      soundVolume: typeof candidate.soundVolume === 'number' && Number.isFinite(candidate.soundVolume) ? Math.max(0, Math.min(1, candidate.soundVolume)) : defaults.soundVolume,
    }
  } catch { return defaults }
}

export function saveViewPreferences(value: ViewPreferences): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(value)) } catch { /* private browsing can disable storage */ }
}
