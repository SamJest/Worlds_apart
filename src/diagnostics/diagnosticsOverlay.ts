import type { WebGLRenderer } from 'three'
import type { Telemetry } from '../scene/worldScene.ts'

export class DiagnosticsOverlay {
  private readonly element: HTMLElement
  private elapsed = 0
  private frames = 0
  private fps = 0

  constructor(root: HTMLElement, enabled: boolean) {
    this.element = document.createElement('aside')
    this.element.id = 'diagnostics'
    this.element.hidden = !enabled
    this.element.setAttribute('aria-label', 'Developer diagnostics')
    root.append(this.element)
  }

  update(frameSeconds: number, telemetry: Telemetry, renderer: WebGLRenderer) {
    if (this.element.hidden) return
    this.elapsed += frameSeconds
    this.frames++
    if (this.elapsed >= 0.5) {
      this.fps = this.frames / this.elapsed
      this.elapsed = 0
      this.frames = 0
    }
    const position = telemetry.worldPosition
    this.element.textContent = [
      `FPS ${this.fps.toFixed(0)} · ${(frameSeconds * 1000).toFixed(1)} ms`,
      `Progress ${(telemetry.progress * 100).toFixed(1)}% · ${telemetry.cameraMode}`,
      `World ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`,
      `Draws ${renderer.info.render.calls} · Triangles ${renderer.info.render.triangles.toLocaleString('en-GB')}`,
    ].join('\n')
  }

  dispose() { this.element.remove() }
}
