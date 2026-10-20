import type { CameraMode } from '../camera/cameraController.ts'
import type { GameConfig } from '../config/gameConfig.ts'
import type { JourneyState } from '../simulation/journeyState.ts'
import type { Telemetry } from '../scene/worldScene.ts'
import { formatRideTime, missionPhaseAt, remainingRideSeconds } from '../simulation/missionPhases.ts'
import type { ViewPreferences, QualityPreset } from './viewPreferences.ts'

export interface HudHandlers {
  begin(): void
  replan(): void
  showOptions(): void
  togglePlay(): void
  toggleCamera(): void
  nextSpeed(): void
  seek(progress: number): void
  restart(): void
  preferencesChanged(value: ViewPreferences): void
}

const required = <T extends HTMLElement>(root: ParentNode, selector: string) => {
  const element = root.querySelector<T>(selector)
  if (!element) throw new Error(`Missing HUD element: ${selector}`)
  return element
}

export class Hud {
  private totalDays: number
  private readonly durationSeconds: number
  private preferences: ViewPreferences
  private readonly phase: HTMLElement
  private readonly rideTime: HTMLElement
  private readonly builtTrack: HTMLElement
  private readonly buildArrival: HTMLElement
  private readonly options: HTMLDialogElement
  private readonly percent: HTMLElement
  private readonly earthDistance: HTMLElement
  private readonly moonDistance: HTMLElement
  private readonly angular: HTMLElement
  private readonly days: HTMLElement
  private readonly scrub: HTMLInputElement
  private readonly play: HTMLButtonElement
  private readonly camera: HTMLButtonElement
  private readonly speed: HTMLButtonElement
  private readonly intro: HTMLElement
  private readonly arrival: HTMLElement

  constructor(private readonly root: HTMLElement, config: GameConfig, handlers: HudHandlers, preferences: ViewPreferences) {
    this.preferences = preferences
    this.durationSeconds = config.journey.durationSeconds
    this.totalDays = config.journey.simulatedDays
    root.innerHTML = `<div id="viewport"></div>
<div class="vignette"></div>
<header><div class="brand"><span class="mark">◈</span><div><small>AN INTERPLANETARY RAIL EXPERIENCE</small><strong>WORLDS <em>APART</em></strong></div></div><div class="header-actions"><button id="settings-open" type="button" aria-haspopup="dialog" aria-controls="settings">⚙ <span>OPTIONS</span></button><div class="chapter">MILESTONE 01 <span>•</span> EARTH → MOON</div></div></header>
<div class="reticle"><i></i><i></i><i></i><i></i></div>
<div class="destination"><span>✦ &nbsp; NEXT DESTINATION</span><strong>${config.copy.destination}</strong><small id="distance">384,400 km away</small></div>
<div class="left-panel"><div class="eyebrow">MISSION TELEMETRY <span class="live">● LIVE</span></div><div class="reading"><span>JOURNEY</span><strong id="percent">0%</strong></div><div class="reading"><span>EARTH DISTANCE</span><strong id="earth-distance">0 km</strong></div><div class="reading"><span>MOON APPARENT SIZE</span><strong id="angular">0.52°</strong></div><div class="reading"><span>SIMULATED TIME</span><strong id="days">DAY 0.00 / ${config.journey.simulatedDays.toFixed(2)}</strong></div><div class="reading"><span>PHASE</span><strong id="phase">DEPARTURE</strong></div><div class="reading"><span>BUILT TRACK</span><strong id="built-track">—</strong></div><div class="reading"><span>RIDE TIME LEFT</span><strong id="ride-time">3:00</strong></div></div>
<div class="arrival hidden" id="arrival"><span>DESTINATION REACHED</span><h1>${config.copy.arrivalTitle}</h1><p>${config.copy.arrivalBody}</p><p class="build-arrival" id="build-arrival">You have completed the Earth-to-Moon railway.</p><div class="arrival-actions"><button id="restart">RIDE AGAIN ↗</button><button id="replan" class="secondary">PLOT NEW ROUTE ↗</button></div></div>
<div class="bottom"><div class="progress-label"><span>EARTH <b>DEPARTURE</b></span><span>384,400 KM <b>MEAN SEPARATION</b></span><span>MOON <b>ARRIVAL</b></span></div><input id="scrub" aria-label="Journey progress" type="range" min="0" max="1000" value="0"/><div class="controls"><button id="play" class="primary" aria-label="Pause journey">Ⅱ <span>PAUSE</span></button><button id="camera" aria-label="Switch to external camera">◉ <span>EXTERNAL VIEW</span></button><button id="speed" aria-label="Change speed">1× <span>SPEED</span></button><div class="hint">DRAG TO LOOK AROUND <span>·</span> SCROLL TO ZOOM <span>·</span> SPACE TO PAUSE <span>·</span> C TO SWITCH CAMERA</div></div></div>
<dialog class="settings-dialog" id="settings" aria-labelledby="settings-title"><h2 id="settings-title">Experience settings</h2><p>Adjust the view for comfort. Your choices are saved on this device.</p><label><input id="setting-motion" type="checkbox"/> Reduced camera motion</label><small>Turns off external camera easing and animated station lighting.</small><label><input id="setting-contrast" type="checkbox"/> Higher interface contrast</label><small>Improves panel and button visibility against the starfield.</small><label><input id="setting-minimal" type="checkbox"/> Cinematic view</label><small>Hide the HUD during travel. Open Options to bring it back.</small><label for="setting-quality">Render quality</label><select id="setting-quality" aria-label="Render quality"><option value="auto">Auto (recommended)</option><option value="performance">Battery saver</option><option value="quality">Highest detail</option></select><small>Changes rendering resolution and the number of visible stars immediately.</small><label><input id="setting-sound" type="checkbox"/> Atmospheric audio</label><small>Original synthesised rail ambience. Plays only after you start the journey.</small><label for="setting-volume">Audio level <output id="setting-volume-value">55%</output></label><input id="setting-volume" type="range" min="0" max="100" value="55" step="5" aria-label="Audio volume"/><div class="settings-help"><strong>CONTROLS</strong><p>Drag / swipe: look around · C: camera · Space: pause · ← →: seek · Scroll: external zoom · H: cinematic view · ?: options</p></div><button id="settings-close" type="button">RETURN TO JOURNEY</button></dialog>
<div class="intro" id="intro"><div class="intro-card"><div class="eyebrow">${config.copy.introEyebrow}</div><h1>${config.copy.introTitleHtml}</h1><p>${config.copy.introBody}</p><button id="begin">PLOT YOUR ROUTE <span>↗</span></button><button id="intro-options" type="button">SETTINGS & ACCESSIBILITY</button><small>3 MINUTES AT 1× &nbsp; • &nbsp; DRAG TO LOOK &nbsp; • &nbsp; SWITCH CAMERAS</small></div></div>`
    this.phase = required(root, '#phase')
    this.rideTime = required(root, '#ride-time')
    this.builtTrack = required(root, '#built-track')
    this.buildArrival = required(root, '#build-arrival')
    this.options = required<HTMLDialogElement>(root, '#settings')
    this.percent = required(root, '#percent')
    this.earthDistance = required(root, '#earth-distance')
    this.moonDistance = required(root, '#distance')
    this.angular = required(root, '#angular')
    this.days = required(root, '#days')
    this.scrub = required(root, '#scrub')
    this.play = required(root, '#play')
    this.camera = required(root, '#camera')
    this.speed = required(root, '#speed')
    this.intro = required(root, '#intro')
    this.arrival = required(root, '#arrival')
    required(root, '#begin').addEventListener('click', handlers.begin)
    required(root, '#intro-options').addEventListener('click', handlers.showOptions)
    this.play.addEventListener('click', handlers.togglePlay)
    this.camera.addEventListener('click', handlers.toggleCamera)
    this.speed.addEventListener('click', handlers.nextSpeed)
    this.scrub.addEventListener('input', () => handlers.seek(Number(this.scrub.value) / 1000))
    required(root, '#restart').addEventListener('click', handlers.restart)
    required(root, '#replan').addEventListener('click', handlers.replan)
    const motion = required<HTMLInputElement>(root, '#setting-motion')
    const contrast = required<HTMLInputElement>(root, '#setting-contrast')
    const minimal = required<HTMLInputElement>(root, '#setting-minimal')
    const quality = required<HTMLSelectElement>(root, '#setting-quality')
    const sound = required<HTMLInputElement>(root, '#setting-sound')
    const volume = required<HTMLInputElement>(root, '#setting-volume')
    const volumeValue = required<HTMLOutputElement>(root, '#setting-volume-value')
    const inputs = [motion, contrast, minimal, sound]
    const reflect = () => {
      motion.checked = this.preferences.reducedMotion
      contrast.checked = this.preferences.highContrast
      minimal.checked = this.preferences.minimalHud
      quality.value = this.preferences.quality
      sound.checked = this.preferences.soundEnabled
      volume.value = String(Math.round(this.preferences.soundVolume * 100))
      volume.disabled = !sound.checked
      volumeValue.textContent = `${Math.round(this.preferences.soundVolume * 100)}%`
      root.classList.toggle('reduced-motion', this.preferences.reducedMotion)
      root.classList.toggle('high-contrast', this.preferences.highContrast)
      root.classList.toggle('minimal-hud', this.preferences.minimalHud)
    }
    const changed = () => {
      this.preferences = { reducedMotion: motion.checked, highContrast: contrast.checked, minimalHud: minimal.checked, quality: quality.value as QualityPreset, soundEnabled: sound.checked, soundVolume: Number(volume.value) / 100 }
      reflect()
      handlers.preferencesChanged(this.preferences)
    }
    inputs.forEach(input => input.addEventListener('change', changed))
    quality.addEventListener('change', changed)
    volume.addEventListener('input', changed)
    reflect()
    required(root, '#settings-open').addEventListener('click', handlers.showOptions)
    required(root, '#settings-close').addEventListener('click', () => this.closeOptions())
  }

  setBuildDetails(lengthKm: number, anchorCount: number, materialUnits: number) {
    const track = `${formatNumber(lengthKm)} KM`
    this.builtTrack.textContent = track
    this.buildArrival.textContent = `YOU BUILT ${track} OF ADAPTIVE RAIL · ${anchorCount} CONSTRUCTION ANCHOR${anchorCount === 1 ? '' : 'S'} · ${formatNumber(materialUnits)} MATERIAL UNITS.`
  }

  setJourneyDays(days: number) {
    this.totalDays = days
    this.days.textContent = `DAY 0.00 / ${days.toFixed(2)}`
  }

  get optionsOpen() { return this.options.open }

  openOptions() { if (!this.options.open) this.options.showModal() }

  closeOptions() { if (this.options.open) this.options.close() }

  toggleMinimalHud() {
    this.preferences = { ...this.preferences, minimalHud: !this.preferences.minimalHud }
    required<HTMLInputElement>(this.root, '#setting-minimal').checked = this.preferences.minimalHud
    this.root.classList.toggle('minimal-hud', this.preferences.minimalHud)
    return this.preferences
  }

  get viewport() { return required<HTMLElement>(this.root, '#viewport') }

  render(state: JourneyState, telemetry: Telemetry) {
    this.phase.textContent = missionPhaseAt(state.progress).name
    this.rideTime.textContent = state.progress >= 1 ? 'ARRIVED' : `${formatRideTime(remainingRideSeconds(state.progress, this.durationSeconds, state.speed))}${state.playing ? '' : ' · PAUSED'}`
    this.percent.textContent = `${Math.round(state.progress * 100)}%`
    this.earthDistance.textContent = `${formatNumber(telemetry.earthDistanceKm)} km`
    this.moonDistance.textContent = `${formatNumber(telemetry.moonDistanceKm)} km away`
    this.angular.textContent = `${telemetry.moonAngularDiameterDegrees.toFixed(2)}°`
    this.days.textContent = `DAY ${telemetry.simulatedDays.toFixed(2)} / ${this.totalDays.toFixed(2)}`
    this.scrub.value = String(Math.round(state.progress * 1000))
    this.scrub.style.setProperty('--fill', `${state.progress * 100}%`)
    this.play.innerHTML = state.playing ? 'Ⅱ <span>PAUSE</span>' : '▶ <span>RESUME</span>'
    this.play.setAttribute('aria-label', state.playing ? 'Pause journey' : 'Resume journey')
    this.speed.innerHTML = `${state.speed}× <span>SPEED</span>`
    this.renderCamera(telemetry.cameraMode)
    this.intro.classList.toggle('hidden', state.begun)
    this.arrival.classList.toggle('hidden', state.progress < 0.995)
  }

  private renderCamera(mode: CameraMode) {
    const external = mode === 'external'
    this.camera.innerHTML = external ? '◉ <span>FIRST-PERSON VIEW</span>' : '◉ <span>EXTERNAL VIEW</span>'
    this.camera.setAttribute('aria-label', external ? 'Switch to first-person camera' : 'Switch to external camera')
  }

}

const formatNumber = (value: number) => Math.round(value).toLocaleString('en-GB')
