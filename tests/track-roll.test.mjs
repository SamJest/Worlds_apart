import test from 'node:test'
import assert from 'node:assert/strict'
import { designedTrackRoll, turnBankRadians } from '../src/simulation/trackRoll.ts'

test('corkscrew completes two 360° rolls, smoothly, without a seam at the endpoints', () => {
  assert.equal(designedTrackRoll(0, 'corkscrew'), 0)
  assert.ok(Math.abs(designedTrackRoll(1, 'corkscrew') - 4 * Math.PI) < 1e-10)
  assert.ok(Math.abs(designedTrackRoll(0.5, 'corkscrew') - 2 * Math.PI) < 1e-10)
  let previous = 0
  for (let i = 1; i <= 720; i++) {
    const angle = designedTrackRoll(i / 720, 'corkscrew')
    assert.ok(angle >= previous - 1e-10)
    assert.ok(angle - previous < 0.08, `abrupt axial roll at ${i}`)
    previous = angle
  }
})

test('other styles bank visibly but return upright at both stations', () => {
  for (const type of ['classic', 'wave', 'slalom', 'dive']) {
    assert.ok(Math.abs(designedTrackRoll(0, type)) < 1e-10)
    assert.ok(Math.abs(designedTrackRoll(1, type)) < 1e-10)
    if (type !== 'classic') assert.ok([.21, .36, .45, .61, .75].some(t => Math.abs(designedTrackRoll(t, type)) > .10), type)
  }
})

test('automatic cornering bank remains gentle and fades out at Earth and Moon', () => {
  assert.ok(Math.abs(turnBankRadians(0.2, 0)) < 1e-12)
  assert.ok(Math.abs(turnBankRadians(.4, 0.5)) <= .49)
  assert.ok(Math.abs(turnBankRadians(-.5, 1)) < 1e-12)
  assert.equal(turnBankRadians(Number.NaN, 0.5), 0)
})
