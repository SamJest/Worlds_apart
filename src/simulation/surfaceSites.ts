/** Body-fixed surface sites. Latitude north-positive, longitude east-positive.
 * Scene axes: +X = lon 0, +Y = north, -Z = lon +90.
 * Three's equirectangular SphereGeometry consequently has u=(lon+180)/360.
 * Persistent coordinates stay in degrees/metres; scene kilometres use the game's scale.
 */
export type SurfaceBodyId = 'earth' | 'moon'
export interface SurfaceSite {
  body: SurfaceBodyId
  latDeg: number
  lonDeg: number
  elevationMeters: number
  headingDeg: number
}
export interface RideSites { start: SurfaceSite; arrival: SurfaceSite }
export type Vec3Tuple = readonly [number, number, number]

const RAD = Math.PI / 180
const WGS84_A = 6378137
const WGS84_F = 1 / 298.257223563
const WGS84_E2 = WGS84_F * (2 - WGS84_F)
const MOON_METRES = 1737400
const STORAGE_KEY = 'worlds-apart.ride-sites.v1'

export const DEFAULT_RIDE_SITES: Readonly<RideSites> = {
  start: { body: 'earth', latDeg: 51.8892, lonDeg: 0.9042, elevationMeters: 0, headingDeg: 90 },
  arrival: { body: 'moon', latDeg: 0, lonDeg: 0, elevationMeters: 0, headingDeg: 0 },
}

export function normaliseLongitude(lon: number): number {
  if (!Number.isFinite(lon)) throw new RangeError('Longitude must be finite')
  const value = ((lon + 180) % 360 + 360) % 360 - 180
  return value === -180 && lon > 0 ? 180 : value
}

export function validateSurfaceSite(input: unknown, expectedBody?: SurfaceBodyId): SurfaceSite | null {
  if (!input || typeof input !== 'object') return null
  const s = input as Partial<SurfaceSite>
  if ((s.body !== 'earth' && s.body !== 'moon') || expectedBody && s.body !== expectedBody) return null
  if (![s.latDeg, s.lonDeg, s.elevationMeters, s.headingDeg].every(v => typeof v === 'number' && Number.isFinite(v))) return null
  if (s.latDeg! < -90 || s.latDeg! > 90 || s.lonDeg! < -180 || s.lonDeg! > 180 || s.elevationMeters! < -1000 || s.elevationMeters! > 100000 || s.headingDeg! < 0 || s.headingDeg! > 360) return null
  return { body: s.body, latDeg: s.latDeg!, lonDeg: s.lonDeg!, elevationMeters: s.elevationMeters!, headingDeg: s.headingDeg! }
}

export function validateRideSites(value: unknown): RideSites | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Partial<RideSites>
  const start = validateSurfaceSite(v.start, 'earth')
  const arrival = validateSurfaceSite(v.arrival, 'moon')
  return start && arrival ? { start, arrival } : null
}

export function readRideSites(storage?: Pick<Storage, 'getItem'>): RideSites {
  try {
    const value = (storage ?? localStorage).getItem(STORAGE_KEY)
    return value ? validateRideSites(JSON.parse(value)) ?? structuredClone(DEFAULT_RIDE_SITES) : structuredClone(DEFAULT_RIDE_SITES)
  } catch { return structuredClone(DEFAULT_RIDE_SITES) }
}
export function saveRideSites(sites: RideSites, storage?: Pick<Storage, 'setItem'>): boolean {
  const valid = validateRideSites(sites)
  if (!valid) return false
  try { (storage ?? localStorage).setItem(STORAGE_KEY, JSON.stringify(valid)); return true } catch { return false }
}

/** Physical WGS84 ECEF adapted to Three.js scene axes. Returns metres, not game units. */
export function bodyFixedMetres(site: SurfaceSite): Vec3Tuple {
  const s = validateSurfaceSite(site)
  if (!s) throw new RangeError('Invalid surface site')
  const lat = s.latDeg * RAD, lon = s.lonDeg * RAD
  const c = Math.cos(lat), sin = Math.sin(lat), cl = Math.cos(lon), sl = Math.sin(lon)
  if (s.body === 'moon') {
    const radius = MOON_METRES + s.elevationMeters
    return [radius * c * cl, radius * sin, -radius * c * sl]
  }
  const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sin * sin)
  return [(n + s.elevationMeters) * c * cl, (n * (1 - WGS84_E2) + s.elevationMeters) * sin, -(n + s.elevationMeters) * c * sl]
}
/** Unit direction of a location on the displayed spherical globe; WGS84 affects latitude slightly. */
export function surfaceDirection(site: SurfaceSite): Vec3Tuple {
  const [x,y,z] = bodyFixedMetres(site)
  const inv = 1 / Math.hypot(x,y,z)
  return [x*inv,y*inv,z*inv]
}
/** Inverse of the displayed radial direction for the surface picker. */
export function siteFromDirection(body: SurfaceBodyId, direction: Vec3Tuple): SurfaceSite {
  const [x,y,z] = direction
  const h = Math.hypot(x,y,z)
  if (!Number.isFinite(h) || h < 1e-12) throw new RangeError('Invalid surface direction')
  const lonDeg = normaliseLongitude(Math.atan2(-z,x) / RAD)
  const geocentric = Math.atan2(y,Math.hypot(x,z))
  const latDeg = body === 'earth' ? Math.atan2(Math.sin(geocentric), Math.cos(geocentric)*(1-WGS84_E2)) / RAD : geocentric / RAD
  return { body, latDeg: Math.max(-90,Math.min(90,latDeg)), lonDeg, elevationMeters:0, headingDeg:90 }
}
/** Rotate site from the spinning body-fixed frame into world inertial frame around global +Y. */
export function rotatedSiteDirection(site: SurfaceSite, rotationYRadians: number): Vec3Tuple {
  const [x,y,z] = surfaceDirection(site)
  const c = Math.cos(rotationYRadians), s = Math.sin(rotationYRadians)
  return [x*c+z*s,y,-x*s+z*c]
}
export function formatSite(site: SurfaceSite): string {
  return `${Math.abs(site.latDeg).toFixed(2)}°${site.latDeg < 0 ? 'S' : 'N'}, ${Math.abs(site.lonDeg).toFixed(2)}°${site.lonDeg < 0 ? 'W' : 'E'}`
}
