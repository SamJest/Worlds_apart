import { AudioEngine } from '../audio/audioEngine.ts'
import { RoutePlannerUi } from '../ui/routePlannerUi.ts'
import { missionPhaseAt } from '../simulation/missionPhases.ts'
import { CameraController } from '../camera/cameraController.ts'
import { defaultGameConfig, validateGameConfig, type GameConfig } from '../config/gameConfig.ts'
import { DiagnosticsOverlay } from '../diagnostics/diagnosticsOverlay.ts'
import { InputController } from '../input/inputController.ts'
import { WorldScene } from '../scene/worldScene.ts'
import { createEarthMoonRoute } from '../simulation/astronomy.ts'
import { createInitialJourneyState, updateJourney, type JourneyCommand, type JourneyState } from '../simulation/journeyState.ts'
import { Hud } from '../ui/hud.ts'
import { readViewPreferences, saveViewPreferences, type ViewPreferences } from '../ui/viewPreferences.ts'

export class WorldsApartApp {
  private readonly config: GameConfig
  private route
  private readonly planner: RoutePlannerUi
  private readonly audio = new AudioEngine()
  private readonly hud: Hud
  private readonly world: WorldScene
  private readonly camera: CameraController
  private readonly input: InputController
  private readonly diagnostics: DiagnosticsOverlay
  private preferences: ViewPreferences
  private state: JourneyState
  private animationFrame = 0
  private previousTimestamp: number | undefined

  constructor(root: HTMLElement, config: GameConfig = defaultGameConfig) {
    this.config = validateGameConfig(config)
    this.route = createEarthMoonRoute(config.journey.simulatedDays, config.journey.arrivalAltitudeKm)
    this.state = createInitialJourneyState(config.journey)
    this.preferences = readViewPreferences()
    this.hud = new Hud(root, config, {
      begin: () => this.planner.open(),
      replan: () => this.replan(),
      showOptions: () => this.showOptions(),
      togglePlay: () => this.dispatch({ type: 'toggle-play' }),
      toggleCamera: () => this.toggleCamera(),
      nextSpeed: () => this.dispatch({ type: 'next-speed' }),
      seek: progress => this.dispatch({ type: 'seek', progress }),
      restart: () => this.dispatch({ type: 'restart' }),
      preferencesChanged: value => this.setPreferences(value),
    }, this.preferences)
    this.planner = new RoutePlannerUi(root, this.config.journey.arrivalAltitudeKm, days => this.beginPlanned(days))
    this.world = new WorldScene(this.hud.viewport, this.route, config)
    this.world.setQuality(this.preferences.quality)
    this.camera = new CameraController(this.world.camera, config.camera)
    this.input = new InputController(this.world.renderer.domElement, {
      canInteract: () => this.state.begun && !this.planner.isOpen,
      togglePlay: () => this.dispatch({ type: 'toggle-play' }),
      toggleCamera: () => this.toggleCamera(),
      seekBy: delta => this.dispatch({ type: 'seek', progress: this.state.progress + delta }),
      look: (deltaX, deltaY) => this.camera.look(deltaX, deltaY),
      zoom: direction => this.camera.zoom(direction),
      showOptions: () => this.showOptions(),
      toggleMinimalHud: () => this.setPreferences(this.hud.toggleMinimalHud()),
    })
    this.diagnostics = new DiagnosticsOverlay(root, new URLSearchParams(window.location.search).get('debug') === '1')
    window.addEventListener('resize', this.resize)
    document.addEventListener('visibilitychange', this.pauseWhenHidden)
    console.info(`Worlds Apart: ${formatNumber(this.route.lengthKm)} km adaptive rail; Earth-Moon mean separation 384,400 km; target at ${formatNumber(this.route.arrivalMoon.length() * 1000)} km; arrival point ${formatNumber(this.route.end.length() * 1000)} km from Earth; departure ${formatNumber(this.route.start.length() * 1000)} km.`)
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  dispose() {
    cancelAnimationFrame(this.animationFrame)
    window.removeEventListener('resize', this.resize)
    document.removeEventListener('visibilitychange', this.pauseWhenHidden)
    this.input.dispose()
    this.audio.dispose()
    this.diagnostics.dispose()
    this.world.dispose()
  }

  private dispatch(command: JourneyCommand) {
    this.state = updateJourney(this.state, command, this.config.journey)
  }

  private beginPlanned(days: number) {
    this.route = createEarthMoonRoute(days, this.config.journey.arrivalAltitudeKm)
    this.world.setRoute(this.route)
    this.state = createInitialJourneyState(this.config.journey)
    this.hud.setJourneyDays(days)
    this.audio.reset()
    this.audio.start(this.preferences)
    this.audio.cue('launch', this.preferences.soundEnabled ? this.preferences.soundVolume : 0)
    this.dispatch({ type: 'begin' })
  }

  private replan() {
    this.dispatch({ type: 'pause' })
    this.state = createInitialJourneyState(this.config.journey)
    this.audio.reset()
    this.planner.open()
  }

  private toggleCamera() { this.camera.toggleMode() }

  private setPreferences(value: ViewPreferences) {
    const wasSoundEnabled = this.preferences.soundEnabled
    this.preferences = value
    this.world.setQuality(value.quality)
    if (value.soundEnabled && !wasSoundEnabled) this.audio.start(value)
    saveViewPreferences(value)
  }

  private showOptions() {
    if (this.planner.isOpen) return
    this.dispatch({ type: 'pause' })
    this.hud.openOptions()
  }

  private readonly pauseWhenHidden = () => { if (document.hidden) this.dispatch({ type: 'pause' }) }

  private readonly resize = () => this.world.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio)

  private readonly tick = (timestamp: number) => {
    const elapsed = this.previousTimestamp === undefined ? 0 : Math.min((timestamp - this.previousTimestamp) / 1000, this.config.journey.maximumFrameStepSeconds)
    this.previousTimestamp = timestamp
    this.dispatch({ type: 'advance', elapsedSeconds: elapsed })
    const telemetry = this.world.update(this.state.progress, this.camera, elapsed, this.preferences.reducedMotion)
    this.hud.render(this.state, telemetry)
    this.audio.update(this.preferences, this.state.playing, this.state.progress, missionPhaseAt(this.state.progress).name)
    this.world.render()
    this.diagnostics.update(elapsed, telemetry, this.world.renderer)
    this.animationFrame = requestAnimationFrame(this.tick)
  }
}

const formatNumber = (value: number) => Math.round(value).toLocaleString('en-GB')
