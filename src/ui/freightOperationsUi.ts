import { FREIGHT_TIERS, MATERIAL_LIMIT, quoteUpgrade, type FreightState } from '../simulation/freightEconomy.ts'

export interface FreightHandlers {
  dispatch(): void
  upgrade(): void
  close(returnToPlanner: boolean): void
}

/** Small touch/keyboard-operable orbital freight console, independent of the 3D renderer. */
export class FreightOperationsUi {
  private readonly panel: HTMLElement
  private readonly materials: HTMLElement
  private readonly inTransit: HTMLElement
  private readonly progress: HTMLElement
  private readonly train: SVGGElement
  private readonly dispatchButton: HTMLButtonElement
  private readonly upgradeButton: HTMLButtonElement
  private readonly upgradeText: HTMLElement
  private readonly stats: HTMLElement
  private readonly status: HTMLElement
  private readonly priorInert = new Map<HTMLElement, boolean>()
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
      <header class="freight-heading"><div><div class="eyebrow">WORLD OPERATIONS / EARTH ORBIT</div><h1 id="freight-title">Freight &amp; fabrication</h1><p>Ship rail alloy from Earth Depot to Orbital Yard on a short freight guideway. Deliveries replenish materials used to build new Earth–Moon railway routes.</p></div><button type="button" id="freight-close">← RETURN</button></header>
      <div class="freight-layout"><div class="freight-network"><div class="freight-network-heading">LOCAL NETWORK <span>SCHEMATIC · NOT TO ASTRONOMICAL SCALE</span></div>
        <svg id="freight-network" viewBox="0 0 520 270" role="img" aria-label="Rail line between Earth Depot and Orbital Yard with a moving cargo train">
          <defs><linearGradient id="freight-rail-gradient" x1="0" x2="1"><stop stop-color="#5ec9f1"/><stop offset="1" stop-color="#a8e6c8"/></linearGradient></defs>
          <circle cx="77" cy="133" r="50" fill="#103d61" stroke="#64bbdf" stroke-width="2"/><circle cx="77" cy="133" r="33" fill="#16577b" opacity=".65"/>
          <path d="M 127 134 L 393 134" stroke="#5d98ad" stroke-width="13" stroke-linecap="round"/><path d="M 127 129 L 393 129 M 127 139 L 393 139" stroke="url(#freight-rail-gradient)" stroke-width="3" stroke-linecap="round"/>
          <path d="M 150 122 v24 M 185 122 v24 M 220 122 v24 M 255 122 v24 M 290 122 v24 M 325 122 v24 M 360 122 v24" stroke="#b8e0e5" stroke-width="3"/>
          <g id="freight-train" transform="translate(137 133)"><rect x="-17" y="-15" width="34" height="30" rx="6" fill="#f4c878" stroke="#ffe5a6" stroke-width="2"/><rect x="-10" y="-7" width="20" height="14" rx="2" fill="#15384e"/><circle cx="-14" cy="13" r="3" fill="#b8def1"/><circle cx="14" cy="13" r="3" fill="#b8def1"/></g>
          <circle cx="423" cy="133" r="37" fill="#112e3f" stroke="#b6e3d5" stroke-width="3"/><circle cx="423" cy="133" r="15" fill="#6aa8a4"/>
          <path id="freight-siding" d="M 235 133 Q 266 77 319 79 L 390 79" fill="none" stroke="#b7d8ef" stroke-width="4" stroke-dasharray="8 7"/>
          <text x="77" y="209" text-anchor="middle">EARTH DEPOT</text><text x="423" y="201" text-anchor="middle">ORBITAL YARD</text>
          <text x="260" y="177" text-anchor="middle" class="freight-route-caption">CARGO GUIDEW​AY · ALLOY SHUTTLE</text>
        </svg><div class="freight-progress-info"><span id="freight-status" role="status" aria-live="polite">READY TO DISPATCH</span><strong id="freight-eta">IDLE</strong></div><div class="freight-progress-track"><div id="freight-progress" class="freight-progress-bar"></div></div>
        <small>Shipments operate in real play time, independently of the Moon journey speed. Time does not advance while this tab is hidden.</small>
      </div><div class="freight-controls">
        <div class="freight-inventory"><span>AVAILABLE RAIL ALLOY</span><strong id="freight-materials">500</strong><small>Material units · shared with railway construction · 1 unit per 1,000 km</small></div>
        <div class="freight-card"><h2>01 / Dispatch cargo</h2><p id="freight-payload">Earth Depot prepares a 45-unit load for Orbital Yard.</p><button type="button" id="freight-dispatch">DISPATCH FREIGHT SHUTTLE ↗</button><div id="freight-stats" class="freight-stats">0 shipments delivered</div></div>
        <div class="freight-card"><h2>02 / Expand the network</h2><p id="freight-upgrade-info">Make deliveries to unlock a larger rail yard and faster, higher-capacity services.</p><button type="button" id="freight-upgrade">EXPAND YARD</button></div>
        <div class="freight-card"><h2>03 / Build for the Moon</h2><p>New lunar railway layouts consume their rail alloy cost once. Reusing a previously built layout is free.</p><button type="button" id="freight-to-planner">OPEN LUNAR CONSTRUCTION ↗</button></div>
      </div></div><p class="freight-footnote">Fictional logistics prototype: Earth supplies the initial alloy. Stations and rail are simplified; no complex commodity chains or real orbital mechanics.</p></div>`
    root.append(this.panel)
    const required = <T extends Element>(selector: string): T => {
      const el = this.panel.querySelector<T>(selector)
      if (!el) throw new Error(`Missing freight console: ${selector}`)
      return el
    }
    this.materials = required('#freight-materials')
    this.inTransit = required('#freight-eta')
    this.status = required('#freight-status')
    this.progress = required('#freight-progress')
    this.train = required<SVGGElement>('#freight-train')
    this.dispatchButton = required<HTMLButtonElement>('#freight-dispatch')
    this.upgradeButton = required<HTMLButtonElement>('#freight-upgrade')
    this.upgradeText = required('#freight-upgrade-info')
    this.stats = required('#freight-stats')
    this.dispatchButton.addEventListener('click', handlers.dispatch)
    this.upgradeButton.addEventListener('click', handlers.upgrade)
    required<HTMLButtonElement>('#freight-close').addEventListener('click', () => this.close())
    required<HTMLButtonElement>('#freight-to-planner').addEventListener('click', () => { this.returnToPlanner = true; this.close() })
    this.panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); this.close() }
      if (event.key !== 'Tab') return
      const controls = Array.from(this.panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    })
  }

  get isOpen() { return !this.panel.classList.contains('hidden') }
  open(state: FreightState, returnToPlanner = false) {
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
    this.render(state)
    this.panel.querySelector<HTMLButtonElement>('#freight-close')?.focus()
  }
  close() {
    if (!this.isOpen) return
    this.panel.classList.add('hidden')
    for (const [sibling, wasInert] of this.priorInert) sibling.inert = wasInert
    this.priorInert.clear()
    const returnsToPlanner = this.returnToPlanner
    this.returnToPlanner = false
    this.handlers.close(returnsToPlanner)
    if (!returnsToPlanner) this.opener?.focus()
  }
  render(state: FreightState) {
    if (!this.isOpen) return
    this.materials.textContent = state.materials.toLocaleString('en-GB')
    const tier = FREIGHT_TIERS[state.tier]
    this.panel.querySelector('#freight-payload')!.textContent = `${tier.name}: ship ${tier.cargo} alloy units in ${tier.seconds} seconds.`
    const active = state.shipment
    const fraction = active ? Math.max(0, Math.min(1, 1 - active.secondsRemaining / active.totalSeconds)) : 0
    this.train.setAttribute('transform', `translate(${Math.round(137 + fraction * 273)} 133)`)
    this.progress.style.width = `${fraction * 100}%`
    this.status.textContent = active ? `SHUTTLE IN TRANSIT · ${active.cargo} UNITS` : 'FREIGHT LINE READY'
    this.inTransit.textContent = active ? `${Math.ceil(active.secondsRemaining)} S LEFT` : 'IDLE'
    this.dispatchButton.disabled = !!active || state.materials >= MATERIAL_LIMIT
    this.dispatchButton.textContent = active ? 'SHUTTLE IN TRANSIT' : state.materials >= MATERIAL_LIMIT ? 'STORAGE FULL' : `DISPATCH ${tier.cargo} ALLOY ↗`
    this.stats.textContent = `${state.shipments} deliveries · ${state.delivered.toLocaleString('en-GB')} total alloy received · ${state.purchasedRoutes.length} lunar layouts built`
    const quote = quoteUpgrade(state)
    const siding = this.panel.querySelector<SVGPathElement>('#freight-siding')!
    siding.style.opacity = state.tier >= 1 ? '1' : '.17'
    siding.setAttribute('stroke-dasharray', state.tier === 2 ? 'none' : '8 7')
    if (quote.nextTier === null) {
      this.upgradeText.textContent = 'All available freight-yard upgrades constructed. Your service is operating at maximum capacity.'
      this.upgradeButton.textContent = 'FULLY UPGRADED'
    } else {
      const next = FREIGHT_TIERS[quote.nextTier]
      const prereq = quote.deliveriesNeeded ? ` · ${quote.deliveriesNeeded} MORE DELIVER${quote.deliveriesNeeded === 1 ? 'Y' : 'IES'} NEEDED` : ''
      this.upgradeText.textContent = `${next.name}: ${next.cargo} alloy per ${next.seconds}-second trip. Requires ${next.minShipments} completed deliveries.`
      this.upgradeButton.textContent = `BUILD ${next.name.toUpperCase()} · ${quote.cost} ALLOY${prereq}`
    }
    this.upgradeButton.disabled = !quote.available
  }
  dispose() {
    for (const [sibling, wasInert] of this.priorInert) sibling.inert = wasInert
    this.priorInert.clear()
    this.panel.remove()
  }
}
