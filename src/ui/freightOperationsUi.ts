import { FREIGHT_TIERS, MATERIAL_LIMIT, quoteUpgrade, type FreightState } from '../simulation/freightEconomy.ts'
import { initialLocalNetwork, MAX_LINKS, MAX_STATIONS, ORE_CAPACITY,
  shortestRailPath, stationById, STATION_PRICE, type LocalRailNetwork } from '../simulation/localRailNetwork.ts'

export interface FreightHandlers {
  dispatch(): void
  upgrade(): void
  placeStation(x: number, y: number): boolean
  connectStations(a: string, b: string): boolean
  chooseDestination(id: string): void
  close(returnToPlanner: boolean): void
}
type EditorMode = 'inspect' | 'place' | 'link'

/** Accessible schematic editor and freight dispatch console. All construction is validated
 * by the simulation and the application, not by trusting the UI's disabled states. */
export class FreightOperationsUi {
  private readonly panel: HTMLElement
  private readonly map: SVGSVGElement
  private readonly priorInert = new Map<HTMLElement, boolean>()
  private network: LocalRailNetwork = initialLocalNetwork()
  private mode: EditorMode = 'inspect'
  private anchor: string | null = null
  private message = 'Tap a station to choose a freight destination.'
  private returnToPlanner = false
  private opener: HTMLElement | null = null

  constructor(root: HTMLElement, private readonly handlers: FreightHandlers) {
    this.panel = document.createElement('section')
    this.panel.id = 'freight-operations'
    this.panel.className = 'freight-operations hidden'
    this.panel.setAttribute('role', 'dialog')
    this.panel.setAttribute('aria-modal', 'true')
    this.panel.setAttribute('aria-labelledby', 'freight-title')
    this.panel.innerHTML = `<div class="freight-inner">
      <header class="freight-heading"><div><div class="eyebrow">WORLD OPERATIONS / EARTH ORBIT</div><h1 id="freight-title">Build a freight network</h1><p>Place orbital stations, connect them with rails, choose a destination and send alloy ore along the shortest available route.</p></div><button type="button" id="freight-close">← RETURN</button></header>
      <div class="freight-layout"><div class="freight-network"><div class="freight-network-heading">LOCAL CONSTRUCTION MAP <span>SCHEMATIC · NOT ASTRONOMICAL SCALE</span></div>
        <svg id="freight-network" viewBox="0 0 520 270" role="group" aria-label="Freight network map. Stations can also be selected using the accessible station buttons beneath the map."></svg>
        <div class="network-build-tools"><button id="freight-place" type="button">+ PLACE STATION</button><button id="freight-link" type="button">CONNECT TRACK</button><button id="freight-cancel-mode" type="button">CANCEL EDIT</button></div>
        <div class="network-coordinate-entry"><label for="freight-placement-x">Map X <input id="freight-placement-x" type="number" min="35" max="485" value="250"/></label><label for="freight-placement-y">Map Y <input id="freight-placement-y" type="number" min="30" max="235" value="80"/></label><button type="button" id="freight-build-coordinate">BUILD AT COORDINATES</button></div>
        <p id="freight-editor-message" class="network-message" role="status" aria-live="polite">Choose a station.</p>
        <div id="freight-station-list" class="network-station-list" aria-label="Station selection"></div>
        <div class="freight-progress-info"><span id="freight-status" role="status" aria-live="polite">READY TO DISPATCH</span><strong id="freight-eta">IDLE</strong></div>
        <div class="freight-progress-track"><div id="freight-progress" class="freight-progress-bar"></div></div>
        <small>Editing costs rail alloy. Connected stations can be used as destinations; the routing system finds the shortest available railway path. Freight only advances while this tab is active.</small>
      </div><div class="freight-controls">
        <div class="freight-inventory"><span>RAIL ALLOY</span><strong id="freight-materials">500</strong><small>Shared by network construction, lunar guideways and yard upgrades.</small></div>
        <div class="freight-card"><h2>01 / Ore supply</h2><p id="freight-ore">EARTH REFINERY: 250 / 250</p><div class="freight-progress-track"><div id="freight-ore-progress" class="freight-progress-bar"></div></div><small>Finite local ore inventory. The refinery replenishes 4 units per active second, up to 250.</small></div>
        <div class="freight-card"><h2>02 / Cargo route</h2><label for="freight-destination">Deliver to</label><select id="freight-destination"></select><p id="freight-route-description"></p><p id="freight-payload"></p><button type="button" id="freight-dispatch">DISPATCH FREIGHT ↗</button><div id="freight-stats" class="freight-stats"></div></div>
        <div class="freight-card"><h2>03 / Expand the fleet</h2><p id="freight-upgrade-info"></p><button type="button" id="freight-upgrade">EXPAND YARD</button></div>
        <div class="freight-card"><h2>04 / Build for the Moon</h2><p>New lunar railway layouts cost alloy once. Previously purchased layouts can be ridden again free.</p><button type="button" id="freight-to-planner">OPEN LUNAR CONSTRUCTION ↗</button></div>
      </div></div><p class="freight-footnote">Fictional short-range orbital railway. The editable local network is separate from the player-designed Earth–Moon guideway; stations are bounded to this construction map.</p></div>`
    root.append(this.panel)
    const required = <T extends Element>(selector: string): T => {
      const element = this.panel.querySelector<T>(selector)
      if (!element) throw new Error(`Missing freight console control ${selector}`)
      return element
    }
    this.map = required<SVGSVGElement>('#freight-network')
    required<HTMLButtonElement>('#freight-close').addEventListener('click', () => this.close())
    required<HTMLButtonElement>('#freight-to-planner').addEventListener('click', () => { this.returnToPlanner = true; this.close() })
    required<HTMLButtonElement>('#freight-dispatch').addEventListener('click', () => handlers.dispatch())
    required<HTMLButtonElement>('#freight-upgrade').addEventListener('click', () => handlers.upgrade())
    required<HTMLButtonElement>('#freight-place').addEventListener('click', () => this.toggleMode('place'))
    required<HTMLButtonElement>('#freight-build-coordinate').addEventListener('click', () => {
      const x = Number(required<HTMLInputElement>('#freight-placement-x').value)
      const y = Number(required<HTMLInputElement>('#freight-placement-y').value)
      this.message = handlers.placeStation(x, y) ? 'Station built. Connect it to the railway.'
        : 'Cannot build at these coordinates: check spacing, limits and available alloy.'
      this.mode = 'inspect'
      this.renderMessage()
    })
    required<HTMLButtonElement>('#freight-link').addEventListener('click', () => this.toggleMode('link'))
    required<HTMLButtonElement>('#freight-cancel-mode').addEventListener('click', () => this.toggleMode('inspect'))
    required<HTMLSelectElement>('#freight-destination').addEventListener('change', e => handlers.chooseDestination((e.target as HTMLSelectElement).value))
    this.map.addEventListener('click', e => {
      const target = e.target as Element
      const marker = target.closest('[data-network-station]')
      if (marker) { this.selectStation(marker.getAttribute('data-network-station')!); return }
      if (this.mode !== 'place') return
      const rect = this.map.getBoundingClientRect()
      const x = (e.clientX - rect.left) * 520 / rect.width
      const y = (e.clientY - rect.top) * 270 / rect.height
      this.message = handlers.placeStation(x, y)
        ? 'Station installed. Connect it to another station before dispatching.'
        : 'Cannot build here: check station spacing, map limits and available alloy.'
      this.mode = 'inspect'
      this.renderMessage()
    })
    required('#freight-station-list').addEventListener('click', e => {
      const marker = (e.target as Element).closest('[data-select-network-station]')
      if (marker) this.selectStation(marker.getAttribute('data-select-network-station')!)
    })
    this.panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); this.close() }
      if (event.key !== 'Tab') return
      const controls = Array.from(this.panel.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled)'))
        .filter(el => el.offsetWidth > 0)
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    })
  }

  private toggleMode(mode: EditorMode) {
    this.mode = this.mode === mode ? 'inspect' : mode
    this.anchor = null
    this.message = this.mode === 'place' ? `Tap a free point in the map to build a station (${STATION_PRICE} alloy).`
      : this.mode === 'link' ? 'Choose the first station, then a second to connect them.'
      : 'Tap a station to choose a delivery destination.'
    this.renderMessage()
    this.renderMap()
  }
  private selectStation(id: string) {
    if (!stationById(this.network, id)) return
    if (this.mode !== 'link') {
      if (id !== 's0') this.handlers.chooseDestination(id)
      return
    }
    if (!this.anchor) {
      this.anchor = id
      this.message = `Starting at ${stationById(this.network, id)!.name}. Choose another station.`
    } else {
      const from = this.anchor
      this.anchor = null
      if (from === id) this.message = 'Choose two different stations.'
      else this.message = this.handlers.connectStations(from, id)
        ? 'Rail connection completed. Choose another pair or select a destination.'
        : 'Cannot connect: already linked, maximum reached or insufficient alloy.'
    }
    this.renderMessage()
    this.renderMap()
  }
  private renderMessage() {
    const message = this.panel.querySelector<HTMLElement>('#freight-editor-message')!
    message.textContent = this.message
    this.panel.querySelector('#freight-place')?.classList.toggle('network-tool-active', this.mode === 'place')
    this.panel.querySelector('#freight-link')?.classList.toggle('network-tool-active', this.mode === 'link')
    this.panel.querySelector<HTMLButtonElement>('#freight-cancel-mode')!.disabled = this.mode === 'inspect'
    this.map.classList.toggle('placing-station', this.mode === 'place')
  }
  private renderMap(fraction = 0) {
    const path = this.network.activePath ?? shortestRailPath(this.network)
    const highlight = new Set<string>()
    if (path) for (let i = 1; i < path.stops.length; i++) highlight.add([path.stops[i - 1], path.stops[i]].sort().join(':'))
    const links = this.network.links.map(link => {
      const a = stationById(this.network, link.a)!, b = stationById(this.network, link.b)!
      const selected = highlight.has([link.a, link.b].sort().join(':'))
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${selected ? '#8cebd8' : '#6c9db3'}" stroke-width="${selected ? 8 : 5}" stroke-linecap="round"/><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#d5f5ff" stroke-width="1.4" stroke-dasharray="4 7"/>`
    }).join('')
    const stations = this.network.stations.map(station => `<g data-network-station="${station.id}" class="network-map-station" style="cursor:pointer">
      <circle cx="${station.x}" cy="${station.y}" r="${this.anchor === station.id ? 17 : 12}" stroke="${this.anchor === station.id ? '#ffdb90' : '#a6e5ee'}" stroke-width="3" fill="${station.id === 's0' ? '#37698e' : station.id === this.network.destination ? '#238f7c' : '#213e5e'}"/>
      <circle cx="${station.x}" cy="${station.y}" r="5" fill="#d4f8fb" pointer-events="none"/>
      <text x="${station.x}" y="${station.y + (station.y > 180 ? -22 : 26)}" fill="#e6f7ff" font-size="12" font-weight="700" text-anchor="middle" pointer-events="none">${station.name}</text></g>`).join('')
    let trainX = 93, trainY = 145
    if (path && path.stops.length > 1) {
      let remaining = path.length * Math.max(0, Math.min(1, fraction))
      for (let i = 1; i < path.stops.length; i++) {
        const a = stationById(this.network, path.stops[i - 1])!, b = stationById(this.network, path.stops[i])!
        const distance = Math.hypot(b.x - a.x, b.y - a.y)
        const t = Math.min(1, remaining / distance)
        trainX = a.x + (b.x - a.x) * t
        trainY = a.y + (b.y - a.y) * t
        remaining -= Math.min(distance, remaining)
        if (remaining <= 0) break
      }
    }
    this.map.innerHTML = `<rect x="1" y="1" width="518" height="268" rx="14" fill="#071d30" stroke="#34556a"/>
      <path d="M 25 55 H495 M25 105 H495 M25 155 H495 M25 205 H495 M75 20 V250 M175 20 V250 M275 20 V250 M375 20 V250 M475 20 V250" fill="none" stroke="#2d4b5c" stroke-width=".6"/>
      ${links}${stations}<g id="freight-train" transform="translate(${trainX.toFixed(2)} ${trainY.toFixed(2)})" pointer-events="none"><rect x="-9" y="-6" width="18" height="12" rx="3" fill="#f4ce79" stroke="#fff3bd" stroke-width="2"/><circle cx="0" cy="0" r="2.5" fill="#304352"/></g>`
  }
  get isOpen() { return !this.panel.classList.contains('hidden') }
  open(state: FreightState, network: LocalRailNetwork, returnToPlanner = false) {
    if (this.isOpen) return
    this.returnToPlanner = returnToPlanner
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    this.priorInert.clear()
    for (const sibling of Array.from(this.panel.parentElement?.children ?? [])) {
      if (sibling === this.panel || !(sibling instanceof HTMLElement)) continue
      this.priorInert.set(sibling, sibling.inert)
      sibling.inert = true
    }
    this.panel.classList.remove('hidden')
    this.render(state, network)
    this.panel.querySelector<HTMLButtonElement>('#freight-close')?.focus()
  }
  close() {
    if (!this.isOpen) return
    this.panel.classList.add('hidden')
    for (const [sibling, inert] of this.priorInert) sibling.inert = inert
    this.priorInert.clear()
    const returnToPlanner = this.returnToPlanner
    this.returnToPlanner = false
    this.handlers.close(returnToPlanner)
    if (!returnToPlanner) this.opener?.focus()
  }
  render(state: FreightState, network: LocalRailNetwork) {
    if (!this.isOpen) return
    this.network = network
    const set = (id: string, value: string) => { this.panel.querySelector<HTMLElement>(`#${id}`)!.textContent = value }
    set('freight-materials', state.materials.toLocaleString('en-GB'))
    const tier = FREIGHT_TIERS[state.tier]
    const route = shortestRailPath(network)
    const active = state.shipment
    const capacity = Math.min(tier.cargo, Math.floor(network.ore), MATERIAL_LIMIT - state.materials)
    const seconds = route ? Math.min(60, Math.max(6, Math.round(tier.seconds * route.length / 328))) : 0
    set('freight-ore', `EARTH REFINERY · ${Math.floor(network.ore)} / ${ORE_CAPACITY} ORE`)
    ;(this.panel.querySelector<HTMLElement>('#freight-ore-progress')!).style.width = `${network.ore / ORE_CAPACITY * 100}%`
    set('freight-payload', active ? `En route: ${active.cargo} alloy in ${active.totalSeconds} seconds.`
      : `Available load: ${Math.max(0, capacity)} alloy · ${tier.name}.`)
    set('freight-route-description', route
      ? `${route.stops.map(id => stationById(network, id)!.name).join(' → ')} · ${Math.round(route.length)} map units · ${seconds} seconds`
      : 'No track connection to this station. Build one to enable dispatch.')
    set('freight-status', active ? `SHUTTLE IN TRANSIT · ${active.cargo} UNITS` : route ? 'FREIGHT LINE READY' : 'ROUTE NOT CONNECTED')
    set('freight-eta', active ? `${Math.ceil(active.secondsRemaining)} S LEFT` : 'IDLE')
    const fraction = active ? 1 - active.secondsRemaining / active.totalSeconds : 0
    this.panel.querySelector<HTMLElement>('#freight-progress')!.style.width = `${Math.max(0, Math.min(100, fraction * 100))}%`
    const dispatch = this.panel.querySelector<HTMLButtonElement>('#freight-dispatch')!
    dispatch.disabled = !!active || !route || capacity < 1
    dispatch.textContent = active ? 'SHUTTLE IN TRANSIT' : !route ? 'TRACK CONNECTION REQUIRED' : capacity < 1 ? 'WAIT FOR ORE / STORAGE' : `DISPATCH ${capacity} ALLOY ↗`
    set('freight-stats', `${state.shipments} deliveries · ${state.delivered} alloy delivered · ${network.stations.length} stations · ${network.links.length} links`)
    const upgrade = quoteUpgrade(state)
    const button = this.panel.querySelector<HTMLButtonElement>('#freight-upgrade')!
    button.disabled = !upgrade.available
    if (upgrade.nextTier === null) { button.textContent = 'FULLY UPGRADED'; set('freight-upgrade-info', 'Maximum yard capacity reached.') }
    else {
      const next = FREIGHT_TIERS[upgrade.nextTier]
      button.textContent = `BUILD ${next.name.toUpperCase()} · ${upgrade.cost} ALLOY`
      set('freight-upgrade-info', `${next.cargo} alloy maximum per dispatch. ${next.seconds}s at the original line distance; needs ${next.minShipments} deliveries${upgrade.deliveriesNeeded ? ` (${upgrade.deliveriesNeeded} more)` : ''}.`)
    }
    const select = this.panel.querySelector<HTMLSelectElement>('#freight-destination')!
    if (select.options.length !== network.stations.length - 1 || [...select.options].some((o, i) => o.value !== network.stations[i + 1].id)) {
      select.replaceChildren(...network.stations.slice(1).map(station => new Option(station.name, station.id)))
    }
    select.value = network.destination
    const list = this.panel.querySelector<HTMLElement>('#freight-station-list')!
    const listKey = network.stations.map(s => s.id).join('|') + ':' + network.destination
    if (list.dataset.renderKey !== listKey) {
      list.dataset.renderKey = listKey
      list.replaceChildren(...network.stations.map(station => {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'network-station-button'
      item.dataset.selectNetworkStation = station.id
      item.textContent = `${station.name} ${station.id === network.destination ? '· DESTINATION' : station.id === 's0' ? '· SOURCE' : ''}`
      return item
      }))
    }
    this.panel.querySelector<HTMLButtonElement>('#freight-place')!.disabled = network.stations.length >= MAX_STATIONS || state.materials < STATION_PRICE
    this.panel.querySelector<HTMLButtonElement>('#freight-build-coordinate')!.disabled = network.stations.length >= MAX_STATIONS || state.materials < STATION_PRICE
    this.panel.querySelector<HTMLButtonElement>('#freight-link')!.disabled = network.links.length >= MAX_LINKS
    this.renderMessage()
    this.renderMap(fraction)
  }
  dispose() {
    for (const [sibling, inert] of this.priorInert) sibling.inert = inert
    this.priorInert.clear()
    this.panel.remove()
  }
}
