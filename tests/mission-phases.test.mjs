import test from 'node:test'
import assert from 'node:assert/strict'
import { MISSION_PHASES, missionPhaseAt, remainingRideSeconds, formatRideTime } from '../src/simulation/missionPhases.ts'

test('phases are ordered, cover departure to arrival, and tolerate timeline seek', () => {
  assert.equal(MISSION_PHASES[0].start, 0)
  assert.equal(MISSION_PHASES.at(-1).id, 'arrival')
  assert.ok(MISSION_PHASES.every((phase, i) => i === 0 || phase.start > MISSION_PHASES[i - 1].start))
  assert.equal(missionPhaseAt(0).id, 'departure')
  assert.equal(missionPhaseAt(0.5).id, 'transit')
  assert.equal(missionPhaseAt(0.9).id, 'approach')
  assert.equal(missionPhaseAt(1).id, 'arrival')
  assert.equal(missionPhaseAt(0.1).id, 'ascent')
  assert.equal(missionPhaseAt(Number.NaN).id, 'departure')
})

test('countdown respects selected ride speed and clamps endpoints', () => {
  assert.equal(remainingRideSeconds(0, 180, 1), 180)
  assert.equal(remainingRideSeconds(0.5, 180, 4), 23)
  assert.equal(remainingRideSeconds(1, 180, 16), 0)
  assert.equal(remainingRideSeconds(2, 180, 16), 0)
  assert.equal(remainingRideSeconds(-1, 180, 1), 180)
  assert.equal(formatRideTime(83), '1:23')
  assert.equal(formatRideTime(0), '0:00')
})
