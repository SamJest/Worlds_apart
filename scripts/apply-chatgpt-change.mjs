import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const args = process.argv.slice(2)
const packFile = args[0]
if (!packFile || args.slice(1).some(argument => argument !== '--apply')) throw Error('Usage: node scripts/apply-chatgpt-change.mjs change.json [--apply]. Default is check only.')
if (path.resolve(git('rev-parse', '--show-toplevel')) !== root) throw Error('Run from the repository root.')
if (fs.statSync(packFile).size > 3_000_000) throw Error('Change pack exceeds 3 MB.')
const pack = JSON.parse(fs.readFileSync(packFile, 'utf8'))
if (pack.schema !== 'worlds-apart.change-pack.v1') throw Error('Unsupported change-pack schema.')
if (!/^[0-9a-f]{40}$/.test(pack.baseCommit || '') || pack.baseCommit !== git('rev-parse', 'HEAD')) throw Error('Base commit differs. Export current context and regenerate or have Codex review/rebase the change. Do not bypass this check.')
if (!Array.isArray(pack.changes) || pack.changes.length < 1 || pack.changes.length > 100) throw Error('Expected 1 to 100 changes.')
const seen = new Set()
const operations = []
const allowed = projectPath => /^(src|tests|docs|public|scripts)\//.test(projectPath) || /^(README\.md|AGENTS\.md|package\.json|tsconfig[^/]*\.json|vite\.config\.[cm]?[jt]s|\.gitignore)$/.test(projectPath)
for (const change of pack.changes) {
  const projectPath = change.path
  if (typeof projectPath !== 'string' || !projectPath || projectPath.includes('\\') || path.posix.isAbsolute(projectPath) || /^[a-z]:/i.test(projectPath) || projectPath.split('/').some(segment => !segment || segment === '.' || segment === '..') || !allowed(projectPath) || projectPath.split('/').some(segment => segment.startsWith('.') && segment !== '.gitignore')) throw Error(`Invalid or unsupported path: ${projectPath}`)
  if (seen.has(projectPath)) throw Error(`Duplicate path: ${projectPath}`)
  seen.add(projectPath)
  const full = path.resolve(root, projectPath)
  if (!full.startsWith(root + path.sep)) throw Error('Path escapes repository.')
  let walk = root
  for (const segment of projectPath.split('/')) {
    walk = path.join(walk, segment)
    if (fs.existsSync(walk) && fs.lstatSync(walk).isSymbolicLink()) throw Error(`Symlinks are unsupported: ${projectPath}`)
  }
  const exists = fs.existsSync(full)
  if (exists && !fs.statSync(full).isFile()) throw Error(`Target is not a file: ${projectPath}`)
  if (!Object.hasOwn(pack.baseFiles || {}, projectPath)) throw Error(`Missing base hash: ${projectPath}`)
  const expected = pack.baseFiles[projectPath]
  if (expected !== null && !/^[0-9a-f]{64}$/.test(expected || '')) throw Error(`Invalid base hash: ${projectPath}`)
  const before = exists ? fs.readFileSync(full) : null
  if (expected !== (before === null ? null : sha(before))) throw Error(`File changed or creation target already exists: ${projectPath}`)
  if (!['write', 'delete'].includes(change.action)) throw Error(`Unsupported action: ${projectPath}`)
  if (change.action === 'delete' && !exists) throw Error(`Cannot delete missing file: ${projectPath}`)
  if (change.action === 'write' && (typeof change.content !== 'string' || Buffer.byteLength(change.content) > 1_000_000 || change.content.includes('\0'))) throw Error(`Invalid UTF-8 text content: ${projectPath}`)
  operations.push({ projectPath, full, before, action: change.action, content: change.content })
}
console.log(`Verified base ${pack.baseCommit.slice(0, 8)} and ${operations.length} file hashes.`)
for (const operation of operations) console.log(`${operation.action.toUpperCase()} ${operation.projectPath}`)
if (!args.includes('--apply')) {
  console.log('CHECK ONLY: no files changed. Review the content, then repeat with --apply to write it.')
  process.exit(0)
}
const backup = path.join(root, '.worlds-apart-change-backups', crypto.randomUUID())
fs.mkdirSync(backup, { recursive: true })
for (const operation of operations) {
  if (operation.before !== null) {
    const target = path.join(backup, operation.projectPath)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, operation.before)
  }
}
fs.writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify({ baseCommit: pack.baseCommit, files: operations.map(operation => ({ path: operation.projectPath, previouslyExisted: operation.before !== null })) }, null, 2))
const attempted = []
try {
  for (const operation of operations) {
    attempted.push(operation)
    if (operation.action === 'delete') fs.unlinkSync(operation.full)
    else {
      fs.mkdirSync(path.dirname(operation.full), { recursive: true })
      fs.writeFileSync(operation.full, operation.content)
    }
  }
} catch (error) {
  for (const operation of attempted.reverse()) {
    if (operation.before === null) {
      if (fs.existsSync(operation.full)) fs.unlinkSync(operation.full)
    } else fs.writeFileSync(operation.full, operation.before)
  }
  throw error
}
console.log(`Applied. Backups: ${path.relative(root, backup)}. Now review git diff, run npm run check, and play-test before committing. No commands from the pack were executed.`)
