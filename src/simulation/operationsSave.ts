/** Single-key operations snapshots prevent partially updated multi-train cargo credits.
 * Old v1 network/freight keys are used only for first-time migration. */
import { readFreightState, validateFreightState } from './freightEconomy.ts'
import { readLocalNetwork, validateLocalNetwork } from './localRailNetwork.ts'
import { FLEET_STORAGE_KEY, initialFleetState, validateFleetState, type OperationsState } from './fleetOperations.ts'

export function validateOperationsState(input: unknown): OperationsState | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  if (raw.version !== 2) return null
  const freight = validateFreightState(raw.freight)
  const network = validateLocalNetwork(raw.network)
  if (!freight || !network) return null
  const fleet = validateFleetState(raw.fleet, network)
  if (!fleet) return null
  // Legacy main train's freight/network halves always agree in an operations snapshot.
  if (!!freight.shipment !== !!network.activePath) return null
  return { freight, network, fleet }
}
export function readOperationsState(store?: Pick<Storage, 'getItem'>): OperationsState {
  const legacy = (): OperationsState => ({
    freight: readFreightState(store), network: readLocalNetwork(store), fleet: initialFleetState(),
  })
  try {
    const storage = store ?? (typeof localStorage === 'undefined' ? null : localStorage)
    const data = storage?.getItem(FLEET_STORAGE_KEY)
    if (!data) return legacy()
    return validateOperationsState(JSON.parse(data)) ?? legacy()
  } catch { return legacy() }
}
export function saveOperationsState(state: OperationsState, store?: Pick<Storage, 'setItem'>): boolean {
  const valid = validateOperationsState({ version: 2, ...state })
  if (!valid) return false
  try {
    const storage = store ?? (typeof localStorage === 'undefined' ? null : localStorage)
    if (!storage) return false
    storage.setItem(FLEET_STORAGE_KEY, JSON.stringify({ version: 2, ...valid }))
    return true
  } catch { return false }
}
