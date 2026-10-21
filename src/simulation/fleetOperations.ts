/** Parallel rail operations and a two-stage components manufacturing loop.
 * All results are pure: UI actions and saves apply the full three-state transaction. */
import { FREIGHT_TIERS, MATERIAL_LIMIT, type FreightState } from './freightEconomy.ts'
import { shortestRailPathBetween, stationById, linkKey, segmentLength,
  type LocalRailNetwork, type RailPath } from './localRailNetwork.ts'

export const EXTRA_TRAIN_IDS = ['b', 'c'] as const
export type ExtraTrainId = typeof EXTRA_TRAIN_IDS[number]
export type CargoKind = 'ore' | 'components'
export const TRAIN_PURCHASE_COST = [140, 260] as const
export const COMPONENT_BATCH_ALLOY = 24
export const COMPONENT_BATCH_SIZE = 16
export const COMPONENT_CAPACITY = 128
export const COMPONENT_REWARD = 2
export const FLEET_STORAGE_KEY = 'worlds-apart.operations.v2'

export interface FleetShipment {
  readonly kind: CargoKind
  readonly cargo: number
  readonly payout: number
  readonly from: string
  readonly destination: string
  readonly path: readonly string[]
  readonly length: number
  readonly totalSeconds: number
  readonly secondsRemaining: number
}
export interface FleetState {
  readonly version: 1
  readonly unlocked: 0 | 1 | 2
  readonly jobs: Readonly<Record<ExtraTrainId, FleetShipment | null>>
  readonly components: number
  readonly manufactured: number
  readonly delivered: number
}
export interface OperationsState {
  readonly freight: FreightState
  readonly network: LocalRailNetwork
  readonly fleet: FleetState
}
export const initialFleetState = (): FleetState => ({
  version: 1, unlocked: 0, jobs: { b: null, c: null }, components: 0, manufactured: 0, delivered: 0,
})
const validInt = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= lo && v <= hi
const validSeconds = (v: unknown, hi: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= hi

export function extraTrainUnlocked(fleet: FleetState, train: ExtraTrainId): boolean {
  const index = EXTRA_TRAIN_IDS.indexOf(train)
  return index >= 0 && index < fleet.unlocked
}
export function unlockNextTrain(fleet: FleetState, freight: FreightState): { fleet: FleetState; freight: FreightState } | null {
  if (fleet.unlocked >= 2) return null
  const cost = fleet.unlocked === 0 ? TRAIN_PURCHASE_COST[0] : TRAIN_PURCHASE_COST[1]
  if (freight.materials < cost) return null
  return {
    fleet: { ...fleet, unlocked: (fleet.unlocked + 1) as 1 | 2 },
    freight: { ...freight, materials: freight.materials - cost },
  }
}
export function manufactureComponents(fleet: FleetState, freight: FreightState): { fleet: FleetState; freight: FreightState } | null {
  if (freight.materials < COMPONENT_BATCH_ALLOY || fleet.components + COMPONENT_BATCH_SIZE > COMPONENT_CAPACITY) return null
  return {
    fleet: { ...fleet, components: fleet.components + COMPONENT_BATCH_SIZE, manufactured: fleet.manufactured + COMPONENT_BATCH_SIZE },
    freight: { ...freight, materials: freight.materials - COMPONENT_BATCH_ALLOY },
  }
}
/** Cargo origin determines its role: raw ore leaves Earth, manufactured components leave
 * Orbital Yard. Additional outposts provide destinations and intermediate junctions. */
export function cargoOrigin(kind: CargoKind): string { return kind === 'ore' ? 's0' : 's1' }
export function dispatchQuote(fleet: FleetState, freight: FreightState, network: LocalRailNetwork,
  train: ExtraTrainId, kind: CargoKind, destination: string): { path: RailPath; cargo: number; payout: number; seconds: number } | null {
  if (!extraTrainUnlocked(fleet, train) || fleet.jobs[train] || (kind !== 'ore' && kind !== 'components')) return null
  const origin = cargoOrigin(kind)
  const path = shortestRailPathBetween(network, origin, destination)
  if (!path) return null
  const maxLoad = kind === 'ore' ? FREIGHT_TIERS[freight.tier].cargo : Math.ceil(FREIGHT_TIERS[freight.tier].cargo / 2)
  const stock = kind === 'ore' ? Math.floor(network.ore) : fleet.components
  const freeSpace = Math.floor((MATERIAL_LIMIT - freight.materials) / (kind === 'ore' ? 1 : COMPONENT_REWARD))
  const cargo = Math.min(maxLoad, stock, freeSpace)
  if (cargo < 1) return null
  const payout = cargo * (kind === 'ore' ? 1 : COMPONENT_REWARD)
  const seconds = Math.min(60, Math.max(6, Math.round(FREIGHT_TIERS[freight.tier].seconds * path.length / 328)))
  return { path, cargo, payout, seconds }
}
export function dispatchExtraTrain(state: OperationsState, train: ExtraTrainId, kind: CargoKind,
  destination: string): OperationsState | null {
  const { freight, network, fleet } = state
  const quote = dispatchQuote(fleet, freight, network, train, kind, destination)
  if (!quote) return null
  const shipment: FleetShipment = {
    kind, from: cargoOrigin(kind), destination, cargo: quote.cargo, payout: quote.payout,
    path: quote.path.stops, length: quote.path.length,
    totalSeconds: quote.seconds, secondsRemaining: quote.seconds,
  }
  return {
    freight,
    network: kind === 'ore' ? { ...network, ore: Math.max(0, network.ore - quote.cargo) } : network,
    fleet: { ...fleet,
      components: kind === 'components' ? fleet.components - quote.cargo : fleet.components,
      jobs: { ...fleet.jobs, [train]: shipment },
    },
  }
}
/** Completing a shipment credits only once: the finished job is removed from its slot.
 * elapsedSeconds is capped to a single active frame, never wall-clock catch-up. */
export function advanceExtraTrains(state: OperationsState, elapsedSeconds: number): OperationsState {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return state
  const elapsed = Math.min(1, elapsedSeconds)
  let newFreight = state.freight
  let newFleet = state.fleet
  let touched = false
  const jobs: Record<ExtraTrainId, FleetShipment | null> = { ...newFleet.jobs }
  for (const id of EXTRA_TRAIN_IDS) {
    const job = jobs[id]
    if (!job) continue
    touched = true
    const remaining = job.secondsRemaining - elapsed
    if (remaining > 0) { jobs[id] = { ...job, secondsRemaining: remaining }; continue }
    jobs[id] = null
    const amount = Math.min(job.payout, MATERIAL_LIMIT - newFreight.materials)
    newFreight = { ...newFreight,
      materials: newFreight.materials + amount,
      delivered: newFreight.delivered + amount,
      shipments: newFreight.shipments + 1,
    }
    newFleet = { ...newFleet, delivered: newFleet.delivered + 1 }
  }
  return touched ? { ...state, freight: newFreight, fleet: { ...newFleet, jobs } } : state
}

export function validateFleetState(input: unknown, network: LocalRailNetwork): FleetState | null {
  if (!input || typeof input !== 'object') return null
  const s = input as Record<string, unknown>
  if (s.version !== 1 || !validInt(s.unlocked, 0, 2) || !validInt(s.components, 0, COMPONENT_CAPACITY)
    || !validInt(s.manufactured, 0, 20_000_000) || !validInt(s.delivered, 0, 1_000_000)
    || !s.jobs || typeof s.jobs !== 'object' || Array.isArray(s.jobs)) return null
  const raw = s.jobs as Record<string, unknown>
  if (Object.keys(raw).sort().join(',') !== 'b,c') return null
  const jobs: Record<ExtraTrainId, FleetShipment | null> = { b: null, c: null }
  for (const id of EXTRA_TRAIN_IDS) {
    const job = raw[id]
    if (job === null) continue
    if (EXTRA_TRAIN_IDS.indexOf(id) >= s.unlocked || !job || typeof job !== 'object') return null
    const j = job as Record<string, unknown>
    if ((j.kind !== 'ore' && j.kind !== 'components') || j.from !== cargoOrigin(j.kind)
      || typeof j.destination !== 'string' || j.destination === j.from
      || !stationById(network, j.destination)
      || !validInt(j.cargo, 1, 200) || j.payout !== j.cargo * (j.kind === 'ore' ? 1 : COMPONENT_REWARD)
      || !Array.isArray(j.path) || j.path.length < 2 || j.path.length > 6
      || j.path[0] !== j.from || j.path.at(-1) !== j.destination
      || new Set(j.path).size !== j.path.length
      || !validSeconds(j.totalSeconds, 60) || !validSeconds(j.secondsRemaining, j.totalSeconds)) return null
    let length = 0
    const edges = new Set(network.links.map(l => linkKey(l.a, l.b)))
    for (let i = 1; i < j.path.length; i++) {
      const a = stationById(network, j.path[i - 1] as string)
      const b = stationById(network, j.path[i] as string)
      if (!a || !b || !edges.has(linkKey(a.id, b.id))) return null
      length += segmentLength(a, b)
    }
    if (typeof j.length !== 'number' || !Number.isFinite(j.length) || Math.abs(length - j.length) > 0.05) return null
    jobs[id] = { kind: j.kind, from: j.from, destination: j.destination, cargo: j.cargo,
      payout: j.payout as number, path: [...j.path] as string[], length,
      totalSeconds: j.totalSeconds, secondsRemaining: j.secondsRemaining }
  }
  return { version: 1, unlocked: s.unlocked as 0 | 1 | 2, jobs,
    components: s.components, manufactured: s.manufactured, delivered: s.delivered }
}
