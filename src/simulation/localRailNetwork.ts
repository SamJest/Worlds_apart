/** Bounded player-built local rail network. Coordinates are on a fictional orbital schematic,
 * not geodetic coordinates; the long-distance Earth–Moon guideway remains separate. */
export const LOCAL_NETWORK_STORAGE_KEY = 'worlds-apart.local-network.v1'
export const MAX_STATIONS = 6
export const MAX_LINKS = 12
export const STATION_PRICE = 65
export const ORE_CAPACITY = 250
export const ORE_REFINING_PER_SECOND = 4
export interface LocalStation { readonly id: string; readonly name: string; readonly x: number; readonly y: number }
export interface LocalLink { readonly a: string; readonly b: string }
export interface RailPath { readonly stops: readonly string[]; readonly length: number }
export interface ActiveFreightPath extends RailPath { readonly destination: string }
export interface LocalRailNetwork {
  readonly version: 1
  readonly stations: readonly LocalStation[]
  readonly links: readonly LocalLink[]
  readonly nextStation: number
  readonly destination: string
  readonly ore: number
  readonly activePath: ActiveFreightPath | null
}
export const initialLocalNetwork = (): LocalRailNetwork => ({
  version: 1,
  stations: [
    { id: 's0', name: 'Earth Depot', x: 93, y: 145 },
    { id: 's1', name: 'Orbital Yard', x: 421, y: 145 },
  ],
  links: [{ a: 's0', b: 's1' }], nextStation: 2, destination: 's1', ore: ORE_CAPACITY, activePath: null,
})
export const linkKey = (a: string, b: string) => [a, b].sort().join(':')
const finite = (x: unknown, a: number, b: number): x is number => typeof x === 'number' && Number.isFinite(x) && x >= a && x <= b
const integer = (x: unknown, a: number, b: number): x is number => Number.isSafeInteger(x) && finite(x, a, b)
export const segmentLength = (a: LocalStation, b: LocalStation) => Math.hypot(a.x - b.x, a.y - b.y)
export const linkCost = (a: LocalStation, b: LocalStation) => Math.max(12, Math.ceil(segmentLength(a, b) / 9))
export const stationById = (network: LocalRailNetwork, id: string) => network.stations.find(s => s.id === id)

/** Validates all cross references before anything is restored from localStorage. */
export function validateLocalNetwork(value: unknown): LocalRailNetwork | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (raw.version !== 1 || !Array.isArray(raw.stations) || raw.stations.length < 2 || raw.stations.length > MAX_STATIONS
    || !Array.isArray(raw.links) || raw.links.length > MAX_LINKS || !integer(raw.nextStation, 2, 200)
    || !finite(raw.ore, 0, ORE_CAPACITY) || typeof raw.destination !== 'string') return null
  const stations: LocalStation[] = []
  const ids = new Set<string>()
  for (const s of raw.stations) {
    if (!s || typeof s !== 'object') return null
    const station = s as Record<string, unknown>
    if (typeof station.id !== 'string' || !/^s(?:0|[1-9]\d{0,2})$/.test(station.id) || ids.has(station.id)
      || typeof station.name !== 'string' || !/^[A-Za-z0-9 ]{3,32}$/.test(station.name)
      || !finite(station.x, 35, 485) || !finite(station.y, 30, 235)) return null
    ids.add(station.id)
    stations.push({ id: station.id, name: station.name, x: station.x, y: station.y })
  }
  if (stations[0].id !== 's0' || stations[1].id !== 's1' || stations[0].name !== 'Earth Depot'
    || stations[1].name !== 'Orbital Yard' || !ids.has(raw.destination) || raw.destination === 's0'
    || Math.max(...stations.map(s => Number(s.id.slice(1)))) >= raw.nextStation) return null
  if (stations.some((s, i) => stations.slice(i + 1).some(other => segmentLength(s, other) < 38))) return null
  const links: LocalLink[] = []
  const keys = new Set<string>()
  for (const edge of raw.links) {
    if (!edge || typeof edge !== 'object') return null
    const link = edge as Record<string, unknown>
    if (typeof link.a !== 'string' || typeof link.b !== 'string' || link.a === link.b
      || !ids.has(link.a) || !ids.has(link.b) || keys.has(linkKey(link.a, link.b))) return null
    keys.add(linkKey(link.a, link.b))
    links.push({ a: link.a, b: link.b })
  }
  let activePath: ActiveFreightPath | null = null
  if (raw.activePath !== null) {
    const path = raw.activePath as Record<string, unknown> | undefined
    if (!path || !Array.isArray(path.stops) || path.stops.length < 2 || path.stops.length > MAX_STATIONS
      || path.stops[0] !== 's0' || typeof path.destination !== 'string'
      || path.stops.at(-1) !== path.destination || !ids.has(path.destination)
      || new Set(path.stops).size !== path.stops.length || !path.stops.every(s => typeof s === 'string' && ids.has(s))) return null
    const stops = path.stops as string[]
    let length = 0
    for (let i = 1; i < stops.length; i++) {
      if (!keys.has(linkKey(stops[i - 1], stops[i]))) return null
      length += segmentLength(stations.find(s => s.id === stops[i - 1])!, stations.find(s => s.id === stops[i])!)
    }
    if (!finite(path.length, 0, 3000) || Math.abs(length - path.length) > .05) return null
    activePath = { stops, length, destination: path.destination }
  }
  return { version: 1, stations, links, nextStation: raw.nextStation, destination: raw.destination,
    ore: raw.ore, activePath }
}
export function proposeStation(network: LocalRailNetwork, x: number, y: number): LocalStation | null {
  if (network.stations.length >= MAX_STATIONS || !finite(x, 35, 485) || !finite(y, 30, 235)) return null
  const position = { id: `s${network.nextStation}`, name: `Outpost ${network.nextStation - 1}`, x: Math.round(x), y: Math.round(y) }
  return network.stations.some(s => segmentLength(s, position) < 38) ? null : position
}
export function addStation(network: LocalRailNetwork, x: number, y: number): LocalRailNetwork | null {
  const station = proposeStation(network, x, y)
  return station ? { ...network, stations: [...network.stations, station], nextStation: network.nextStation + 1 } : null
}
export function addLink(network: LocalRailNetwork, a: string, b: string): LocalRailNetwork | null {
  if (a === b || network.links.length >= MAX_LINKS || network.links.some(link => linkKey(link.a, link.b) === linkKey(a, b))
    || !stationById(network, a) || !stationById(network, b)) return null
  return { ...network, links: [...network.links, { a, b }] }
}
/** Removes track unless a live legacy or auxiliary train is currently using it. */
export function removeLink(network: LocalRailNetwork, a: string, b: string,
  protectedPaths: readonly (readonly string[])[] = []): LocalRailNetwork | null {
  const key = linkKey(a, b)
  if (!network.links.some(link => linkKey(link.a, link.b) === key)) return null
  const paths = [network.activePath?.stops, ...protectedPaths].filter((path): path is readonly string[] => !!path)
  if (paths.some(path => path.slice(1).some((station, i) => linkKey(path[i], station) === key))) return null
  return { ...network, links: network.links.filter(link => linkKey(link.a, link.b) !== key) }
}
/** Station demolition requires disconnecting its links first. Monotonic IDs prevent
 * old route IDs from silently referring to a new station placed in the same slot. */
export function removeStation(network: LocalRailNetwork, id: string): LocalRailNetwork | null {
  if (id === 's0' || id === 's1' || !stationById(network, id)
    || network.links.some(link => link.a === id || link.b === id)
    || network.activePath?.stops.includes(id)) return null
  return { ...network, stations: network.stations.filter(station => station.id !== id),
    destination: network.destination === id ? 's1' : network.destination }
}
export function selectDestination(network: LocalRailNetwork, station: string): LocalRailNetwork {
  return station !== 's0' && stationById(network, station) ? { ...network, destination: station } : network
}
/** Deterministic undirected Dijkstra route finder; arbitrary station origins support
 * multi-train routes while the legacy Earth Depot wrapper preserves old behaviour. */
export function shortestRailPathBetween(network: LocalRailNetwork, origin: string, destination: string): RailPath | null {
  if (!stationById(network, origin) || !stationById(network, destination) || origin === destination) return null
  const distances = new Map<string, number>([[origin, 0]])
  const parents = new Map<string, string>()
  const visited = new Set<string>()
  while (visited.size < network.stations.length) {
    const current = network.stations.filter(s => !visited.has(s.id) && distances.has(s.id))
      .sort((a, b) => (distances.get(a.id)! - distances.get(b.id)!) || a.id.localeCompare(b.id))[0]
    if (!current) break
    if (current.id === destination) {
      const stops = [destination]
      while (stops[0] !== origin) stops.unshift(parents.get(stops[0])!)
      return { stops, length: distances.get(destination)! }
    }
    visited.add(current.id)
    for (const link of network.links) {
      const next = link.a === current.id ? link.b : link.b === current.id ? link.a : null
      if (!next || visited.has(next)) continue
      const candidate = distances.get(current.id)! + segmentLength(current, stationById(network, next)!)
      if (candidate < (distances.get(next) ?? Infinity) - 1e-6) {
        distances.set(next, candidate)
        parents.set(next, current.id)
      }
    }
  }
  return null
}
export function shortestRailPath(network: LocalRailNetwork, destination = network.destination): RailPath | null {
  return shortestRailPathBetween(network, 's0', destination)
}
export function beginNetworkShipment(network: LocalRailNetwork, path: RailPath, cargo: number): LocalRailNetwork | null {
  if (network.activePath || !integer(cargo, 1, 200) || network.ore + 1e-7 < cargo) return null
  const verified = shortestRailPath(network, path.stops.at(-1)!)
  if (!verified || verified.stops.join(',') !== path.stops.join(',') || Math.abs(verified.length - path.length) > .05) return null
  return { ...network, ore: Math.max(0, network.ore - cargo),
    activePath: { ...verified, destination: verified.stops.at(-1)! } }
}
export function completeNetworkShipment(network: LocalRailNetwork): LocalRailNetwork {
  return network.activePath ? { ...network, activePath: null } : network
}
export function advanceNetworkProduction(network: LocalRailNetwork, elapsed: number): LocalRailNetwork {
  if (!finite(elapsed, 0, 1) || elapsed === 0 || network.ore >= ORE_CAPACITY) return network
  return { ...network, ore: Math.min(ORE_CAPACITY, Math.round((network.ore + elapsed * ORE_REFINING_PER_SECOND) * 1000) / 1000) }
}
export function readLocalNetwork(storage?: Pick<Storage, 'getItem'>): LocalRailNetwork {
  try {
    const s = storage ?? (typeof localStorage === 'undefined' ? null : localStorage)
    const data = s?.getItem(LOCAL_NETWORK_STORAGE_KEY)
    return data ? validateLocalNetwork(JSON.parse(data)) ?? initialLocalNetwork() : initialLocalNetwork()
  } catch { return initialLocalNetwork() }
}
export function saveLocalNetwork(network: LocalRailNetwork, storage?: Pick<Storage, 'setItem'>): boolean {
  const validated = validateLocalNetwork(network)
  if (!validated) return false
  try {
    const s = storage ?? (typeof localStorage === 'undefined' ? null : localStorage)
    if (!s) return false
    s.setItem(LOCAL_NETWORK_STORAGE_KEY, JSON.stringify(validated))
    return true
  } catch { return false }
}
