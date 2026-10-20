export interface InputHandlers {
  togglePlay(): void
  toggleCamera(): void
  seekBy(delta: number): void
  look(deltaX: number, deltaY: number): void
  zoom(direction: number): void
}

export class InputController {
  private dragging = false
  private lastX = 0
  private lastY = 0

  constructor(private readonly canvas: HTMLCanvasElement, private readonly handlers: InputHandlers) {
    canvas.addEventListener('pointerdown', this.pointerDown)
    canvas.addEventListener('pointerup', this.pointerUp)
    canvas.addEventListener('pointercancel', this.pointerUp)
    canvas.addEventListener('pointermove', this.pointerMove)
    canvas.addEventListener('wheel', this.wheel, { passive: true })
    window.addEventListener('keydown', this.keyDown)
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.pointerDown)
    this.canvas.removeEventListener('pointerup', this.pointerUp)
    this.canvas.removeEventListener('pointercancel', this.pointerUp)
    this.canvas.removeEventListener('pointermove', this.pointerMove)
    this.canvas.removeEventListener('wheel', this.wheel)
    window.removeEventListener('keydown', this.keyDown)
  }

  private readonly pointerDown = (event: PointerEvent) => {
    this.dragging = true
    this.lastX = event.clientX
    this.lastY = event.clientY
    this.canvas.setPointerCapture(event.pointerId)
  }

  private readonly pointerUp = () => { this.dragging = false }

  private readonly pointerMove = (event: PointerEvent) => {
    if (!this.dragging) return
    this.handlers.look(event.clientX - this.lastX, event.clientY - this.lastY)
    this.lastX = event.clientX
    this.lastY = event.clientY
  }

  private readonly wheel = (event: WheelEvent) => this.handlers.zoom(event.deltaY)

  private readonly keyDown = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      event.preventDefault()
      this.handlers.togglePlay()
    }
    if (event.key.toLowerCase() === 'c') this.handlers.toggleCamera()
    if (event.key === 'ArrowRight') this.handlers.seekBy(0.01)
    if (event.key === 'ArrowLeft') this.handlers.seekBy(-0.01)
  }
}
