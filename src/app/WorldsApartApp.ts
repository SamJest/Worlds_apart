import { AudioEngine } from '../audio/audioEngine.ts'
import { addLink, addStation, advanceNetworkProduction, beginNetworkShipment, completeNetworkShipment, linkCost, readLocalNetwork, saveLocalNetwork, selectDestination, shortestRailPath, stationById, STATION_PRICE, type LocalRailNetwork } from '../simulation/localRailNetwork.ts'
import { FreightOperationsUi } from '../ui/freightOperationsUi.ts'
import { advanceFreight, buildRoute, dispatchFreight, FREIGHT_TIERS, MATERIAL_LIMIT, quoteRoute, readFreightState, routeOwnershipId, saveFreightState, upgradeFreightYard, type FreightState } from '../simulation/freightEconomy.ts'
import { RoutePlannerUi } from '../ui/routePlannerUi.ts'
import { missionPhaseAt } from '../simulation/missionPhases.ts'
import { CameraController } from '../camera/cameraController.ts'
import { defaultGameConfig, validateGameConfig, type GameConfig } from '../config/gameConfig.ts'
import { DiagnosticsOverlay } from '../diagnostics/diagnosticsOverlay.ts'
import { InputController } from '../input/inputController.ts'
import { WorldScene } from '../scene/worldScene.ts'
import { createEarthMoonRoute } from '../simulation/astronomy.ts'
import { evaluateGuideway } from '../simulation/constructionRoute.ts'
import type { GuidewayDesign } from '../simulation/constructionPlan.ts'
import { createInitialJourneyState, updateJourney, type JourneyCommand, type JourneyState } from '../simulation/journeyState.ts'
import { Hud } from '../ui/hud.ts'
import { readViewPreferences, saveViewPreferences, type ViewPreferences } from '../ui/viewPreferences.ts'

export class WorldsApartApp {
  private readonly config: GameConfig
  private route
  private readonly planner: RoutePlannerUi
  private readonly freight: FreightOperationsUi
  private freightState: FreightState = readFreightState()
  private localNetwork: LocalRailNetwork = readLocalNetwork()
  private freightRenderElapsed = 0
  private freightSaveElapsed = 0
  private networkSaveElapsed = 0
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
    // A save interruption or import from the previous freight prototype can leave the
    // network path out of sync. A completed shipment is never kept permanently active.
    if (!this.freightState.shipment && this.localNetwork.activePath) {
      this.localNetwork = completeNetworkShipment(this.localNetwork)
      saveLocalNetwork(this.localNetwork)
    }
    this.route = createEarthMoonRoute(config.journey.simulatedDays, config.journey.arrivalAltitudeKm)
    this.state = createInitialJourneyState(config.journey)
    this.preferences = readViewPreferences()
    this.hud = new Hud(root, config, {
      begin: () => this.planner.open(),
      replan: () => this.replan(),
      openFreight: () => this.openFreight(),
      showOptions: () => this.showOptions(),
      togglePlay: () => this.dispatch({ type: 'toggle-play' }),
      toggleCamera: () => this.toggleCamera(),
      nextSpeed: () => this.dispatch({ type: 'next-speed' }),
      seek: progress => this.dispatch({ type: 'seek', progress }),
      restart: () => this.dispatch({ type: 'restart' }),
      preferencesChanged: value => this.setPreferences(value),
    }, this.preferences)
    this.planner = new RoutePlannerUi(root, this.config.journey.arrivalAltitudeKm, (days, design) => this.beginPlanned(days, design), {
      quote: (days, design, units) => quoteRoute(this.freightState, routeOwnershipId(days, design), units),
      openFreight: () => this.openFreight(true),
    })
    this.freight = new FreightOperationsUi(root, {
      dispatch: () => this.dispatchLocalFreight(),
      upgrade: () => this.changeFreight(upgradeFreightYard(this.freightState)),
      placeStation: (x, y) => this.placeLocalStation(x, y),
      connectStations: (a, b) => this.connectLocalStations(a, b),
      chooseDestination: id => this.changeNetwork(selectDestination(this.localNetwork, id)),
      close: returnToPlanner => { if (returnToPlanner) this.planner.open() },
    })
    this.hud.setFreightStats(this.freightState.materials, this.freightState.shipment?.secondsRemaining ?? null)
    this.world = new WorldScene(this.hud.viewport, this.route, config)
    this.world.setQuality(this.preferences.quality)
    this.camera = new CameraController(this.world.camera, config.camera)
    this.input = new InputController(this.world.renderer.domElement, {
      canInteract: () => this.state.begun && !this.planner.isOpen && !this.freight.isOpen,
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
    this.freight.dispose()
    this.planner.dispose()
    saveFreightState(this.freightState)
    saveLocalNetwork(this.localNetwork)
    this.audio.dispose()
    this.diagnostics.dispose()
    this.world.dispose()
  }

  private dispatch(command: JourneyCommand) {
    this.state = updateJourney(this.state, command, this.config.journey)
  }

  private beginPlanned(days: number, design: GuidewayDesign): boolean {
    const constructed = evaluateGuideway(days, this.config.journey.arrivalAltitudeKm, design)
    if (!constructed.valid) return false
    const id = routeOwnershipId(days, design)
    const quote = quoteRoute(this.freightState, id, constructed.materialUnits)
    if (quote.shortfall > 0) return false
    this.changeFreight(buildRoute(this.freightState, id, constructed.materialUnits))
    this.route = constructed.route
    this.world.setRoute(this.route)
    this.state = createInitialJourneyState(this.config.journey)
    this.hud.setJourneyDays(days)
    this.hud.setBuildDetails(constructed.route.lengthKm, constructed.nodes.length, constructed.materialUnits)
    this.audio.reset()
    this.audio.start(this.preferences)
    this.audio.cue('launch', this.preferences.soundEnabled ? this.preferences.soundVolume : 0)
    this.dispatch({ type: 'begin' })
    return true
  }


  /** The local rail network and the old material account are separate saved schemas.
   * Dispatch both together only after validating a real connected route and available ore. */
  private dispatchLocalFreight() {
    const route = shortestRailPath(this.localNetwork)
    if (!route || this.freightState.shipment) return
    const cargo = Math.min(FREIGHT_TIERS[this.freightState.tier].cargo, Math.floor(this.localNetwork.ore), MATERIAL_LIMIT - this.freightState.materials)
    if (cargo <= 0) return
    const freight = dispatchFreight(this.freightState, { cargo, routeLength: route.length })
    const network = beginNetworkShipment(this.localNetwork, route, cargo)
    if (freight === this.freightState || !network) return
    this.changeFreight(freight)
    this.changeNetwork(network)
  }

  private changeNetwork(network: LocalRailNetwork) {
    if (network === this.localNetwork) return
    this.localNetwork = network
    saveLocalNetwork(network)
    this.freight.render(this.freightState, network)
  }

  private placeLocalStation(x: number, y: number): boolean {
    if (this.freightState.materials < STATION_PRICE) return false
    const changed = addStation(this.localNetwork, x, y)
    if (!changed) return false
    this.changeFreight({ ...this.freightState, materials: this.freightState.materials - STATION_PRICE })
    this.changeNetwork(changed)
    return true
  }

  private connectLocalStations(a: string, b: string): boolean {
    const left = stationById(this.localNetwork, a), right = stationById(this.localNetwork, b)
    if (!left || !right) return false
    const updated = addLink(this.localNetwork, a, b)
    const price = linkCost(left, right)
    if (!updated || this.freightState.materials < price) return false
    this.changeFreight({ ...this.freightState, materials: this.freightState.materials - price })
    this.changeNetwork(updated)
    return true
  }

  private changeFreight(updated: FreightState) {
    if (updated === this.freightState) return
    this.freightState = updated
    this.freightSaveElapsed = 0
    saveFreightState(updated)
    this.freight.render(updated, this.localNetwork)
    this.hud.setFreightStats(updated.materials, updated.shipment?.secondsRemaining ?? null)
  }

  private openFreight(returnToPlanner = false) {
    if (this.freight.isOpen) return
    this.dispatch({ type: 'pause' })
    this.freight.open(this.freightState, this.localNetwork, returnToPlanner)
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

  private readonly pauseWhenHidden = () => {
    this.previousTimestamp = undefined
    if (document.hidden) { this.dispatch({ type: 'pause' }); saveFreightState(this.freightState); saveLocalNetwork(this.localNetwork) }
  }

  private readonly resize = () => this.world.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio)

  private readonly tick = (timestamp: number) => {
    const rawElapsed = this.previousTimestamp === undefined ? 0 : Math.max(0, (timestamp - this.previousTimestamp) / 1000)
    const elapsed = Math.min(rawElapsed, this.config.journey.maximumFrameStepSeconds)
    this.previousTimestamp = timestamp
    this.dispatch({ type: 'advance', elapsedSeconds: elapsed })
    if (!document.hidden) {
      const produced = advanceNetworkProduction(this.localNetwork, Math.min(rawElapsed, 1))
      if (produced !== this.localNetwork) {
        this.localNetwork = produced
        this.networkSaveElapsed += Math.min(rawElapsed, 1)
        if (this.networkSaveElapsed >= 1) {
          this.networkSaveElapsed = 0
          saveLocalNetwork(this.localNetwork)
        }
      }
    }
    if (!document.hidden && this.freightState.shipment) {
      const previous = this.freightState
      const freightElapsed = Math.min(rawElapsed, 1)
      this.freightState = advanceFreight(previous, freightElapsed)
      if (!this.freightState.shipment && previous.shipment) {
        this.localNetwork = completeNetworkShipment(this.localNetwork)
        this.freightSaveElapsed = 0
        saveFreightState(this.freightState)
        saveLocalNetwork(this.localNetwork)
        this.hud.setFreightStats(this.freightState.materials, null)
      } else {
        this.freightSaveElapsed += freightElapsed
        if (this.freightSaveElapsed >= 1) {
          this.freightSaveElapsed = 0
          saveFreightState(this.freightState)
          saveLocalNetwork(this.localNetwork)
        }
      }
    }
    this.freightRenderElapsed += elapsed
    if (this.freightRenderElapsed >= 0.2) {
      this.freightRenderElapsed = 0
      this.freight.render(this.freightState, this.localNetwork)
      if (this.freightState.shipment) this.hud.setFreightStats(this.freightState.materials, this.freightState.shipment.secondsRemaining)
    }
    const telemetry = this.world.update(this.state.progress, this.camera, elapsed, this.preferences.reducedMotion, this.freightState, this.localNetwork)
    this.hud.render(this.state, telemetry)
    this.audio.update(this.preferences, this.state.playing, this.state.progress, missionPhaseAt(this.state.progress).name)
    this.world.render()
    this.diagnostics.update(elapsed, telemetry, this.world.renderer)
    this.animationFrame = requestAnimationFrame(this.tick)
  }
}

const formatNumber = (value: number) => Math.round(value).toLocaleString('en-GB')
