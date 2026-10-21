/** Portable player-designed guideway specification. No Three.js objects are saved. */
export interface GuidewayNode {
  id: number
  fraction: number // ordered position on reference route (not a time fraction)
  lateralKm: number // signed displacement in the lunar orbital plane
  verticalKm: number // displacement normal to the lunar orbital plane
}
export type RideProfile = 'classic' | 'corkscrew' | 'wave' | 'slalom' | 'dive'
export interface GuidewayDesign { version: 1; nodes: GuidewayNode[]; profile?: RideProfile }

export const GUIDEWAY_STORAGE_KEY = 'worlds-apart.guideway.v1'
export const MAX_GUIDEWAY_NODES = 3
export const MAX_LATERAL_KM = 85000
export const MAX_VERTICAL_KM = 60000
const MIN_FRACTION_SPACING = 0.12

export const defaultGuidewayDesign = (): GuidewayDesign => ({
  version: 1, nodes: [{ id: 1, fraction: 0.5, lateralKm: 0, verticalKm: 0 }],
})

/** A gap's midpoint is the most useful location for another construction anchor. */
export function addGuidewayNode(design: GuidewayDesign): GuidewayDesign {
  if (design.nodes.length >= MAX_GUIDEWAY_NODES) return design
  const sorted = [...design.nodes].sort((a, b) => a.fraction - b.fraction)
  const stops = [0.16, ...sorted.map(node => node.fraction), 0.84]
  let largestGap = 0, insertAt = 0.5
  for (let i = 1; i < stops.length; i++) {
    const gap = stops[i] - stops[i - 1]
    if (gap > largestGap) { largestGap = gap; insertAt = (stops[i] + stops[i - 1]) / 2 }
  }
  const id = Math.max(0, ...sorted.map(node => node.id)) + 1
  return { ...design, nodes: [...sorted, { id, fraction: insertAt, lateralKm: 0, verticalKm: 0 }].sort((a, b) => a.fraction - b.fraction) }
}

export function removeGuidewayNode(design: GuidewayDesign, id: number): GuidewayDesign {
  return { ...design, nodes: design.nodes.filter(node => node.id !== id) }
}

export function updateGuidewayNode(design: GuidewayDesign, id: number, changes: Partial<Pick<GuidewayNode, 'lateralKm' | 'verticalKm'>>): GuidewayDesign {
  return { ...design, nodes: design.nodes.map(node => node.id !== id ? node : {
    ...node,
    lateralKm: clamp(changes.lateralKm ?? node.lateralKm, -MAX_LATERAL_KM, MAX_LATERAL_KM),
    verticalKm: clamp(changes.verticalKm ?? node.verticalKm, -MAX_VERTICAL_KM, MAX_VERTICAL_KM),
  }) }
}

export type RidePreset = 'direct' | 'arc' | 'high' | 'corkscrew' | 'wave' | 'slalom' | 'dive'
export function applyGuidewayPreset(preset: RidePreset): GuidewayDesign {
  if (preset === 'corkscrew' || preset === 'wave' || preset === 'slalom' || preset === 'dive') return { version: 1, profile: preset, nodes: [] }
  if (preset === 'direct') return { version: 1, nodes: [] }
  if (preset === 'arc') return { version: 1, nodes: [
    { id: 1, fraction: 0.32, lateralKm: 30000, verticalKm: 0 },
    { id: 2, fraction: 0.66, lateralKm: 46000, verticalKm: 0 },
  ] }
  return { version: 1, nodes: [
    { id: 1, fraction: 0.34, lateralKm: 0, verticalKm: 40000 },
    { id: 2, fraction: 0.68, lateralKm: 0, verticalKm: 40000 },
  ] }
}

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)) }

/** Fail closed on malformed/corrupt/old saves. Ignore extra properties. */
export function validateGuidewayDesign(value: unknown): GuidewayDesign | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  if (source.version !== 1 || !Array.isArray(source.nodes) || source.nodes.length > MAX_GUIDEWAY_NODES) return null
  if (source.profile !== undefined && !['classic', 'corkscrew', 'wave', 'slalom', 'dive'].includes(source.profile as string)) return null
  const ids = new Set<number>()
  const nodes: GuidewayNode[] = []
  for (const item of source.nodes) {
    if (!item || typeof item !== 'object') return null
    const node = item as Record<string, unknown>
    const { id, fraction, lateralKm, verticalKm } = node
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 1 || id > 999 || ids.has(id)
      || typeof fraction !== 'number' || !Number.isFinite(fraction) || fraction < 0.16 || fraction > 0.84
      || typeof lateralKm !== 'number' || !Number.isFinite(lateralKm) || Math.abs(lateralKm) > MAX_LATERAL_KM
      || typeof verticalKm !== 'number' || !Number.isFinite(verticalKm) || Math.abs(verticalKm) > MAX_VERTICAL_KM) return null
    ids.add(id)
    nodes.push({ id, fraction, lateralKm, verticalKm })
  }
  nodes.sort((a, b) => a.fraction - b.fraction)
  if (nodes.some((node, i) => i && node.fraction - nodes[i - 1].fraction < MIN_FRACTION_SPACING)) return null
  return { version: 1, nodes, ...(source.profile ? { profile: source.profile as RideProfile } : {}) }
}

export function readGuidewayDesign(storage?: Pick<Storage, 'getItem'>): GuidewayDesign {
  try {
    const store = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage)
    const value = store?.getItem(GUIDEWAY_STORAGE_KEY)
    return value ? validateGuidewayDesign(JSON.parse(value)) ?? defaultGuidewayDesign() : defaultGuidewayDesign()
  } catch { return defaultGuidewayDesign() }
}

export function saveGuidewayDesign(design: GuidewayDesign, storage?: Pick<Storage, 'setItem'>): boolean {
  const valid = validateGuidewayDesign(design)
  if (!valid) return false
  try {
    const store = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage)
    if (!store) return false
    store.setItem(GUIDEWAY_STORAGE_KEY, JSON.stringify(valid))
    return true
  } catch { return false }
}
