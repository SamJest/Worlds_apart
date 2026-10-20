import test from 'node:test'
import assert from 'node:assert/strict'
import { AudioEngine } from '../src/audio/audioEngine.ts'
import { defaultViewPreferences } from '../src/ui/viewPreferences.ts'

class FakeAudioParameter {
  value = 0
  setTargetAtTime(value) { this.value = value }
  setValueAtTime(value) { this.value = value }
  exponentialRampToValueAtTime(value) { this.value = value }
}
class FakeNode {
  connect() {}
  disconnect() {}
}
class FakeGain extends FakeNode { gain = new FakeAudioParameter() }
class FakeOscillator extends FakeNode {
  frequency = new FakeAudioParameter()
  type = 'sine'
  onended = null
  start() {}
  stop() { this.onended?.() }
}
let contexts = 0
class FakeAudioContext {
  destination = new FakeNode()
  currentTime = 3
  closed = false
  lastGain
  constructor() { contexts++ }
  createGain() { return (this.lastGain = new FakeGain()) }
  createOscillator() { return new FakeOscillator() }
  resume() { return Promise.resolve() }
  close() { this.closed = true; return Promise.resolve() }
}

test('Web Audio is never instantiated before an interaction', () => {
  contexts = 0
  globalThis.window = { AudioContext: FakeAudioContext }
  const audio = new AudioEngine()
  audio.update(defaultViewPreferences(), true, 0, 'DEPARTURE')
  assert.equal(contexts, 0)
  audio.start(defaultViewPreferences())
  assert.equal(contexts, 1)
  audio.start(defaultViewPreferences())
  assert.equal(contexts, 1)
  audio.update(defaultViewPreferences(), true, .1, 'EARTH ASCENT')
  audio.cue('arrival', .5)
  audio.dispose()
})

test('muting and absent audio capability are both safe', () => {
  globalThis.window = {}
  const audio = new AudioEngine()
  assert.doesNotThrow(() => audio.start(defaultViewPreferences()))
  audio.update({ ...defaultViewPreferences(), soundEnabled: false }, true, 0.5, 'OPEN SPACE')
  assert.doesNotThrow(() => audio.dispose())
})
