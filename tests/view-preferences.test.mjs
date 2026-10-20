import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultViewPreferences, readViewPreferences, saveViewPreferences } from '../src/ui/viewPreferences.ts'

const store = new Map()
globalThis.window = {
  matchMedia: () => ({ matches: true }),
  localStorage: {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  },
}

test('system reduced-motion default, safe storage and persistent options', () => {
  store.clear()
  assert.deepEqual(readViewPreferences(), { ...defaultViewPreferences(true) })
  const selected = { reducedMotion: false, highContrast: true, minimalHud: true, quality: 'performance' }
  saveViewPreferences(selected)
  assert.deepEqual(readViewPreferences(), selected)
})

test('invalid or unsupported saved preferences fall back without crashing', () => {
  store.set('worlds-apart.view-preferences.v1', '{bad json')
  assert.deepEqual(readViewPreferences(), defaultViewPreferences(true))
  store.set('worlds-apart.view-preferences.v1', JSON.stringify({ reducedMotion: 9, highContrast: 'true', minimalHud: 1, quality: 'ultra' }))
  assert.deepEqual(readViewPreferences(), defaultViewPreferences(true))
})
