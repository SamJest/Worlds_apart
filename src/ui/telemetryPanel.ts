/** Moveable, collapsible mission panel. Positioning is local to the device. */
export interface PanelPosition { x: number; y: number }
interface PanelState { x: number | null; y: number | null; collapsed: boolean }
const STORAGE_KEY = 'worlds-apart.telemetry-panel.v1'

export function clampPanelPosition(x: number, y: number, width: number, height: number, viewportWidth: number, viewportHeight: number): PanelPosition {
  return { x: Math.max(0, Math.min(x, Math.max(0, viewportWidth - width))), y: Math.max(0, Math.min(y, Math.max(0, viewportHeight - height))) }
}

export function attachTelemetryPanel(root: HTMLElement): () => void {
  const panel = root.querySelector<HTMLElement>('.left-panel')!
  const grip = root.querySelector<HTMLElement>('#telemetry-handle')!
  const toggle = root.querySelector<HTMLButtonElement>('#telemetry-toggle')!
  const defaultCollapsed = window.matchMedia('(max-width: 780px)').matches
  let state: PanelState = { x: null, y: null, collapsed: defaultCollapsed }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Partial<PanelState> | null
    if (saved && typeof saved.collapsed === 'boolean') state.collapsed = saved.collapsed
    if (saved && typeof saved.x === 'number' && Number.isFinite(saved.x) && typeof saved.y === 'number' && Number.isFinite(saved.y)) {
      state.x = saved.x
      state.y = saved.y
    }
  } catch { /* Storage is optional in private browsing or restricted contexts. */ }

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* keep working without storage */ }
  }
  const syncCollapsed = () => {
    panel.classList.toggle('is-collapsed', state.collapsed)
    toggle.setAttribute('aria-expanded', String(!state.collapsed))
    toggle.setAttribute('aria-label', state.collapsed ? 'Expand mission telemetry' : 'Collapse mission telemetry')
    toggle.textContent = state.collapsed ? '+' : '−'
  }
  const position = (x: number, y: number) => {
    const rect = panel.getBoundingClientRect()
    const next = clampPanelPosition(x, y, rect.width, rect.height, window.innerWidth, window.innerHeight)
    state.x = next.x
    state.y = next.y
    panel.style.left = `${next.x}px`
    panel.style.top = `${next.y}px`
    panel.style.bottom = 'auto'
  }
  const clampExisting = () => {
    if (state.x !== null && state.y !== null) position(state.x, state.y)
  }
  syncCollapsed()
  clampExisting()
  toggle.addEventListener('click', () => {
    state.collapsed = !state.collapsed
    syncCollapsed()
    clampExisting()
    save()
  })

  let drag: { id: number; offsetX: number; offsetY: number } | null = null
  const down = (event: PointerEvent) => {
    if (drag !== null) return
    const rect = panel.getBoundingClientRect()
    drag = { id: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top }
    grip.setPointerCapture(event.pointerId)
    event.preventDefault()
  }
  const move = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return
    position(event.clientX - drag.offsetX, event.clientY - drag.offsetY)
  }
  const up = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return
    drag = null
    save()
  }
  const keyboard = (event: KeyboardEvent) => {
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    }
    const step = directions[event.key]
    if (!step) return
    event.preventDefault()
    const rect = panel.getBoundingClientRect()
    position(rect.left + step[0] * (event.shiftKey ? 40 : 15), rect.top + step[1] * (event.shiftKey ? 40 : 15))
    save()
  }
  const resize = () => clampExisting()
  grip.addEventListener('pointerdown', down)
  grip.addEventListener('pointermove', move)
  grip.addEventListener('pointerup', up)
  grip.addEventListener('pointercancel', up)
  grip.addEventListener('lostpointercapture', up)
  grip.addEventListener('keydown', keyboard)
  window.addEventListener('resize', resize)
  return () => {
    grip.removeEventListener('pointerdown', down)
    grip.removeEventListener('pointermove', move)
    grip.removeEventListener('pointerup', up)
    grip.removeEventListener('pointercancel', up)
    grip.removeEventListener('lostpointercapture', up)
    grip.removeEventListener('keydown', keyboard)
    window.removeEventListener('resize', resize)
  }
}
