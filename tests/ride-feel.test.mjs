import test from 'node:test'
import assert from 'node:assert/strict'
import { coasterBankRadians } from '../src/simulation/rideFeel.ts'

test('banking is directional, capped and disappears with reduced motion', () => {
  assert.equal(coasterBankRadians(0, false), 0)
  assert.ok(coasterBankRadians(0.1, false) < 0)
  assert.ok(coasterBankRadians(-0.1, false) > 0)
  assert.ok(Math.abs(coasterBankRadians(4, false)) <= 0.36)
  assert.ok(Math.abs(coasterBankRadians(-4, false)) <= 0.36)
  assert.equal(coasterBankRadians(1, true), 0)
  assert.equal(coasterBankRadians(NaN, false), 0)
})
