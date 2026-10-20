import test from 'node:test'
import assert from 'node:assert/strict'
import { createInitialJourneyState, updateJourney } from '../src/simulation/journeyState.ts'

const rules = { durationSeconds: 100, speeds: [1, 4, 16], initialSpeed: 1 }

test('journey begins, pauses, resumes, changes speed, and advances', () => {
  let state = createInitialJourneyState(rules)
  assert.deepEqual(state, { progress: 0, playing: false, speed: 1, begun: false })
  state = updateJourney(state, { type: 'begin' }, rules)
  assert.equal(state.playing, true)
  state = updateJourney(state, { type: 'next-speed' }, rules)
  assert.equal(state.speed, 4)
  state = updateJourney(state, { type: 'advance', elapsedSeconds: 5 }, rules)
  assert.equal(state.progress, 0.2)
  state = updateJourney(state, { type: 'pause' }, rules)
  assert.equal(updateJourney(state, { type: 'advance', elapsedSeconds: 10 }, rules), state)
  state = updateJourney(state, { type: 'resume' }, rules)
  assert.equal(state.playing, true)
})

test('seeking, completion, and restart keep state within bounds', () => {
  let state = updateJourney(createInitialJourneyState(rules), { type: 'begin' }, rules)
  state = updateJourney(state, { type: 'seek', progress: 2 }, rules)
  assert.equal(state.progress, 1)
  assert.equal(state.playing, false)
  state = updateJourney(state, { type: 'resume' }, rules)
  assert.equal(state.playing, false)
  state = updateJourney(state, { type: 'restart' }, rules)
  assert.deepEqual(state, { progress: 0, playing: true, speed: 1, begun: true })
  state = updateJourney(state, { type: 'seek', progress: -1 }, rules)
  assert.equal(state.progress, 0)
})
