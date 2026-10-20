import type { CameraMode } from '../camera/cameraController.ts'
import type { GameConfig } from '../config/gameConfig.ts'
import type { JourneyState } from '../simulation/journeyState.ts'
import type { Telemetry } from '../scene/worldScene.ts'

export interface HudHandlers {
  begin(): void
  togglePlay(): void
  toggleCamera(): void
  nextSpeed(): void
  seek(progress: number): void
  restart(): void
}

const required = <T extends HTMLElement>(root: ParentNode, selector: string) => {
  const element = root.querySelector<T>(selector)
  if (!element) throw new Error(`Missing HUD element: ${selector}`)
  return element
}

export class Hud {
  private readonly totalDays: number
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

  constructor(private readonly root: HTMLElement, config: GameConfig, handlers: HudHandlers) {
    this.totalDays = config.journey.simulatedDays
    root.innerHTML = `<div id="viewport"></div>
<div class="vignette"></div>
<header><div class="brand"><span class="mark">◈</span><div><small>AN INTERPLANETARY RAIL EXPERIENCE</small><strong>WORLDS <em>APART</em></strong></div></div><div class="chapter">MILESTONE 01 <span>•</span> EARTH → MOON</div></header>
<div class="reticle"><i></i><i></i><i></i><i></i></div>
<div class="destination"><span>✦ &nbsp; NEXT DESTINATION</span><strong>${config.copy.destination}</strong><small id="distance">384,400 km away</small></div>
<div class="left-panel"><div class="eyebrow">MISSION TELEMETRY <span class="live">● LIVE</span></div><div class="reading"><span>JOURNEY</span><strong id="percent">0%</strong></div><div class="reading"><span>EARTH DISTANCE</span><strong id="earth-distance">0 km</strong></div><div class="reading"><span>MOON APPARENT SIZE</span><strong id="angular">0.52°</strong></div><div class="reading"><span>SIMULATED TIME</span><strong id="days">DAY 0.00 / ${config.journey.simulatedDays.toFixed(2)}</strong></div></div>
<div class="arrival hidden" id="arrival"><span>DESTINATION REACHED</span><h1>${config.copy.arrivalTitle}</h1><p>${config.copy.arrivalBody}</p><button id="restart">RIDE AGAIN ↗</button></div>
<div class="bottom"><div class="progress-label"><span>EARTH <b>DEPARTURE</b></span><span>384,400 KM <b>MEAN SEPARATION</b></span><span>MOON <b>ARRIVAL</b></span></div><input id="scrub" aria-label="Journey progress" type="range" min="0" max="1000" value="0"/><div class="controls"><button id="play" class="primary" aria-label="Pause journey">Ⅱ <span>PAUSE</span></button><button id="camera" aria-label="Switch to external camera">◉ <span>EXTERNAL VIEW</span></button><button id="speed" aria-label="Change speed">1× <span>SPEED</span></button><div class="hint">DRAG TO LOOK AROUND <span>·</span> SCROLL TO ZOOM <span>·</span> SPACE TO PAUSE <span>·</span> C TO SWITCH CAMERA</div></div></div>
<div class="intro" id="intro"><div class="intro-card"><div class="eyebrow">${config.copy.introEyebrow}</div><h1>${config.copy.introTitleHtml}</h1><p>${config.copy.introBody}</p><button id="begin">${config.copy.begin} <span>↗</span></button><small>3 MINUTES AT 1× &nbsp; • &nbsp; DRAG TO LOOK &nbsp; • &nbsp; SWITCH CAMERAS</small></div></div>`
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
    this.play.addEventListener('click', handlers.togglePlay)
    this.camera.addEventListener('click', handlers.toggleCamera)
    this.speed.addEventListener('click', handlers.nextSpeed)
    this.scrub.addEventListener('input', () => handlers.seek(Number(this.scrub.value) / 1000))
    required(root, '#restart').addEventListener('click', handlers.restart)
  }

  get viewport() { return required<HTMLElement>(this.root, '#viewport') }

  render(state: JourneyState, telemetry: Telemetry) {
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
    this.arrival.classList.toggle('hidden', state.progress < 0.999)
  }

  private renderCamera(mode: CameraMode) {
    const external = mode === 'external'
    this.camera.innerHTML = external ? '◉ <span>FIRST-PERSON VIEW</span>' : '◉ <span>EXTERNAL VIEW</span>'
    this.camera.setAttribute('aria-label', external ? 'Switch to first-person camera' : 'Switch to external camera')
  }

}

const formatNumber = (value: number) => Math.round(value).toLocaleString('en-GB')
