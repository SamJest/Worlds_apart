import { createEarthMoonRoute, MOON_DISTANCE } from '../simulation/astronomy.ts'
import { defaultRoutePlan, evaluateIntercept, type RouteDurationDays, type RoutePlan, ROUTE_DURATION_OPTIONS } from '../simulation/routePlanner.ts'
import { addGuidewayNode, applyGuidewayPreset, MAX_GUIDEWAY_NODES, readGuidewayDesign, removeGuidewayNode, saveGuidewayDesign, updateGuidewayNode, type GuidewayDesign, type RidePreset } from '../simulation/constructionPlan.ts'
import { evaluateGuideway, guidewayAnchor } from '../simulation/constructionRoute.ts'
import { ConstructionPreview } from '../scene/constructionPreview.ts'
import type { RouteCost } from '../simulation/freightEconomy.ts'

export class RoutePlannerUi {
  private readonly panel: HTMLElement
  private readonly visual: SVGSVGElement
  private readonly target: HTMLInputElement
  private readonly confirm: HTMLButtonElement
  private readonly snap: HTMLButtonElement
  private readonly assessment: HTMLElement
  private readonly duration: HTMLElement
  private readonly distance: HTMLElement
  private readonly miss: HTMLElement
  private readonly selectedAngle: HTMLElement
  private readonly durationButtons: HTMLButtonElement[]
  private readonly constructionNodes: SVGGElement
  private readonly constructionList: HTMLElement
  private readonly constructionLateral: HTMLInputElement
  private readonly constructionVertical: HTMLInputElement
  private readonly constructionMessage: HTMLElement
  private readonly constructionMaterial: HTMLElement
  private readonly constructionSave: HTMLElement
  private readonly balance: HTMLElement
  private readonly freightAction: HTMLButtonElement

  private plan: RoutePlan = { ...defaultRoutePlan }
  private dragging = false
  private draggingNodeId: number | null = null
  private design: GuidewayDesign = readGuidewayDesign()
  private activePreset: RidePreset | null = this.design.profile && this.design.profile !== 'classic'
    ? this.design.profile : (this.design.nodes.length === 0 ? 'direct' : null)
  private selectedNodeId: number | null = this.design.nodes[0]?.id ?? null
  private preview: ConstructionPreview | undefined
  private readonly priorInert = new Map<HTMLElement, boolean>()

  constructor(root: HTMLElement, private readonly arrivalAltitudeKm: number, private readonly onConfirm: (days: RouteDurationDays, design: GuidewayDesign) => boolean,
    private readonly economy: { quote(days: RouteDurationDays, design: GuidewayDesign, units: number): RouteCost; openFreight(): void }) {
    const panel = document.createElement('section')
    panel.className = 'route-planner hidden'
    panel.id = 'route-planner'
    panel.setAttribute('aria-labelledby', 'route-planner-heading')
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-modal', 'true')
    panel.innerHTML = `<div class="route-planner-inner">
      <div class="planner-heading"><div><span class="eyebrow">CREATIVE RIDE BUILDER · EVERYTHING UNLOCKED</span><h1 id="route-planner-heading">Build an impossible space coaster</h1><p>Pick a crazy track and ride it. Drag the 3D preview to explore your design. Tweak the track only if you want to.</p></div><button type="button" id="planner-back" aria-label="Back to introduction">← BACK</button></div>
      <div class="planner-layout"><div class="orbit-panel"><div class="orbit-caption"><span>ORBITAL MAP · TOP DOWN</span><span class="orbit-caption-secondary">SCHEMATIC · MARKERS ENLARGED</span></div>
      <svg id="planner-visual" viewBox="-215 -195 460 410" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Earth at centre, lunar orbit, current Moon, calculated intercept, proposed track and adjustable aim marker">
        <defs><filter id="target-glow"><feGaussianBlur stdDeviation="3.5" /></filter></defs>
        <circle class="orbit-ring" cx="0" cy="0" r="158" fill="none" stroke-dasharray="3 8"/>
        <path id="planner-sweep" class="orbit-sweep" fill="none"/>
        <path id="planner-rail" class="orbit-rail" fill="none"/><g id="construction-nodes"></g>
        <line id="planner-guide" class="orbit-guide" x1="0" y1="0" x2="158" y2="0" />
        <circle r="10" class="orbit-earth-halo"/><circle r="5" fill="#59bdec"/><text x="-12" y="22" class="orbit-label" text-anchor="end">EARTH</text>
        <circle cx="158" cy="0" r="5" fill="#cad2dd"/><text x="145" y="17" class="orbit-label" text-anchor="end">CURRENT MOON</text>
        <circle id="planner-future" r="8" class="orbit-future"/><circle id="planner-aim-glow" r="13" class="orbit-aim-glow" filter="url(#target-glow)"/><circle id="planner-aim" r="5.5" class="orbit-aim"/>
        <text id="planner-target-label" class="orbit-label orbit-label-active">PREDICTED ARRIVAL</text>
      </svg><div class="construction-preview-caption">LIVE 3D BLUEPRINT · DRAG TO ROTATE · SCROLL TO ZOOM · PLANETS ENLARGED</div><div id="construction-viewport" class="construction-viewport" aria-label="Rotatable three-dimensional guideway blueprint"></div><div class="orbit-legend"><span><i class="key-track"></i> Proposed track</span><span><i class="key-intercept"></i> Moon at arrival</span><span><i class="key-aim"></i> Your target</span></div></div>
      <div class="planner-controls"><div class="planner-control-group"><h2>01 / Travel duration</h2><p>Choose how far the Moon moves before you arrive.</p><div class="duration-choices" role="group" aria-label="Simulated travel days">${ROUTE_DURATION_OPTIONS.map(days => `<button type="button" data-plan-days="${days}" aria-pressed="${days === 4}">${days} DAYS</button>`).join('')}</div></div>
        <div class="planner-control-group optional-intercept"><h2>OPTIONAL ORBITAL AIMING</h2><p>Drag the orange orbit marker or fine-tune the slider.</p><label class="planner-range-label" for="planner-offset">TARGET OFFSET <strong id="planner-angle">0.0°</strong></label><input id="planner-offset" type="range" min="-12" max="12" value="0" step="0.1" aria-label="Target offset in degrees"/><button id="planner-snap" type="button">✦ SNAP TO RENDEZVOUS</button></div>
        <div class="planner-control-group construction-controls"><h2>CHOOSE YOUR TRACK</h2><p>Every style changes the 3D railway the carriage rides.</p>
          <div class="construction-presets" role="group" aria-label="Guideway templates"><button type="button" data-construction-preset="direct">DIRECT</button><button type="button" data-construction-preset="arc">WIDE ARC</button><button type="button" data-construction-preset="high">HIGH SCENIC</button><button type="button" data-construction-preset="corkscrew">CORKSCREW</button><button type="button" data-construction-preset="wave">ZERO-G WAVES</button><button type="button" data-construction-preset="slalom">COSMIC SLALOM</button><button type="button" data-construction-preset="dive">DEEP-SPACE DIVE</button></div>
          <details class="builder-advanced"><summary>FINE-TUNE THE TRACK</summary><div class="construction-node-actions"><strong>CONSTRUCTION ANCHORS</strong><button id="construction-add" type="button">+ ADD ANCHOR</button></div>
          <div id="construction-node-list" class="construction-node-list" role="group" aria-label="Select or remove a guideway anchor"></div>
          <label class="planner-range-label" for="construction-lateral">LATERAL OFFSET <strong id="construction-lateral-value">0 KM</strong></label><input id="construction-lateral" type="range" min="-85000" max="85000" step="1000" value="0"/>
          <label class="planner-range-label" for="construction-vertical">VERTICAL OFFSET <strong id="construction-vertical-value">0 KM</strong></label><input id="construction-vertical" type="range" min="-60000" max="60000" step="1000" value="0"/></details>
          <div class="construction-economy"><span>COASTER LENGTH</span><strong id="construction-material">—</strong></div><div id="planner-wallet" class="planner-wallet" role="status" aria-live="polite">500 alloy available</div><button id="planner-freight" type="button" class="planner-freight">OPEN FREIGHT YARD · EARN ALLOY ↗</button><p id="construction-status" class="construction-status" role="status" aria-live="polite">Guideway ready</p><p id="construction-saved" class="construction-saved">Edits save locally on departure.</p>
        </div>
        <div class="intercept-status" role="status" aria-live="polite"><strong id="planner-status">INTERCEPT LOCKED</strong><span id="planner-miss">Calculated miss: 0 km</span></div>
        <div class="planner-stat"><span>SIMULATED TRAVEL</span><strong id="planner-duration">4 DAYS</strong></div><div class="planner-stat"><span>APPROXIMATE RAIL LENGTH</span><strong id="planner-distance">—</strong></div>
        <button class="planner-launch" type="button" id="planner-launch">RIDE THIS COASTER</button><small class="planner-science">Orbital positions use mean circular motion. Rail propulsion and duration are science fiction, not a real transfer trajectory.</small>
      </div></div></div>`
    root.append(panel)
    this.panel = panel
    const required = <T extends Element>(selector: string) => {
      const element = panel.querySelector<T>(selector)
      if (!element) throw new Error(`Missing route planner element: ${selector}`)
      return element
    }
    this.visual = required<SVGSVGElement>('#planner-visual')
    this.target = required<HTMLInputElement>('#planner-offset')
    this.confirm = required<HTMLButtonElement>('#planner-launch')
    this.snap = required<HTMLButtonElement>('#planner-snap')
    this.assessment = required('#planner-status')
    this.duration = required('#planner-duration')
    this.distance = required('#planner-distance')
    this.miss = required('#planner-miss')
    this.selectedAngle = required('#planner-angle')
    this.durationButtons = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-plan-days]'))
    this.constructionNodes = required<SVGGElement>('#construction-nodes')
    this.constructionList = required<HTMLElement>('#construction-node-list')
    this.constructionLateral = required<HTMLInputElement>('#construction-lateral')
    this.constructionVertical = required<HTMLInputElement>('#construction-vertical')
    this.constructionMessage = required('#construction-status')
    this.constructionMaterial = required('#construction-material')
    this.constructionSave = required('#construction-saved')
    this.balance = required('#planner-wallet')
    this.freightAction = required<HTMLButtonElement>('#planner-freight')
    this.freightAction.addEventListener('click', () => { this.close(false); this.economy.openFreight() })
    required<HTMLButtonElement>('#construction-add').addEventListener('click', () => {
      this.design = addGuidewayNode(this.design)
      this.activePreset = null
      this.selectedNodeId = this.design.nodes[this.design.nodes.length - 1]?.id ?? null
      this.render()
    })
    panel.querySelectorAll<HTMLButtonElement>('[data-construction-preset]').forEach(button => button.addEventListener('click', () => {
      this.activePreset = button.dataset.constructionPreset as RidePreset
      this.design = applyGuidewayPreset(this.activePreset)
      this.selectedNodeId = this.design.nodes[0]?.id ?? null
      this.render()
    }))
    this.constructionList.addEventListener('click', event => {
      const target = (event.target as Element).closest<HTMLButtonElement>('button')
      if (!target) return
      if (target.dataset.removeNode) {
        const id = Number(target.dataset.removeNode)
        this.design = removeGuidewayNode(this.design, id)
        this.activePreset = null
        this.selectedNodeId = this.design.nodes[0]?.id ?? null
      } else if (target.dataset.selectNode) this.selectedNodeId = Number(target.dataset.selectNode)
      this.render()
    })
    const updateSelected = () => {
      if (this.selectedNodeId === null) return
      this.design = updateGuidewayNode(this.design, this.selectedNodeId, {
        lateralKm: Number(this.constructionLateral.value), verticalKm: Number(this.constructionVertical.value),
      })
      this.activePreset = null
      this.render()
    }
    this.constructionLateral.addEventListener('input', updateSelected)
    this.constructionVertical.addEventListener('input', updateSelected)
    this.durationButtons.forEach(button => button.addEventListener('click', () => {
      this.plan = { ...this.plan, days: Number(button.dataset.planDays) as RouteDurationDays }
      this.render()
    }))
    this.target.addEventListener('input', () => {
      this.plan = { ...this.plan, offsetDegrees: Number(this.target.value) }
      this.render()
    })
    this.snap.addEventListener('click', () => { this.plan = { ...this.plan, offsetDegrees: 0 }; this.render(); this.confirm.focus() })
    this.confirm.addEventListener('click', () => {
      this.plan = { ...this.plan, offsetDegrees: 0 } // Destination is automatically targeted.
      const result = evaluateGuideway(this.plan.days, this.arrivalAltitudeKm, this.design)
      if (!result.valid) { this.render(); return }
      if (!this.onConfirm(this.plan.days, this.design)) { this.render(); return }
      this.constructionSave.textContent = saveGuidewayDesign(this.design) ? 'Blueprint saved to this browser.' : 'Local saving is disabled in this browser.'
      this.close(false)
    })
    required<HTMLButtonElement>('#planner-back').addEventListener('click', () => this.close())
    this.visual.addEventListener('pointerdown', event => {
      const target = event.target as Element
      const nodeElement = target.closest('[data-construction-node]')
      if (nodeElement) {
        this.selectedNodeId = Number(nodeElement.getAttribute('data-construction-node'))
        this.draggingNodeId = this.selectedNodeId
        this.updateNodeFromPointer(event)
        this.visual.setPointerCapture(event.pointerId)
        return
      }
      if (!this.updateAimFromPointer(event)) return
      this.dragging = true
      this.visual.setPointerCapture(event.pointerId)
    })
    this.visual.addEventListener('pointermove', event => { if (this.draggingNodeId !== null) this.updateNodeFromPointer(event); else if (this.dragging) this.updateAimFromPointer(event) })
    this.visual.addEventListener('pointerup', () => { this.dragging = false; this.draggingNodeId = null })
    this.visual.addEventListener('pointercancel', () => { this.dragging = false; this.draggingNodeId = null })
    this.panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); this.close() } })
    this.render()
  }

  get isOpen() { return !this.panel.classList.contains('hidden') }
  open() {
    if (this.isOpen) return
    this.priorInert.clear()
    for (const sibling of Array.from(this.panel.parentElement?.children ?? [])) {
      if (sibling === this.panel || !(sibling instanceof HTMLElement)) continue
      this.priorInert.set(sibling, sibling.inert)
      sibling.inert = true
    }
    this.panel.classList.remove('hidden')
    if (!this.preview) {
      try { this.preview = new ConstructionPreview(this.panel.querySelector<HTMLElement>('#construction-viewport')!) }
      catch { this.panel.querySelector<HTMLElement>('#construction-viewport')!.textContent = '3D preview unavailable. Map and construction controls remain usable.' }
    }
    this.render()
    ;(this.durationButtons.find(button => Number(button.dataset.planDays) === this.plan.days) ?? this.durationButtons[1]).focus()
  }
  close(restoreFocus = true) {
    this.dragging = false
    this.draggingNodeId = null
    this.panel.classList.add('hidden')
    for (const [element, wasInert] of this.priorInert) element.inert = wasInert
    this.priorInert.clear()
    if (restoreFocus) this.panel.parentElement?.querySelector<HTMLButtonElement>('#begin')?.focus()
  }

  dispose() { this.preview?.dispose(); this.preview = undefined }

  private updateNodeFromPointer(event: PointerEvent): void {
    const node = this.design.nodes.find(item => item.id === this.draggingNodeId)
    if (!node) return
    const matrix = this.visual.getScreenCTM()
    if (!matrix) return
    const source = this.visual.createSVGPoint()
    source.x = event.clientX; source.y = event.clientY
    const local = source.matrixTransform(matrix.inverse())
    const reference = createEarthMoonRoute(this.plan.days, this.arrivalAltitudeKm)
    const centre = reference.curve.getPoint(node.fraction)
    const lateral = guidewayAnchor(reference, node.fraction, 1000, 0).sub(centre)
    const cx = centre.x * 158 / MOON_DISTANCE, cy = -centre.z * 158 / MOON_DISTANCE
    const dx = local.x - cx, dy = local.y - cy
    const sideX = lateral.x * 158 / MOON_DISTANCE, sideY = -lateral.z * 158 / MOON_DISTANCE
    const offset = (dx * sideX + dy * sideY) / Math.max(1e-6, sideX * sideX + sideY * sideY) * 1000
    this.design = updateGuidewayNode(this.design, node.id, { lateralKm: Math.round(offset / 1000) * 1000 })
    this.activePreset = null
    this.render()
  }

  /** Map pointer coordinates into the orbit diagram; the angle, not click distance, controls aim. */
  private updateAimFromPointer(event: PointerEvent): boolean {
    const matrix = this.visual.getScreenCTM()
    if (!matrix) return false
    const point = this.visual.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const local = point.matrixTransform(matrix.inverse())
    if (Math.hypot(local.x, local.y) < 60) return false
    const predicted = evaluateIntercept(this.plan).predictedDegrees
    const angle = -Math.atan2(local.y, local.x) * 180 / Math.PI
    const offset = Math.max(-12, Math.min(12, ((angle - predicted + 540) % 360) - 180))
    this.plan = { ...this.plan, offsetDegrees: Math.round(offset * 10) / 10 }
    this.render()
    return true
  }

  private render() {
    const result = evaluateIntercept(this.plan)
    const construction = evaluateGuideway(this.plan.days, this.arrivalAltitudeKm, this.design)
    const route = construction.route
    const scale = 158 / MOON_DISTANCE
    const projected = route.curve.getPoints(72).map((point: { x: number, z: number }, index: number) => `${index === 0 ? 'M' : 'L'}${(point.x * scale).toFixed(2)},${(-point.z * scale).toFixed(2)}`).join(' ')
    const setPath = (id: string, value: string) => this.visual.querySelector<SVGPathElement>(id)?.setAttribute('d', value)
    const setPoint = (id: string, x: number, y: number) => {
      const circle = this.visual.querySelector<SVGCircleElement>(id)
      circle?.setAttribute('cx', x.toFixed(2))
      circle?.setAttribute('cy', y.toFixed(2))
    }
    const angle = result.predictedDegrees * Math.PI / 180
    const targetAngle = result.targetDegrees * Math.PI / 180
    const futureX = 158 * Math.cos(angle), futureY = -158 * Math.sin(angle)
    const aimedX = 158 * Math.cos(targetAngle), aimedY = -158 * Math.sin(targetAngle)
    setPath('#planner-rail', projected)
    const scaleNode = 158 / MOON_DISTANCE
    this.constructionNodes.replaceChildren()
    for (const [index, anchor] of construction.nodes.entries()) {
      const node = this.design.nodes[index]
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', (anchor.x * scaleNode).toFixed(2))
      circle.setAttribute('cy', (-anchor.z * scaleNode).toFixed(2))
      circle.setAttribute('r', this.selectedNodeId === node.id ? '9' : '7')
      circle.setAttribute('class', this.selectedNodeId === node.id ? 'construction-marker selected' : 'construction-marker')
      circle.setAttribute('data-construction-node', String(node.id))
      this.constructionNodes.append(circle)
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('x', (anchor.x * scaleNode).toFixed(2))
      label.setAttribute('y', (-anchor.z * scaleNode + 3).toFixed(2))
      label.setAttribute('class', 'construction-marker-label')
      label.textContent = String(index + 1)
      label.setAttribute('data-construction-node', String(node.id))
      this.constructionNodes.append(label)
    }
    this.preview?.setRoute(route, construction.nodes)
    this.constructionList.replaceChildren()
    for (const [index, node] of this.design.nodes.entries()) {
      const wrapper = document.createElement('div')
      wrapper.className = 'construction-node-row'
      const select = document.createElement('button')
      select.type = 'button'
      select.dataset.selectNode = String(node.id)
      select.setAttribute('aria-pressed', String(node.id === this.selectedNodeId))
      select.textContent = `ANCHOR ${index + 1} · ${Math.round(node.fraction * 100)}%`
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.dataset.removeNode = String(node.id)
      remove.setAttribute('aria-label', `Remove anchor ${index + 1}`)
      remove.textContent = 'REMOVE'
      wrapper.append(select, remove)
      this.constructionList.append(wrapper)
    }
    const selected = this.design.nodes.find(node => node.id === this.selectedNodeId)
    this.constructionLateral.disabled = !selected
    this.constructionVertical.disabled = !selected
    this.constructionLateral.value = String(selected?.lateralKm ?? 0)
    this.constructionVertical.value = String(selected?.verticalKm ?? 0)
    this.panel.querySelector('#construction-lateral-value')!.textContent = `${Math.round((selected?.lateralKm ?? 0) / 1000)}K KM`
    this.panel.querySelector('#construction-vertical-value')!.textContent = `${Math.round((selected?.verticalKm ?? 0) / 1000)}K KM`
    this.panel.querySelector<HTMLButtonElement>('#construction-add')!.disabled = this.design.nodes.length >= MAX_GUIDEWAY_NODES
    this.constructionMaterial.textContent = `${Math.round(construction.route.lengthKm).toLocaleString('en-GB')} KM`
    this.balance.dataset.affordable = 'true'
    this.balance.textContent = 'FREE TO BUILD · NO MATERIALS REQUIRED'
    this.constructionMessage.textContent = construction.valid
      ? `GUIDEWAY VALID · ${construction.extraLengthKm >= 0 ? '+' : ''}${construction.extraLengthKm.toLocaleString('en-GB')} km vs direct · ${this.design.nodes.length} anchors`
      : `CANNOT CONSTRUCT · ${construction.warnings.join(' ')}`
    this.constructionMessage.dataset.valid = String(construction.valid)
    setPath('#planner-sweep', `M 158 0 A 158 158 0 0 0 ${futureX.toFixed(2)} ${futureY.toFixed(2)}`)
    setPoint('#planner-future', futureX, futureY)
    setPoint('#planner-aim', aimedX, aimedY)
    setPoint('#planner-aim-glow', aimedX, aimedY)
    const label = this.visual.querySelector<SVGTextElement>('#planner-target-label')
    label?.setAttribute('x', (futureX + (futureX >= 0 ? 12 : -12)).toFixed(2))
    label?.setAttribute('y', (futureY - 15).toFixed(2))
    label?.setAttribute('text-anchor', futureX >= 0 ? 'start' : 'end')
    const status = result.assessment === 'locked' ? 'INTERCEPT LOCKED' : result.assessment === 'correction' ? 'CORRECTION NEEDED' : 'TARGET WILL MISS THE MOON'
    this.assessment.textContent = status
    this.panel.dataset.intercept = result.assessment
    this.confirm.disabled = !construction.valid
    this.miss.textContent = result.canLaunch ? 'Automatic fine correction available · ready for departure' : `Projected centreline miss: ${Math.round(result.missDistanceKm).toLocaleString('en-GB')} km · ${result.differenceDegrees.toFixed(1)}° off target`
    this.duration.textContent = `${this.plan.days} DAYS · ${result.predictedDegrees.toFixed(1)}° LUNAR SWEEP`
    this.distance.textContent = `${Math.round(route.lengthKm).toLocaleString('en-GB')} KM · PLAYER BUILT`
    this.selectedAngle.textContent = `${this.plan.offsetDegrees > 0 ? '+' : ''}${this.plan.offsetDegrees.toFixed(1)}°`
    this.target.value = String(this.plan.offsetDegrees)
    this.durationButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.planDays) === this.plan.days)))
    this.panel.querySelectorAll<HTMLButtonElement>('[data-construction-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.constructionPreset === this.activePreset)))
  }
}
