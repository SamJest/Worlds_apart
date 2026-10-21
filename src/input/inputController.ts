export interface InputHandlers {
  canInteract(): boolean
  togglePlay(): void
  toggleCamera(): void
  turnAround(): void
  seekBy(delta: number): void
  look(deltaX: number, deltaY: number): void
  zoom(direction: number): void
  showOptions(): void
  toggleMinimalHud(): void
}

export class InputController {
  private activePointerId: number | null = null
  private lastX = 0
  private lastY = 0

  constructor(private readonly canvas: HTMLCanvasElement, private readonly handlers: InputHandlers) {
    canvas.addEventListener('pointerdown', this.pointerDown)
    canvas.addEventListener('pointerup', this.pointerUp)
    canvas.addEventListener('pointercancel', this.pointerUp)
    canvas.addEventListener('lostpointercapture', this.pointerUp)
    canvas.addEventListener('pointermove', this.pointerMove)
    canvas.addEventListener('wheel', this.wheel, { passive: true })
    window.addEventListener('keydown', this.keyDown)
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.pointerDown)
    this.canvas.removeEventListener('pointerup', this.pointerUp)
    this.canvas.removeEventListener('pointercancel', this.pointerUp)
    this.canvas.removeEventListener('lostpointercapture', this.pointerUp)
    this.canvas.removeEventListener('pointermove', this.pointerMove)
    this.canvas.removeEventListener('wheel', this.wheel)
    window.removeEventListener('keydown', this.keyDown)
  }

  private readonly pointerDown = (event: PointerEvent) => {
    if (this.activePointerId !== null) return
    this.activePointerId = event.pointerId
    this.lastX = event.clientX
    this.lastY = event.clientY
    this.canvas.setPointerCapture(event.pointerId)
  }

  private readonly pointerUp = (event: PointerEvent) => { if (event.pointerId === this.activePointerId) this.activePointerId = null }

  private readonly pointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.activePointerId) return
    this.handlers.look(event.clientX - this.lastX, event.clientY - this.lastY)
    this.lastX = event.clientX
    this.lastY = event.clientY
  }

  private readonly wheel = (event: WheelEvent) => this.handlers.zoom(event.deltaY)

  private readonly keyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return
    const target = event.target
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
    if (document.querySelector('dialog[open]') || !this.handlers.canInteract()) return
    if (event.key === '?') { this.handlers.showOptions(); return }
    if (event.key.toLowerCase() === 'h') { this.handlers.toggleMinimalHud(); return }
    if (event.code === 'Space') {
      event.preventDefault()
      this.handlers.togglePlay()
    }
    if (event.key.toLowerCase() === 'c') this.handlers.toggleCamera()
    if (event.key.toLowerCase() === 'b') this.handlers.turnAround()
    if (event.key === 'ArrowRight') this.handlers.seekBy(0.01)
    if (event.key === 'ArrowLeft') this.handlers.seekBy(-0.01)
  }
}
