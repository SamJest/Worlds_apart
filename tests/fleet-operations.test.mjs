import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialLocalNetwork, addStation, addLink, shortestRailPathBetween } from '../src/simulation/localRailNetwork.ts'
import { newFreightState, MATERIAL_LIMIT } from '../src/simulation/freightEconomy.ts'
import { advanceExtraTrains, COMPONENT_BATCH_ALLOY, COMPONENT_BATCH_SIZE, COMPONENT_CAPACITY,
  dispatchExtraTrain, dispatchQuote, initialFleetState, manufactureComponents, TRAIN_PURCHASE_COST,
  unlockNextTrain, validateFleetState } from '../src/simulation/fleetOperations.ts'
import { readOperationsState, saveOperationsState, validateOperationsState } from '../src/simulation/operationsSave.ts'

function base() { return { freight: newFreightState(), network: initialLocalNetwork(), fleet: initialFleetState() } }
function unlocked() {
  let state = base()
  const result = unlockNextTrain(state.fleet, state.freight)
  assert.ok(result)
  return { ...state, ...result }
}
const memory = () => {
  const map = new Map()
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), map }
}
test('separate station-to-station routing supports reverse journeys and intermediate junctions', () => {
  let n = initialLocalNetwork()
  assert.deepEqual(shortestRailPathBetween(n, 's1', 's0').stops, ['s1', 's0'])
  assert.equal(shortestRailPathBetween(n, 's1', 's1'), null)
  assert.equal(shortestRailPathBetween(n, 'bad', 's0'), null)
  n = addStation(n, 260, 75)
  assert.equal(shortestRailPathBetween(n, 's2', 's0'), null)
  n = addLink(n, 's2', 's1')
  assert.deepEqual(shortestRailPathBetween(n, 's2', 's0').stops, ['s2', 's1', 's0'])
})
test('train B costs alloy, train C cannot be bought before B, and limits are enforced', () => {
  const s = base()
  assert.equal(s.fleet.unlocked, 0)
  assert.equal(dispatchExtraTrain(s, 'b', 'ore', 's1'), null)
  const b = unlockNextTrain(s.fleet, s.freight)
  assert.equal(b.fleet.unlocked, 1)
  assert.equal(b.freight.materials, 500 - TRAIN_PURCHASE_COST[0])
  const c = unlockNextTrain(b.fleet, b.freight)
  assert.equal(c.fleet.unlocked, 2)
  assert.equal(c.freight.materials, 500 - TRAIN_PURCHASE_COST[0] - TRAIN_PURCHASE_COST[1])
  assert.equal(unlockNextTrain(c.fleet, c.freight), null)
  assert.equal(unlockNextTrain(s.fleet, { ...s.freight, materials: 1 }), null)
})
test('ore train occupies only its own slot and uses bounded Earth supply', () => {
  const state = unlocked()
  const sent = dispatchExtraTrain(state, 'b', 'ore', 's1')
  assert.ok(sent)
  assert.equal(sent.network.ore, 205)
  assert.equal(sent.fleet.jobs.b.payout, 45)
  assert.equal(sent.freight.materials, state.freight.materials)
  assert.equal(dispatchExtraTrain(sent, 'b', 'ore', 's1'), null)
  assert.equal(dispatchExtraTrain(sent, 'c', 'ore', 's1'), null)
  assert.equal(dispatchExtraTrain(sent, 'b', 'ore', 's0'), null)
  assert.deepEqual(sent.fleet.jobs.b.path, ['s0', 's1'])
})
test('two independently moving trains can run concurrently and credit only once', () => {
  let s = unlocked()
  const second = unlockNextTrain(s.fleet, s.freight)
  s = { ...s, ...second }
  s = dispatchExtraTrain(s, 'b', 'ore', 's1')
  s = dispatchExtraTrain(s, 'c', 'ore', 's1')
  assert.equal(s.network.ore, 160)
  assert.ok(s.fleet.jobs.b && s.fleet.jobs.c)
  const initialBalance = s.freight.materials
  let frame = s
  for (let i = 0; i < 20; i++) frame = advanceExtraTrains(frame, 1)
  assert.equal(frame.fleet.jobs.b, null)
  assert.equal(frame.fleet.jobs.c, null)
  assert.equal(frame.freight.shipments, 2)
  assert.equal(frame.fleet.delivered, 2)
  assert.equal(frame.freight.materials, initialBalance + 90)
  assert.strictEqual(advanceExtraTrains(frame, 5), frame)
})
test('workshop converts alloy to deliverable components with a net-positive completed delivery', () => {
  let state = unlocked()
  const made = manufactureComponents(state.fleet, state.freight)
  assert.equal(made.fleet.components, COMPONENT_BATCH_SIZE)
  assert.equal(made.freight.materials, state.freight.materials - COMPONENT_BATCH_ALLOY)
  state = { ...state, ...made }
  state = dispatchExtraTrain(state, 'b', 'components', 's0')
  assert.equal(state.fleet.components, 0)
  assert.equal(state.fleet.jobs.b.from, 's1')
  assert.equal(state.fleet.jobs.b.destination, 's0')
  assert.equal(state.fleet.jobs.b.payout, COMPONENT_BATCH_SIZE * 2)
  for (let i = 0; i < 20; i++) state = advanceExtraTrains(state, 1)
  assert.equal(state.freight.materials, 500 - TRAIN_PURCHASE_COST[0] - COMPONENT_BATCH_ALLOY + COMPONENT_BATCH_SIZE * 2)
})
test('workshop caps stock and forbids manufacturing without funds', () => {
  const s = base()
  assert.equal(manufactureComponents(s.fleet, { ...s.freight, materials: 0 }), null)
  assert.equal(manufactureComponents({ ...s.fleet, components: COMPONENT_CAPACITY }, s.freight), null)
  assert.ok(manufactureComponents(s.fleet, s.freight))
})
test('invalid paths, target source and disconnected outposts are rejected', () => {
  let s = unlocked()
  s = { ...s, network: addStation(s.network, 250, 65) }
  assert.equal(dispatchExtraTrain(s, 'b', 'ore', 's2'), null)
  assert.equal(dispatchExtraTrain(s, 'b', 'components', 's1'), null)
  s = { ...s, network: addLink(s.network, 's1', 's2') }
  assert.deepEqual(dispatchQuote(s.fleet, s.freight, s.network, 'b', 'ore', 's2').path.stops, ['s0', 's1', 's2'])
  assert.deepEqual(dispatchQuote(s.fleet, s.freight, s.network, 'b', 'components', 's2'), null, 'no components available')
})
test('inventory cap limits payload and no credit exceeds material limit', () => {
  const s = unlocked()
  const nearCap = { ...s, freight: { ...s.freight, materials: MATERIAL_LIMIT - 3 } }
  const quote = dispatchQuote(nearCap.fleet, nearCap.freight, nearCap.network, 'b', 'ore', 's1')
  assert.equal(quote.cargo, 3)
  let sent = dispatchExtraTrain(nearCap, 'b', 'ore', 's1')
  for (let i = 0; i < 20; i++) sent = advanceExtraTrains(sent, 1)
  assert.equal(sent.freight.materials, MATERIAL_LIMIT)
  assert.equal(dispatchExtraTrain(sent, 'b', 'ore', 's1'), null)
})
test('frame progression ignores invalid and negative time, and caps single frames', () => {
  const s = dispatchExtraTrain(unlocked(), 'b', 'ore', 's1')
  assert.strictEqual(advanceExtraTrains(s, NaN), s)
  assert.strictEqual(advanceExtraTrains(s, -1), s)
  assert.equal(advanceExtraTrains(s, 1e9).fleet.jobs.b.secondsRemaining, s.fleet.jobs.b.totalSeconds - 1)
})
test('valid in-flight fleet saves round-trip with all goods, routes, and inventory', () => {
  let s = unlocked()
  const m = manufactureComponents(s.fleet, s.freight)
  s = { ...s, ...m }
  s = dispatchExtraTrain(s, 'b', 'components', 's0')
  const store = memory()
  assert.equal(saveOperationsState(s, store), true)
  assert.deepEqual(readOperationsState(store), s)
})
test('old v1 snapshots migrate; corrupt v2 snapshots are rejected safely', () => {
  const store = memory()
  store.setItem('worlds-apart.freight.v1', JSON.stringify(newFreightState()))
  store.setItem('worlds-apart.local-network.v1', JSON.stringify(initialLocalNetwork()))
  assert.deepEqual(readOperationsState(store), base())
  const s = unlocked()
  assert.equal(saveOperationsState(s, store), true)
  const wrong = { version: 2, ...s, fleet: { ...s.fleet, jobs: { b: { bad: true }, c: null } } }
  assert.equal(validateOperationsState(wrong), null)
  store.setItem('worlds-apart.operations.v2', JSON.stringify(wrong))
  assert.deepEqual(readOperationsState(store), base())
})
test('forged payouts, invented tracks, wrong origins and overflow values are rejected', () => {
  let s = dispatchExtraTrain(unlocked(), 'b', 'ore', 's1')
  assert.deepEqual(validateFleetState(s.fleet, s.network), s.fleet)
  for (const job of [
    { ...s.fleet.jobs.b, payout: 2_000_000 },
    { ...s.fleet.jobs.b, path: ['s0', 's3'] },
    { ...s.fleet.jobs.b, from: 's1' },
    { ...s.fleet.jobs.b, secondsRemaining: 0 },
    { ...s.fleet.jobs.b, length: NaN },
  ]) assert.equal(validateFleetState({ ...s.fleet, jobs: { b: job, c: null } }, s.network), null)
  assert.equal(validateFleetState({ ...s.fleet, components: 999 }, s.network), null)
  assert.equal(saveOperationsState({ ...s, fleet: { ...s.fleet, components: Infinity } }, memory()), false)
})
test('slot ownership and validation prevent forged job in locked train', () => {
  let s = dispatchExtraTrain(unlocked(), 'b', 'ore', 's1')
  assert.equal(validateFleetState({ ...s.fleet, jobs: { b: null, c: s.fleet.jobs.b } }, s.network), null)
  assert.equal(validateFleetState({ ...s.fleet, unlocked: 3 }, s.network), null)
})

test('active train protects its rail segment from demolition; completed journeys release it', async () => {
  const { removeLink } = await import('../src/simulation/localRailNetwork.ts')
  let s = dispatchExtraTrain(unlocked(), 'b', 'ore', 's1')
  assert.equal(removeLink(s.network, 's0', 's1', [s.fleet.jobs.b.path]), null)
  for (let i = 0; i < 20; i++) s = advanceExtraTrains(s, 1)
  const cleared = removeLink(s.network, 's0', 's1')
  assert.deepEqual(cleared.links, [])
  assert.equal(shortestRailPathBetween(cleared, 's0', 's1'), null)
})
test('stations require disconnection before demolition; core depots cannot be removed', async () => {
  const { removeLink, removeStation, selectDestination } = await import('../src/simulation/localRailNetwork.ts')
  let n = addStation(initialLocalNetwork(), 250, 80)
  n = addLink(n, 's0', 's2')
  assert.equal(removeStation(n, 's2'), null)
  assert.equal(removeStation(n, 's0'), null)
  assert.equal(removeStation(n, 's1'), null)
  n = selectDestination(n, 's2')
  n = removeLink(n, 's0', 's2')
  assert.equal(removeLink(n, 's0', 's2'), null)
  n = removeStation(n, 's2')
  assert.equal(n.stations.length, 2)
  assert.equal(n.destination, 's1')
  assert.equal(n.nextStation, 3)
})
test('unknown train IDs cannot bypass locked fleet permissions', () => {
  const s = base()
  assert.equal(dispatchExtraTrain(s, 'x', 'ore', 's1'), null)
  assert.equal(dispatchQuote(s.fleet, s.freight, s.network, 'x', 'ore', 's1'), null)
})
