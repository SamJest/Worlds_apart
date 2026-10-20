import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const hash = value => crypto.createHash('sha256').update(value).digest('hex')

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'worlds-tools-'))
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  git('init', '-b', 'main')
  git('config', 'user.name', 'Fixture')
  git('config', 'user.email', 'fixture@example.invalid')
  fs.mkdirSync(path.join(root, 'src'))
  fs.writeFileSync(path.join(root, 'src/value.ts'), 'export const value = 1\n')
  fs.writeFileSync(path.join(root, 'README.md'), 'Fixture\n')
  git('add', '.')
  git('commit', '-m', 'fixture')
  const pack = {
    schema: 'worlds-apart.change-pack.v1',
    baseCommit: git('rev-parse', 'HEAD'),
    baseFiles: { 'src/value.ts': hash('export const value = 1\n') },
    changes: [{ path: 'src/value.ts', action: 'write', content: 'export const value = 2\n' }],
  }
  const run = (apply = false) => {
    const file = path.join(root, 'patch.json')
    fs.writeFileSync(file, JSON.stringify(pack))
    return spawnSync(process.execPath, [path.join(here, 'apply-chatgpt-change.mjs'), file, ...(apply ? ['--apply'] : [])], { cwd: root, encoding: 'utf8' })
  }
  return { root, pack, run, clean: () => fs.rmSync(root, { recursive: true, force: true }) }
}

test('check-only leaves files untouched; apply writes and keeps an exact backup', () => {
  const fixtureState = fixture()
  try {
    assert.equal(fixtureState.run().status, 0)
    assert.match(fs.readFileSync(path.join(fixtureState.root, 'src/value.ts'), 'utf8'), /= 1/)
    assert.equal(fixtureState.run(true).status, 0)
    assert.match(fs.readFileSync(path.join(fixtureState.root, 'src/value.ts'), 'utf8'), /= 2/)
    const backupRoot = path.join(fixtureState.root, '.worlds-apart-change-backups')
    const [backupId] = fs.readdirSync(backupRoot)
    assert.equal(fs.readFileSync(path.join(backupRoot, backupId, 'src/value.ts'), 'utf8'), 'export const value = 1\n')
    assert.ok(fs.existsSync(path.join(backupRoot, backupId, 'manifest.json')))
  } finally { fixtureState.clean() }
})

test('stale commit and altered file both reject without overwriting', () => {
  const fixtureState = fixture()
  try {
    fixtureState.pack.baseCommit = '0'.repeat(40)
    assert.notEqual(fixtureState.run(true).status, 0)
    fixtureState.pack.baseCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fixtureState.root, encoding: 'utf8' }).trim()
    fs.writeFileSync(path.join(fixtureState.root, 'src/value.ts'), 'my local work')
    assert.notEqual(fixtureState.run(true).status, 0)
    assert.equal(fs.readFileSync(path.join(fixtureState.root, 'src/value.ts'), 'utf8'), 'my local work')
  } finally { fixtureState.clean() }
})

test('traversal or any invalid later operation prevents every write', () => {
  const fixtureState = fixture()
  try {
    fixtureState.pack.changes.push({ path: '../escape.txt', action: 'write', content: 'bad' })
    assert.notEqual(fixtureState.run(true).status, 0)
    assert.match(fs.readFileSync(path.join(fixtureState.root, 'src/value.ts'), 'utf8'), /= 1/)
    assert.equal(fs.existsSync(path.join(fixtureState.root, 'escape.txt')), false)
  } finally { fixtureState.clean() }
})

test('new files, deletions, and creation collisions are checked', () => {
  const fixtureState = fixture()
  try {
    fixtureState.pack.baseFiles['src/new.ts'] = null
    fixtureState.pack.changes.push({ path: 'src/new.ts', action: 'write', content: 'new\n' })
    fixtureState.pack.changes[0] = { path: 'src/value.ts', action: 'delete' }
    assert.equal(fixtureState.run(true).status, 0)
    assert.equal(fs.existsSync(path.join(fixtureState.root, 'src/value.ts')), false)
    assert.equal(fs.readFileSync(path.join(fixtureState.root, 'src/new.ts'), 'utf8'), 'new\n')
    assert.notEqual(fixtureState.run(true).status, 0)
  } finally { fixtureState.clean() }
})

test('context export includes hashes and source while excluding secrets and generated paths', () => {
  const fixtureState = fixture()
  try {
    fs.writeFileSync(path.join(fixtureState.root, '.env'), 'DO_NOT_EXPORT=secret')
    fs.mkdirSync(path.join(fixtureState.root, 'dist'))
    fs.writeFileSync(path.join(fixtureState.root, 'dist/output.js'), 'generated')
    const result = spawnSync(process.execPath, [path.join(here, 'export-chatgpt-context.mjs')], { cwd: fixtureState.root, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    const text = fs.readFileSync(path.join(fixtureState.root, 'exports/CHATGPT_CONTEXT.md'), 'utf8')
    assert.ok(text.includes(hash('export const value = 1\n')))
    assert.ok(text.includes('src/value.ts'))
    assert.ok(!text.includes('DO_NOT_EXPORT'))
    assert.ok(!text.includes('generated'))
    const zip = fs.readFileSync(path.join(fixtureState.root, 'exports/CHATGPT_CONTEXT.zip'))
    assert.equal(zip.readUInt32LE(0), 0x04034b50)
  } finally { fixtureState.clean() }
})
