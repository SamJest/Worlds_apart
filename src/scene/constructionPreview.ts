import * as THREE from 'three'
import { EARTH_RADIUS, MOON_RADIUS, type EarthMoonRoute } from '../simulation/astronomy.ts'

/** On-demand 3D construction camera; redraws only when the blueprint or camera changes. */
export class ConstructionPreview {
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(43, 1, 1, 1500)
  private readonly renderer: THREE.WebGLRenderer
  private readonly earth: THREE.Mesh
  private readonly moon: THREE.Mesh
  private readonly lights: THREE.Light[] = []
  private geometry: THREE.BufferGeometry | undefined
  private material = new THREE.LineBasicMaterial({ color: 0x89f4ff })
  private rail: THREE.Line | undefined
  private readonly markers: THREE.Mesh[] = []
  private readonly markerGeometry = new THREE.SphereGeometry(2.7, 8, 8)
  private readonly markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffd5a0 })
  private azimuth = 0.50
  private elevation = 0.38
  private distance = 560
  private target = new THREE.Vector3(170, 0, 42)
  private dragging = false
  private previousX = 0
  private previousY = 0
  private pendingFrame = 0
  private observer: ResizeObserver | undefined
  private disposed = false

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: 'low-power' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4))
    this.renderer.setClearColor(0x03101f)
    this.renderer.domElement.setAttribute('aria-hidden', 'true')
    this.container.append(this.renderer.domElement)
    this.scene.add(new THREE.AmbientLight(0x8dbfe3, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 3)
    sun.position.set(-180, 280, 280)
    this.scene.add(sun)
    this.lights.push(sun)
    const globe = (radius: number, colour: number) => new THREE.Mesh(
      new THREE.SphereGeometry(radius, 28, 20), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.96 }),
    )
    // The planets are enlarged only in this schematic preview; ride-world sizes stay physical.
    this.earth = globe(Math.max(9, EARTH_RADIUS), 0x2d84d2)
    this.moon = globe(Math.max(6, MOON_RADIUS), 0xb4bac2)
    this.scene.add(this.earth, this.moon)
    this.container.addEventListener('pointerdown', this.onPointerDown)
    this.container.addEventListener('pointermove', this.onPointerMove)
    this.container.addEventListener('pointerup', this.onPointerUp)
    this.container.addEventListener('pointercancel', this.onPointerUp)
    this.container.addEventListener('wheel', this.onWheel, { passive: false })
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.schedule())
      this.observer.observe(container)
    }
    this.schedule()
  }

  setRoute(route: EarthMoonRoute, anchors: readonly THREE.Vector3[]) {
    this.moon.position.copy(route.arrivalMoon)
    this.geometry?.dispose()
    if (this.rail) this.scene.remove(this.rail)
    this.geometry = new THREE.BufferGeometry().setFromPoints(route.curve.getPoints(220))
    this.rail = new THREE.Line(this.geometry, this.material)
    this.scene.add(this.rail)
    for (const marker of this.markers) this.scene.remove(marker)
    this.markers.length = 0
    for (let index = 0; index < anchors.length; index++) {
      const marker = new THREE.Mesh(this.markerGeometry, this.markerMaterial)
      marker.position.copy(anchors[index])
      this.scene.add(marker)
      this.markers.push(marker)
    }
    this.target.copy(route.start).lerp(route.end, 0.48)
    this.schedule()
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    this.dragging = true
    this.previousX = event.clientX
    this.previousY = event.clientY
    this.container.setPointerCapture(event.pointerId)
  }
  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.dragging) return
    this.azimuth += (event.clientX - this.previousX) * 0.008
    this.elevation = THREE.MathUtils.clamp(this.elevation + (event.clientY - this.previousY) * 0.005, -1.2, 1.2)
    this.previousX = event.clientX
    this.previousY = event.clientY
    this.schedule()
  }
  private readonly onPointerUp = () => { this.dragging = false }
  private readonly onWheel = (event: WheelEvent) => {
    event.preventDefault()
    this.distance = THREE.MathUtils.clamp(this.distance * (event.deltaY > 0 ? 1.12 : 0.9), 280, 900)
    this.schedule()
  }
  private schedule() {
    if (this.disposed || this.pendingFrame) return
    this.pendingFrame = requestAnimationFrame(() => { this.pendingFrame = 0; this.draw() })
  }
  private draw() {
    if (this.disposed) return
    const width = Math.max(1, this.container.clientWidth)
    const height = Math.max(1, this.container.clientHeight)
    if (width < 2 || height < 2) return
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.camera.position.set(
      this.target.x + this.distance * Math.cos(this.elevation) * Math.cos(this.azimuth),
      this.target.y + this.distance * Math.sin(this.elevation),
      this.target.z + this.distance * Math.cos(this.elevation) * Math.sin(this.azimuth),
    )
    this.camera.lookAt(this.target)
    this.renderer.setSize(width, height, false)
    this.renderer.render(this.scene, this.camera)
  }
  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.pendingFrame)
    this.observer?.disconnect()
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
    this.container.removeEventListener('pointercancel', this.onPointerUp)
    this.container.removeEventListener('wheel', this.onWheel)
    this.geometry?.dispose()
    this.material.dispose()
    this.markerGeometry.dispose()
    this.markerMaterial.dispose()
    for (const mesh of [this.earth, this.moon]) {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
