/** Editorial mission phases; driven only by journey progress, so seeking is deterministic. */
export interface MissionPhase {
  readonly id: 'departure' | 'ascent' | 'transit' | 'approach' | 'arrival'
  readonly name: string
  readonly location: string
  readonly description: string
  readonly start: number
}

export const MISSION_PHASES: readonly MissionPhase[] = [
  { id: 'departure', name: 'DEPARTURE', location: 'EARTH TERMINAL', description: 'Leaving the blue world behind', start: 0 },
  { id: 'ascent', name: 'EARTH ASCENT', location: 'CISLUNAR CORRIDOR', description: 'Climbing beyond Earth orbit', start: 0.035 },
  { id: 'transit', name: 'OPEN SPACE', location: 'INTERPLANETARY RAIL', description: 'The long crossing between worlds', start: 0.17 },
  { id: 'approach', name: 'LUNAR APPROACH', location: 'MOON RENDEZVOUS', description: 'Matching the moving destination', start: 0.8 },
  { id: 'arrival', name: 'ARRIVAL', location: 'LUNAR TERMINAL', description: 'A new world on the horizon', start: 0.995 },
]

export function missionPhaseAt(progress: number): MissionPhase {
  if (!Number.isFinite(progress)) return MISSION_PHASES[0]
  const safe = Math.max(0, Math.min(progress, 1))
  for (let index = MISSION_PHASES.length - 1; index >= 0; index--) {
    if (safe >= MISSION_PHASES[index].start) return MISSION_PHASES[index]
  }
  return MISSION_PHASES[0]
}

/** Real playback time remaining at the selected speed (not simulated orbital time). */
export function remainingRideSeconds(progress: number, durationSeconds: number, speed: number): number {
  if (!Number.isFinite(progress) || !Number.isFinite(durationSeconds) || !Number.isFinite(speed) || durationSeconds <= 0 || speed <= 0) return 0
  return Math.ceil((1 - Math.max(0, Math.min(1, progress))) * durationSeconds / speed)
}

export function formatRideTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}
