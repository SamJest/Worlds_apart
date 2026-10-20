/** A deliberately small, offline-only materials economy. No simulated real-world orbital physics. */
import { validateGuidewayDesign, type GuidewayDesign } from './constructionPlan.ts'

export const FREIGHT_STORAGE_KEY = 'worlds-apart.freight.v1'
export const INITIAL_MATERIALS = 500
export const MATERIAL_LIMIT = 20_000
export const FREIGHT_TIERS = [
  { name: 'Starter shuttle', cargo: 45, seconds: 18, cost: 0, minShipments: 0 },
  { name: 'Orbital siding', cargo: 75, seconds: 14, cost: 110, minShipments: 2 },
  { name: 'Expanded sorting yard', cargo: 110, seconds: 11, cost: 230, minShipments: 6 },
] as const
export type FreightTier = 0 | 1 | 2

export interface FreightShipment {
  readonly cargo: number
  readonly secondsRemaining: number
  readonly totalSeconds: number
}
export interface FreightState {
  readonly version: 1
  readonly materials: number
  readonly tier: FreightTier
  readonly shipments: number
  readonly delivered: number
  readonly purchasedRoutes: readonly string[]
  readonly shipment: FreightShipment | null
}
export const newFreightState = (): FreightState => ({
  version: 1, materials: INITIAL_MATERIALS, tier: 0, shipments: 0,
  delivered: 0, purchasedRoutes: [], shipment: null,
})

/** IDs omit marker IDs: identical track geometry has the same ownership even after re-editing. */
export function routeOwnershipId(days: number, draft: GuidewayDesign): string {
  const design = validateGuidewayDesign(draft)
  if (!design || ![2, 4, 6].includes(days)) throw new Error('Cannot price an invalid route.')
  return `${days}d:${design.nodes.map(({ fraction, lateralKm, verticalKm }) => `${fraction.toFixed(4)},${lateralKm},${verticalKm}`).join(';')}`
}

export interface RouteCost { readonly alreadyBuilt: boolean; readonly price: number; readonly shortfall: number; readonly available: number }
export function quoteRoute(state: FreightState, routeId: string, railUnits: number): RouteCost {
  if (!Number.isSafeInteger(railUnits) || railUnits < 1 || railUnits > 2_000 || !/^[246]d:(?:[0-9.,;\-]*)$/.test(routeId)) {
    throw new Error('Invalid construction quote.')
  }
  const alreadyBuilt = state.purchasedRoutes.includes(routeId)
  const price = alreadyBuilt ? 0 : railUnits
  return { alreadyBuilt, price, shortfall: Math.max(0, price - state.materials), available: state.materials }
}

export function buildRoute(state: FreightState, routeId: string, railUnits: number): FreightState {
  const quote = quoteRoute(state, routeId, railUnits)
  if (quote.shortfall || quote.alreadyBuilt) return state
  return { ...state, materials: state.materials - quote.price, purchasedRoutes: [...state.purchasedRoutes, routeId] }
}

/** Optional payload and route distance are supplied by the built local railway. The legacy
 * call without options retains the original two-depot service and saved-state compatibility. */
export function dispatchFreight(state: FreightState, options?: { cargo: number; routeLength: number }): FreightState {
  if (state.shipment || state.materials >= MATERIAL_LIMIT) return state
  const tier = FREIGHT_TIERS[state.tier]
  const cargo = options?.cargo ?? tier.cargo
  if (!Number.isSafeInteger(cargo) || cargo < 1 || cargo > tier.cargo || (options && cargo > MATERIAL_LIMIT - state.materials)) return state
  if (options && (!Number.isFinite(options.routeLength) || options.routeLength < 38 || options.routeLength > 3000)) return state
  const seconds = options ? Math.min(60, Math.max(6, Math.round(tier.seconds * options.routeLength / 328))) : tier.seconds
  return { ...state, shipment: { cargo, secondsRemaining: seconds, totalSeconds: seconds } }
}

/** Advances only while the app is open. Pauses when the tab is hidden; no wall-clock catch-up. */
export function advanceFreight(state: FreightState, elapsedSeconds: number): FreightState {
  if (!state.shipment || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return state
  const secondsRemaining = Math.max(0, state.shipment.secondsRemaining - elapsedSeconds)
  if (secondsRemaining > 0) return { ...state, shipment: { ...state.shipment, secondsRemaining } }
  const credited = Math.min(state.shipment.cargo, MATERIAL_LIMIT - state.materials)
  return {
    ...state, shipment: null, materials: state.materials + credited,
    delivered: state.delivered + credited, shipments: state.shipments + 1,
  }
}

export interface UpgradeQuote { readonly available: boolean; readonly cost: number; readonly deliveriesNeeded: number; readonly nextTier: FreightTier | null }
export function quoteUpgrade(state: FreightState): UpgradeQuote {
  if (state.tier === 2) return { available: false, cost: 0, deliveriesNeeded: 0, nextTier: null }
  const nextTier = (state.tier + 1) as FreightTier
  const next = FREIGHT_TIERS[nextTier]
  const deliveriesNeeded = Math.max(0, next.minShipments - state.shipments)
  return { available: deliveriesNeeded === 0 && state.materials >= next.cost, cost: next.cost, deliveriesNeeded, nextTier }
}

export function upgradeFreightYard(state: FreightState): FreightState {
  const quote = quoteUpgrade(state)
  if (!quote.available || quote.nextTier === null) return state
  return { ...state, materials: state.materials - quote.cost, tier: quote.nextTier }
}

function validInt(value: unknown, low: number, high: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= low && value <= high
}

/** Fail closed on corrupt local saves and reject unbounded/NaN storage payloads. */
export function validateFreightState(input: unknown): FreightState | null {
  if (!input || typeof input !== 'object') return null
  const source = input as Record<string, unknown>
  if (source.version !== 1 || !validInt(source.materials, 0, MATERIAL_LIMIT)
    || !validInt(source.tier, 0, 2) || !validInt(source.shipments, 0, 1_000_000)
    || !validInt(source.delivered, 0, 20_000_000)
    || !Array.isArray(source.purchasedRoutes) || source.purchasedRoutes.length > 500
    || !source.purchasedRoutes.every(value => typeof value === 'string' && value.length <= 120 && /^[246]d:[0-9.,;\-]*$/.test(value))
    || new Set(source.purchasedRoutes).size !== source.purchasedRoutes.length) return null
  let shipment: FreightShipment | null = null
  if (source.shipment !== null) {
    if (!source.shipment || typeof source.shipment !== 'object') return null
    const s = source.shipment as Record<string, unknown>
    if (!validInt(s.cargo, 1, 200) || typeof s.secondsRemaining !== 'number' || !Number.isFinite(s.secondsRemaining)
      || typeof s.totalSeconds !== 'number' || !Number.isFinite(s.totalSeconds)
      || s.totalSeconds < 1 || s.totalSeconds > 60 || s.secondsRemaining <= 0 || s.secondsRemaining > s.totalSeconds) return null
    shipment = { cargo: s.cargo, totalSeconds: s.totalSeconds, secondsRemaining: s.secondsRemaining }
  }
  return {
    version: 1, materials: source.materials, tier: source.tier as FreightTier,
    shipments: source.shipments, delivered: source.delivered,
    purchasedRoutes: [...source.purchasedRoutes], shipment,
  }
}

export function readFreightState(storage?: Pick<Storage, 'getItem'>): FreightState {
  try {
    const store = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage)
    const data = store?.getItem(FREIGHT_STORAGE_KEY)
    return data ? validateFreightState(JSON.parse(data)) ?? newFreightState() : newFreightState()
  } catch { return newFreightState() }
}

export function saveFreightState(state: FreightState, storage?: Pick<Storage, 'setItem'>): boolean {
  const valid = validateFreightState(state)
  if (!valid) return false
  try {
    const store = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage)
    if (!store) return false
    store.setItem(FREIGHT_STORAGE_KEY, JSON.stringify(valid))
    return true
  } catch { return false }
}
