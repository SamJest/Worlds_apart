import { createEarthMoonRoute, MOON_DISTANCE } from '../simulation/astronomy.ts'
import { defaultRoutePlan, evaluateIntercept, type RouteDurationDays, type RoutePlan, ROUTE_DURATION_OPTIONS } from '../simulation/routePlanner.ts'

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
  private plan: RoutePlan = { ...defaultRoutePlan }
  private dragging = false
  private readonly priorInert = new Map<HTMLElement, boolean>()

  constructor(root: HTMLElement, private readonly arrivalAltitudeKm: number, private readonly onConfirm: (days: RouteDurationDays) => void) {
    const panel = document.createElement('section')
    panel.className = 'route-planner hidden'
    panel.id = 'route-planner'
    panel.setAttribute('aria-labelledby', 'route-planner-heading')
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-modal', 'true')
    panel.innerHTML = `<div class="route-planner-inner">
      <div class="planner-heading"><div><span class="eyebrow">FLIGHT OPERATIONS / PRE-LAUNCH</span><h1 id="route-planner-heading">Plot the lunar intercept</h1><p>The Moon moves while you travel. Align the adaptive railway with its <strong>future</strong> position, not where it is now.</p></div><button type="button" id="planner-back" aria-label="Back to introduction">← BACK</button></div>
      <div class="planner-layout"><div class="orbit-panel"><div class="orbit-caption"><span>ORBITAL MAP · TOP DOWN</span><span class="orbit-caption-secondary">SCHEMATIC · MARKERS ENLARGED</span></div>
      <svg id="planner-visual" viewBox="-215 -195 460 410" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Earth at centre, lunar orbit, current Moon, calculated intercept, proposed track and adjustable aim marker">
        <defs><filter id="target-glow"><feGaussianBlur stdDeviation="3.5" /></filter></defs>
        <circle class="orbit-ring" cx="0" cy="0" r="158" fill="none" stroke-dasharray="3 8"/>
        <path id="planner-sweep" class="orbit-sweep" fill="none"/>
        <path id="planner-rail" class="orbit-rail" fill="none"/>
        <line id="planner-guide" class="orbit-guide" x1="0" y1="0" x2="158" y2="0" />
        <circle r="10" class="orbit-earth-halo"/><circle r="5" fill="#59bdec"/><text x="-12" y="22" class="orbit-label" text-anchor="end">EARTH</text>
        <circle cx="158" cy="0" r="5" fill="#cad2dd"/><text x="145" y="17" class="orbit-label" text-anchor="end">CURRENT MOON</text>
        <circle id="planner-future" r="8" class="orbit-future"/><circle id="planner-aim-glow" r="13" class="orbit-aim-glow" filter="url(#target-glow)"/><circle id="planner-aim" r="5.5" class="orbit-aim"/>
        <text id="planner-target-label" class="orbit-label orbit-label-active">PREDICTED ARRIVAL</text>
      </svg><div class="orbit-legend"><span><i class="key-track"></i> Proposed track</span><span><i class="key-intercept"></i> Moon at arrival</span><span><i class="key-aim"></i> Your target</span></div></div>
      <div class="planner-controls"><div class="planner-control-group"><h2>01 / Travel duration</h2><p>Choose how far the Moon moves before you arrive.</p><div class="duration-choices" role="group" aria-label="Simulated travel days">${ROUTE_DURATION_OPTIONS.map(days => `<button type="button" data-plan-days="${days}" aria-pressed="${days === 4}">${days} DAYS</button>`).join('')}</div></div>
        <div class="planner-control-group"><h2>02 / Align the target</h2><p>Drag the orange orbit marker or fine-tune the slider.</p><label class="planner-range-label" for="planner-offset">TARGET OFFSET <strong id="planner-angle">0.0°</strong></label><input id="planner-offset" type="range" min="-12" max="12" value="0" step="0.1" aria-label="Target offset in degrees"/><button id="planner-snap" type="button">✦ SNAP TO RENDEZVOUS</button></div>
        <div class="intercept-status" role="status" aria-live="polite"><strong id="planner-status">INTERCEPT LOCKED</strong><span id="planner-miss">Calculated miss: 0 km</span></div>
        <div class="planner-stat"><span>SIMULATED TRAVEL</span><strong id="planner-duration">4 DAYS</strong></div><div class="planner-stat"><span>APPROXIMATE RAIL LENGTH</span><strong id="planner-distance">—</strong></div>
        <button class="planner-launch" type="button" id="planner-launch">CONFIRM ROUTE & DEPART ↗</button><small class="planner-science">Orbital positions use mean circular motion. Rail propulsion and duration are science fiction, not a real transfer trajectory.</small>
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
      if (!evaluateIntercept(this.plan).canLaunch) return
      this.close(false)
      this.onConfirm(this.plan.days)
    })
    required<HTMLButtonElement>('#planner-back').addEventListener('click', () => this.close())
    this.visual.addEventListener('pointerdown', event => {
      if (!this.updateAimFromPointer(event)) return
      this.dragging = true
      this.visual.setPointerCapture(event.pointerId)
    })
    this.visual.addEventListener('pointermove', event => { if (this.dragging) this.updateAimFromPointer(event) })
    this.visual.addEventListener('pointerup', () => { this.dragging = false })
    this.visual.addEventListener('pointercancel', () => { this.dragging = false })
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
    this.render()
    ;(this.durationButtons.find(button => Number(button.dataset.planDays) === this.plan.days) ?? this.durationButtons[1]).focus()
  }
  close(restoreFocus = true) {
    this.dragging = false
    this.panel.classList.add('hidden')
    for (const [element, wasInert] of this.priorInert) element.inert = wasInert
    this.priorInert.clear()
    if (restoreFocus) this.panel.parentElement?.querySelector<HTMLButtonElement>('#begin')?.focus()
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
    const route = createEarthMoonRoute(this.plan.days, this.arrivalAltitudeKm)
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
    this.confirm.disabled = !result.canLaunch
    this.miss.textContent = result.canLaunch ? 'Automatic fine correction available · ready for departure' : `Projected centreline miss: ${Math.round(result.missDistanceKm).toLocaleString('en-GB')} km · ${result.differenceDegrees.toFixed(1)}° off target`
    this.duration.textContent = `${this.plan.days} DAYS · ${result.predictedDegrees.toFixed(1)}° LUNAR SWEEP`
    this.distance.textContent = `${Math.round(route.lengthKm).toLocaleString('en-GB')} KM`
    this.selectedAngle.textContent = `${this.plan.offsetDegrees > 0 ? '+' : ''}${this.plan.offsetDegrees.toFixed(1)}°`
    this.target.value = String(this.plan.offsetDegrees)
    this.durationButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.planDays) === this.plan.days)))
  }
}
