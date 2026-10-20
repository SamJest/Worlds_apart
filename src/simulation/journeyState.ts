export interface JourneyState {
  readonly progress: number
  readonly playing: boolean
  readonly speed: number
  readonly begun: boolean
}

export type JourneyCommand =
  | { type: 'begin' }
  | { type: 'toggle-play' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'next-speed' }
  | { type: 'seek', progress: number }
  | { type: 'advance', elapsedSeconds: number }
  | { type: 'restart' }

export interface JourneyRules {
  readonly durationSeconds: number
  readonly speeds: readonly number[]
  readonly initialSpeed: number
}

export function createInitialJourneyState(rules: JourneyRules): JourneyState {
  if (!rules.speeds.includes(rules.initialSpeed)) throw new Error('Initial journey speed is unavailable.')
  return { progress: 0, playing: false, speed: rules.initialSpeed, begun: false }
}

const clampProgress = (progress: number) => Math.min(1, Math.max(0, progress))

export function updateJourney(state: JourneyState, command: JourneyCommand, rules: JourneyRules): JourneyState {
  switch (command.type) {
    case 'begin': return { ...state, begun: true, playing: state.progress < 1 }
    case 'toggle-play': return { ...state, playing: state.progress < 1 && !state.playing }
    case 'pause': return { ...state, playing: false }
    case 'resume': return { ...state, playing: state.progress < 1 }
    case 'next-speed': {
      const index = rules.speeds.indexOf(state.speed)
      return { ...state, speed: rules.speeds[(index + 1) % rules.speeds.length] }
    }
    case 'seek': {
      const progress = clampProgress(command.progress)
      return { ...state, progress, playing: progress === 1 ? false : state.playing }
    }
    case 'advance': {
      if (!state.playing || !Number.isFinite(command.elapsedSeconds) || command.elapsedSeconds <= 0) return state
      const progress = clampProgress(state.progress + command.elapsedSeconds * state.speed / rules.durationSeconds)
      return { ...state, progress, playing: progress < 1 }
    }
    case 'restart': return { ...state, progress: 0, playing: true, begun: true }
  }
}
