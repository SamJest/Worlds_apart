import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addLink, addStation, advanceNetworkProduction, beginNetworkShipment, completeNetworkShipment,
  initialLocalNetwork, linkCost, LOCAL_NETWORK_STORAGE_KEY, MAX_LINKS, MAX_STATIONS,
  ORE_CAPACITY, proposeStation, readLocalNetwork, saveLocalNetwork, segmentLength,
  selectDestination, shortestRailPath, stationById, validateLocalNetwork } from '../src/simulation/localRailNetwork.ts'
import { advanceFreight, dispatchFreight, newFreightState, FREIGHT_TIERS, MATERIAL_LIMIT } from '../src/simulation/freightEconomy.ts'

const memory = () => {
  const map = new Map()
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), map }
}
test('legacy Earth Depot and Orbital Yard are connected by one valid railway', () => {
  const base = initialLocalNetwork()
  assert.deepEqual(validateLocalNetwork(base), base)
  assert.equal(base.stations.length, 2)
  assert.equal(base.links.length, 1)
  assert.deepEqual(shortestRailPath(base).stops, ['s0', 's1'])
  assert.equal(shortestRailPath(base).length, 328)
})
test('player can place four extra stations with bounded positions and no overlap', () => {
  let network = initialLocalNetwork()
  assert.equal(proposeStation(network, 93, 145), null)
  assert.equal(proposeStation(network, 10, 10), null)
  assert.equal(proposeStation(network, NaN, 90), null)
  assert.equal(addStation(network, 125, 150), null)
  for (const [x, y] of [[80, 52], [180, 100], [295, 200], [445, 66]]) {
    network = addStation(network, x, y)
    assert.ok(network)
  }
  assert.equal(network.stations.length, MAX_STATIONS)
  assert.equal(addStation(network, 470, 230), null)
  assert.equal(validateLocalNetwork(network)?.stations.length, 6)
})
test('links respect limits, valid station IDs and uniqueness regardless of direction', () => {
  const network = addStation(initialLocalNetwork(), 240, 80)
  assert.equal(addLink(network, 's0', 's0'), null)
  assert.equal(addLink(network, 's0', 's9'), null)
  assert.equal(addLink(network, 's1', 's0'), null)
  const updated = addLink(network, 's0', 's2')
  assert.equal(updated.links.length, 2)
  assert.equal(addLink(updated, 's2', 's0'), null)
  assert.equal(validateLocalNetwork({ ...updated, links: [...updated.links, { a: 's2', b: 's0' }] }), null)
  assert.equal(addLink({ ...updated, links: Array.from({ length: MAX_LINKS }, (_, i) => ({ a: 's0', b: 's2' })) }, 's2', 's1'), null)
})
test('stations and track require different material budgets', () => {
  const net = addStation(initialLocalNetwork(), 240, 80)
  assert.ok(linkCost(stationById(net, 's0'), stationById(net, 's2')) >= 12)
  assert.equal(linkCost(stationById(net, 's0'), stationById(net, 's2')),
    Math.ceil(segmentLength(stationById(net, 's0'), stationById(net, 's2')) / 9))
})
test('Dijkstra chooses connected shortest path, not direct straight lines across unbuilt space', () => {
  let net = addStation(initialLocalNetwork(), 240, 80)
  net = selectDestination(net, 's2')
  assert.equal(shortestRailPath(net), null)
  net = addLink(net, 's0', 's2')
  assert.deepEqual(shortestRailPath(net).stops, ['s0', 's2'])
  net = addLink(net, 's2', 's1')
  assert.deepEqual(shortestRailPath(net, 's1').stops, ['s0', 's1'], 'direct existing edge is shortest')
  net = { ...net, links: net.links.filter(e => !(e.a === 's0' && e.b === 's1')) }
  assert.deepEqual(shortestRailPath(net, 's1').stops, ['s0', 's2', 's1'])
  assert.ok(shortestRailPath(net, 's1').length > 328)
  assert.deepEqual(validateLocalNetwork(net)?.links.length, 2)
})
test('new destinations can be selected but not source or unknown station', () => {
  const base = initialLocalNetwork()
  assert.strictEqual(selectDestination(base, 's0'), base)
  assert.strictEqual(selectDestination(base, 'missing'), base)
  assert.equal(selectDestination(addStation(base, 260, 80), 's2').destination, 's2')
})
test('loading ore creates a path snapshot and subtracts finite local supply', () => {
  const base = initialLocalNetwork()
  const path = shortestRailPath(base)
  const dispatched = beginNetworkShipment(base, path, 45)
  assert.equal(dispatched.ore, 205)
  assert.deepEqual(dispatched.activePath.stops, ['s0', 's1'])
  assert.equal(beginNetworkShipment(dispatched, path, 45), null, 'one train only')
  assert.equal(beginNetworkShipment(base, path, 251), null, 'cannot dispatch unsupplied cargo')
  assert.equal(beginNetworkShipment(base, { stops: ['s0','s2'], length: 10 }, 12), null, 'forged path')
  const complete = completeNetworkShipment(dispatched)
  assert.equal(complete.activePath, null)
  assert.equal(complete.ore, 205)
  assert.strictEqual(completeNetworkShipment(complete), complete)
})
test('ore production is gradual, strictly capped and ignores out-of-range intervals', () => {
  const empty = { ...initialLocalNetwork(), ore: 0 }
  assert.equal(advanceNetworkProduction(empty, .5).ore, 2)
  assert.equal(advanceNetworkProduction(empty, Infinity).ore, 0)
  assert.equal(advanceNetworkProduction(empty, 999).ore, 0)
  assert.equal(advanceNetworkProduction({ ...empty, ore: 249 }, 1).ore, ORE_CAPACITY)
  const full = initialLocalNetwork()
  assert.strictEqual(advanceNetworkProduction(full, 1), full, 'no changes if already full')
})
test('network freight uses existing shipment model and later credits exactly once', () => {
  const network = initialLocalNetwork()
  const path = shortestRailPath(network)
  const original = newFreightState()
  const next = dispatchFreight(original, { cargo: 27, routeLength: path.length })
  assert.equal(next.shipment.cargo, 27)
  assert.equal(next.shipment.totalSeconds, FREIGHT_TIERS[0].seconds)
  const delivered = advanceFreight(next, next.shipment.totalSeconds)
  assert.equal(delivered.materials, original.materials + 27)
  assert.equal(delivered.shipments, 1)
  assert.strictEqual(advanceFreight(delivered, 999), delivered)
  const longer = dispatchFreight(original, { cargo: 27, routeLength: 600 })
  assert.ok(longer.shipment.totalSeconds > next.shipment.totalSeconds)
  assert.strictEqual(dispatchFreight({ ...original, materials: MATERIAL_LIMIT - 5 }, { cargo: 27, routeLength: 328 }).shipment, null)
})
test('valid persisted network survives restore with destination, links, in-flight path and ore', () => {
  const store = memory()
  let network = addStation(initialLocalNetwork(), 265, 70)
  network = addLink(network, 's0', 's2')
  network = selectDestination(network, 's2')
  network = beginNetworkShipment(network, shortestRailPath(network), 33)
  assert.equal(saveLocalNetwork(network, store), true)
  assert.ok(store.map.has(LOCAL_NETWORK_STORAGE_KEY))
  assert.deepEqual(readLocalNetwork(store), network)
})
test('corrupt JSON, forged edges, impossible ore and duplicated IDs fail safely', () => {
  const store = memory()
  store.setItem(LOCAL_NETWORK_STORAGE_KEY, '{broken')
  assert.deepEqual(readLocalNetwork(store), initialLocalNetwork())
  const base = initialLocalNetwork()
  for (const invalid of [
    { ...base, ore: -4 }, { ...base, ore: Infinity },
    { ...base, stations: [...base.stations, base.stations[0]] },
    { ...base, links: [...base.links, { a: 's0', b: 's9' }] },
    { ...base, destination: 'unknown' },
    { ...base, activePath: { stops: ['s0', 's1'], length: 12, destination: 's1' } },
    { ...base, nextStation: 1 },
  ]) {
    assert.equal(validateLocalNetwork(invalid), null)
    assert.equal(saveLocalNetwork(invalid, store), false)
  }
  assert.equal(saveLocalNetwork(base, { setItem() { throw new Error('blocked') } }), false)
  assert.deepEqual(readLocalNetwork({ getItem() { throw new Error('denied') } }), base)
})
