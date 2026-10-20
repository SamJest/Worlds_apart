import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  INITIAL_MATERIALS, MATERIAL_LIMIT, FREIGHT_TIERS, advanceFreight, buildRoute,
  dispatchFreight, newFreightState, quoteRoute, quoteUpgrade, readFreightState,
  routeOwnershipId, saveFreightState, upgradeFreightYard, validateFreightState,
} from '../src/simulation/freightEconomy.ts'

const direct = { version: 1, nodes: [] }
const scenic = { version: 1, nodes: [{ id: 4, fraction: 0.5, lateralKm: 30_000, verticalKm: 0 }] }
const k = routeOwnershipId(4, direct)
const storage = () => {
  const map = new Map()
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }
}

test('new campaign begins with enough material for one lunar line', () => {
  const state = newFreightState()
  assert.equal(state.materials, INITIAL_MATERIALS)
  assert.equal(state.shipments, 0)
  assert.deepEqual(state.purchasedRoutes, [])
  assert.equal(quoteRoute(state, k, 390).shortfall, 0)
})

test('routes are distinct by duration and shape, not the selected editor marker id', () => {
  assert.notEqual(routeOwnershipId(2, direct), k)
  assert.notEqual(routeOwnershipId(4, scenic), k)
  assert.equal(routeOwnershipId(4, scenic), routeOwnershipId(4, { version: 1, nodes: [{ ...scenic.nodes[0], id: 1 }] }))
  assert.throws(() => routeOwnershipId(5, direct))
  assert.throws(() => routeOwnershipId(4, { version: 1, nodes: [{ id: 1, fraction: 4, lateralKm: 0, verticalKm: 0 }] }))
})

test('a newly constructed guideway consumes alloy exactly once', () => {
  const initial = newFreightState()
  const built = buildRoute(initial, k, 410)
  assert.equal(built.materials, 90)
  assert.deepEqual(built.purchasedRoutes, [k])
  assert.equal(quoteRoute(built, k, 410).price, 0)
  assert.strictEqual(buildRoute(built, k, 410), built, 'riding the same construction is free')
  assert.equal(initial.materials, INITIAL_MATERIALS, 'pure reducer does not mutate inputs')
})

test('insufficient alloy prevents route spending and reports exact deficit', () => {
  const state = { ...newFreightState(), materials: 12 }
  assert.equal(quoteRoute(state, k, 401).shortfall, 389)
  assert.strictEqual(buildRoute(state, k, 401), state)
  assert.throws(() => quoteRoute(state, k, 0))
  assert.throws(() => quoteRoute(state, 'invalid', 100))
})

test('dispatch moves a fixed load and awards it only once on reaching the yard', () => {
  const state = newFreightState()
  const sent = dispatchFreight(state)
  assert.equal(sent.shipment?.cargo, FREIGHT_TIERS[0].cargo)
  assert.equal(sent.shipment?.secondsRemaining, 18)
  assert.strictEqual(dispatchFreight(sent), sent, 'cannot double-dispatch')
  const underway = advanceFreight(sent, 12)
  assert.equal(underway.shipment?.secondsRemaining, 6)
  assert.equal(underway.materials, state.materials)
  const delivered = advanceFreight(underway, 6)
  assert.equal(delivered.shipment, null)
  assert.equal(delivered.materials, INITIAL_MATERIALS + 45)
  assert.equal(delivered.delivered, 45)
  assert.equal(delivered.shipments, 1)
  assert.strictEqual(advanceFreight(delivered, 100), delivered, 'no automatic repeat rewards')
  assert.equal(state.shipment, null)
})

test('paused/invalid frame times do not move a shipment', () => {
  const sent = dispatchFreight(newFreightState())
  for (const value of [0, -1, NaN, Infinity, -Infinity]) assert.strictEqual(advanceFreight(sent, value), sent)
  assert.equal(advanceFreight(sent, 100).shipments, 1)
})

test('yard level upgrades require deliveries and materials', () => {
  let state = newFreightState()
  assert.equal(quoteUpgrade(state).deliveriesNeeded, 2)
  assert.strictEqual(upgradeFreightYard(state), state)
  for (let i = 0; i < 2; i++) state = advanceFreight(dispatchFreight(state), 20)
  assert.equal(state.shipments, 2)
  assert.equal(quoteUpgrade(state).available, true)
  state = upgradeFreightYard(state)
  assert.equal(state.tier, 1)
  assert.equal(state.materials, INITIAL_MATERIALS + 90 - 110)
  assert.equal(dispatchFreight(state).shipment?.cargo, 75)
  assert.equal(dispatchFreight(state).shipment?.totalSeconds, 14)
  assert.equal(quoteUpgrade(state).deliveriesNeeded, 4)
  for (let i = 0; i < 4; i++) state = advanceFreight(dispatchFreight(state), 14)
  state = upgradeFreightYard(state)
  assert.equal(state.tier, 2)
  assert.equal(dispatchFreight(state).shipment?.cargo, 110)
  assert.strictEqual(upgradeFreightYard(state), state)
})

test('upgrade remains locked even when enough deliveries but alloy is insufficient', () => {
  const state = { ...newFreightState(), materials: 109, shipments: 3 }
  assert.equal(quoteUpgrade(state).available, false)
  assert.strictEqual(upgradeFreightYard(state), state)
})

test('save/read roundtrip preserves in-flight cargo, upgrades and purchased routes', () => {
  const savedState = dispatchFreight({ ...newFreightState(), tier: 1, purchasedRoutes: [k], materials: 123 })
  const store = storage()
  assert.equal(saveFreightState(savedState, store), true)
  assert.deepEqual(readFreightState(store), savedState)
})

test('malformed local storage falls back safely, including IO exceptions', () => {
  assert.deepEqual(readFreightState({ getItem: () => '{' }), newFreightState())
  assert.deepEqual(readFreightState({ getItem: () => { throw Error('denied') } }), newFreightState())
  assert.equal(saveFreightState(newFreightState(), { setItem: () => { throw Error('denied') } }), false)
})

test('saved data rejects unbounded numeric state and invalid cargo', () => {
  const state = newFreightState()
  assert.equal(validateFreightState({ ...state, materials: -1 }), null)
  assert.equal(validateFreightState({ ...state, materials: Infinity }), null)
  assert.equal(validateFreightState({ ...state, materials: MATERIAL_LIMIT + 1 }), null)
  assert.equal(validateFreightState({ ...state, tier: 3 }), null)
  assert.equal(validateFreightState({ ...state, purchasedRoutes: ['broken'] }), null)
  assert.equal(validateFreightState({ ...state, purchasedRoutes: [k, k] }), null)
  assert.equal(validateFreightState({ ...state, shipment: { cargo: 45, secondsRemaining: -3, totalSeconds: 18 } }), null)
  assert.equal(validateFreightState({ ...state, shipment: { cargo: 45, secondsRemaining: NaN, totalSeconds: 18 } }), null)
  assert.equal(saveFreightState({ ...state, materials: -1 }, storage()), false)
})

test('materials are capped and dispatch is disabled at storage capacity', () => {
  const state = { ...newFreightState(), materials: MATERIAL_LIMIT - 12 }
  const delivered = advanceFreight(dispatchFreight(state), 18)
  assert.equal(delivered.materials, MATERIAL_LIMIT)
  assert.equal(delivered.delivered, 12)
  assert.strictEqual(dispatchFreight(delivered), delivered)
})
