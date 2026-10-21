import * as THREE from 'three'
import { createBodyTexture } from '../scene/proceduralTextures.ts'
import { defaultGameConfig } from '../config/gameConfig.ts'
import { formatSite, siteFromDirection, surfaceDirection, validateSurfaceSite, type SurfaceSite } from '../simulation/surfaceSites.ts'

/** One small on-demand renderer while choosing a site, never part of the ride render loop.
 * A tap places a site; dragging orbits the selection globe. No network/geocoder required.
 */
export class SurfacePickerUi {
  private readonly root: HTMLElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.02, 50)
  private readonly globe: THREE.Mesh
  private readonly marker: THREE.Mesh
  private readonly material: THREE.MeshStandardMaterial
  private readonly texture: THREE.CanvasTexture
  private readonly globeGeometry = new THREE.SphereGeometry(1, 56, 40)
  private readonly markerGeometry = new THREE.SphereGeometry(0.026, 12, 10)
  private readonly markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd74, depthTest: false })
  private readonly ray = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly label: HTMLElement
  private readonly lat: HTMLInputElement
  private readonly lon: HTMLInputElement
  private readonly heading: HTMLInputElement
  private selected: SurfaceSite
  private azimuth = 0
  private elevation = 0
  private distance = 3.7
  private tracking: { id: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null = null
  private frame = 0
  private disposed = false
  private readonly onResize = () => this.requestDraw()

  constructor(parent: HTMLElement, initial: SurfaceSite, private readonly onConfirm: (value: SurfaceSite) => void) {
    const site = validateSurfaceSite(initial)
    if (!site) throw new RangeError('Invalid initial surface site')
    this.selected = site
    this.root = document.createElement('section')
    this.root.className = 'site-picker-overlay'
    this.root.setAttribute('role', 'dialog')
    this.root.setAttribute('aria-modal', 'true')
    this.root.setAttribute('aria-label', `Choose ${site.body === 'earth' ? 'Earth launch' : 'Moon arrival'} location`)
    this.root.innerHTML = `<div class="site-picker-card">
      <div class="site-picker-header"><div><span class="eyebrow">CHOOSE A PLACE ON THE ${site.body.toUpperCase()}</span><h2>${site.body === 'earth' ? 'Launch from anywhere on Earth' : 'Arrive anywhere on the Moon'}</h2></div><button type="button" data-site-cancel aria-label="Close location picker">✕</button></div>
      <p>Drag to rotate the globe. Tap to place your station. Or enter exact coordinates below.</p>
      <div class="site-picker-globe" id="site-picker-globe" aria-label="Rotatable selectable ${site.body} globe"></div>
      <output id="site-picker-label" role="status"></output>
      <div class="site-picker-coordinates">
        <label>LATITUDE <input id="site-picker-lat" type="number" min="-90" max="90" step="0.0001" inputmode="decimal"></label>
        <label>LONGITUDE <input id="site-picker-lon" type="number" min="-180" max="180" step="0.0001" inputmode="decimal"></label>
        <label>LAUNCH/ARRIVAL HEADING <input id="site-picker-heading" type="number" min="0" max="360" step="5" inputmode="numeric"></label>
      </div>
      <div class="site-picker-presets"><button type="button" data-site-preset="default">DEFAULT</button>${site.body === 'earth' ? '<button type="button" data-site-preset="colchester">COLCHESTER</button><button type="button" data-site-preset="equator">EQUATOR</button>' : '<button type="button" data-site-preset="nearside">NEAR SIDE</button><button type="button" data-site-preset="farside">FAR SIDE</button>'}</div>
      <small>Geographic coordinates are real-world coordinates, but globe surface artwork is currently stylised, not high-resolution satellite imagery. No GPS or address data is collected.</small>
      <div class="site-picker-actions"><button type="button" data-site-cancel>CANCEL</button><button type="button" data-site-confirm class="site-picker-confirm">USE THIS LOCATION</button></div>
    </div>`
    // The planner is a scrolling backdrop-filter container, which establishes a
    // containing block for fixed descendants. Mount at document level so the
    // modal always covers the viewport instead of scrolling partly off-screen.
    parent.ownerDocument.body.append(this.root)
    const required = <T extends Element>(s: string): T => {
      const el = this.root.querySelector<T>(s)
      if (!el) throw new Error(`Missing picker element ${s}`)
      return el
    }
    const container = required<HTMLElement>('#site-picker-globe')
    this.label = required<HTMLElement>('#site-picker-label')
    this.lat = required<HTMLInputElement>('#site-picker-lat')
    this.lon = required<HTMLInputElement>('#site-picker-lon')
    this.heading = required<HTMLInputElement>('#site-picker-heading')
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' })
    this.renderer.setClearColor(0x051226)
    this.renderer.setPixelRatio(Math.min(1.3,window.devicePixelRatio || 1))
    this.renderer.domElement.style.touchAction = 'none'
    container.append(this.renderer.domElement)
    const texture = createBodyTexture(site.body, defaultGameConfig.scene.proceduralSeed, 1)
    this.texture = texture
    this.material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 })
    this.globe = new THREE.Mesh(this.globeGeometry, this.material)
    this.marker = new THREE.Mesh(this.markerGeometry, this.markerMaterial)
    this.scene.add(this.globe, this.marker, new THREE.AmbientLight(0xa8c8e1, 1.6))
    const light = new THREE.DirectionalLight(0xffffff, 2.8)
    light.position.set(-3, 2, 4)
    this.scene.add(light)
    this.camera.position.set(0, 0, this.distance)
    this.camera.lookAt(0,0,0)
    const [dx,dy,dz] = surfaceDirection(this.selected)
    this.azimuth = Math.atan2(dz,dx)
    this.elevation = Math.asin(dy)
    this.showSelected(true)
    this.renderer.domElement.addEventListener('pointerdown', this.down)
    this.renderer.domElement.addEventListener('pointermove', this.move)
    this.renderer.domElement.addEventListener('pointerup', this.up)
    this.renderer.domElement.addEventListener('pointercancel', this.up)
    this.renderer.domElement.addEventListener('wheel', this.wheel, { passive:false })
    this.root.querySelectorAll<HTMLButtonElement>('[data-site-cancel]').forEach(button => button.addEventListener('click', () => this.dispose()))
    required<HTMLButtonElement>('[data-site-confirm]').addEventListener('click', () => {
      if (!this.readNumeric()) return
      this.onConfirm(this.selected)
      this.dispose()
    })
    const numericChange = () => { if (this.readNumeric()) this.showSelected(true) }
    this.lat.addEventListener('change', numericChange)
    this.lon.addEventListener('change', numericChange)
    this.heading.addEventListener('change', numericChange)
    this.root.querySelectorAll<HTMLButtonElement>('[data-site-preset]').forEach(button => button.addEventListener('click', () => {
      const preset = button.dataset.sitePreset
      const coord: Record<string,[number,number]> = { default:[0,0], colchester:[51.8892,0.9042], equator:[0,0], nearside:[0,0], farside:[0,180] }
      const [latDeg,lonDeg] = coord[preset ?? 'default'] ?? [0,0]
      this.selected = { ...this.selected, latDeg, lonDeg }
      this.showSelected(true)
    }))
    this.root.addEventListener('keydown', this.keydown)
    window.addEventListener('resize', this.onResize)
    this.requestDraw()
    required<HTMLButtonElement>('[data-site-confirm]').focus()
  }

  private readonly keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.dispose() }
  }
  private readonly down = (event: PointerEvent) => {
    if (this.tracking) return
    this.tracking = { id:event.pointerId, x:event.clientX, y:event.clientY, startX:event.clientX, startY:event.clientY, moved:false }
    this.renderer.domElement.setPointerCapture(event.pointerId)
    event.preventDefault()
  }
  private readonly move = (event: PointerEvent) => {
    const t = this.tracking
    if (!t || t.id !== event.pointerId) return
    const dx = event.clientX-t.x, dy = event.clientY-t.y
    if (Math.hypot(event.clientX-t.startX,event.clientY-t.startY)>6) t.moved=true
    if (t.moved) {
      this.azimuth -= dx*.006
      this.elevation = Math.max(-1.52,Math.min(1.52,this.elevation+dy*.006))
      this.requestDraw()
    }
    t.x=event.clientX; t.y=event.clientY
  }
  private readonly up = (event: PointerEvent) => {
    const t = this.tracking
    if (!t || t.id !== event.pointerId) return
    this.tracking = null
    if (t.moved) return
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1)
    this.ray.setFromCamera(this.pointer,this.camera)
    const hit = this.ray.intersectObject(this.globe)[0]
    if (!hit) return
    const p = hit.point.clone().normalize()
    this.selected = siteFromDirection(this.selected.body,[p.x,p.y,p.z])
    this.showSelected(false)
  }
  private readonly wheel = (event: WheelEvent) => {
    event.preventDefault()
    this.distance = Math.min(5.5,Math.max(2.5,this.distance*(event.deltaY>0?1.1:.9)))
    this.requestDraw()
  }
  private readNumeric(): boolean {
    const candidate = validateSurfaceSite({ ...this.selected, latDeg:Number(this.lat.value), lonDeg:Number(this.lon.value), headingDeg:Number(this.heading.value) })
    if (!candidate) {
      this.label.textContent = 'Invalid coordinates. Latitude: −90 to 90, longitude: −180 to 180, heading: 0–360.'
      return false
    }
    this.selected = candidate
    return true
  }
  private showSelected(aimAtSite: boolean) {
    const [x,y,z] = surfaceDirection(this.selected)
    this.marker.position.set(x*1.035,y*1.035,z*1.035)
    if (aimAtSite) { this.azimuth=Math.atan2(z,x); this.elevation=Math.asin(y) }
    this.label.textContent = `${this.selected.body.toUpperCase()} · ${formatSite(this.selected)} · heading ${this.selected.headingDeg.toFixed(0)}°`
    this.lat.value = this.selected.latDeg.toFixed(4)
    this.lon.value = this.selected.lonDeg.toFixed(4)
    this.heading.value = this.selected.headingDeg.toFixed(0)
    this.requestDraw()
  }
  private requestDraw() {
    if (this.disposed || this.frame) return
    this.frame = requestAnimationFrame(() => { this.frame=0; this.draw() })
  }
  private draw() {
    if (this.disposed) return
    const rect = this.renderer.domElement.parentElement!.getBoundingClientRect()
    const width = Math.max(1,rect.width),height=Math.max(1,rect.height)
    this.renderer.setSize(width,height,false)
    this.camera.aspect=width/height
    this.camera.updateProjectionMatrix()
    this.camera.position.set(this.distance*Math.cos(this.elevation)*Math.cos(this.azimuth),this.distance*Math.sin(this.elevation),this.distance*Math.cos(this.elevation)*Math.sin(this.azimuth))
    this.camera.lookAt(0,0,0)
    this.renderer.render(this.scene,this.camera)
  }
  dispose() {
    if (this.disposed) return
    this.disposed=true
    cancelAnimationFrame(this.frame)
    window.removeEventListener('resize',this.onResize)
    this.renderer.domElement.removeEventListener('pointerdown',this.down)
    this.renderer.domElement.removeEventListener('pointermove',this.move)
    this.renderer.domElement.removeEventListener('pointerup',this.up)
    this.renderer.domElement.removeEventListener('pointercancel',this.up)
    this.renderer.domElement.removeEventListener('wheel',this.wheel)
    this.root.removeEventListener('keydown',this.keydown)
    this.texture.dispose();this.material.dispose();this.globeGeometry.dispose();this.markerGeometry.dispose();this.markerMaterial.dispose()
    this.renderer.dispose();this.root.remove()
  }
}
