import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
if (path.resolve(git('rev-parse', '--show-toplevel')) !== root) throw Error('Run this command from the repository root.')
const commit = git('rev-parse', 'HEAD')
const status = git('status', '--short')
const candidates = git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean)
const allowed = projectPath => /^(src|tests|docs|scripts)\//.test(projectPath) || /^(README\.md|AGENTS\.md|package\.json|tsconfig[^/]*\.json|vite\.config\.[cm]?[jt]s|\.gitignore)$/.test(projectPath)
const files = []
let total = 0
for (const name of [...new Set(candidates)].filter(allowed).sort()) {
  if (/(^|\/)(node_modules|dist|exports|coverage|\.git)(\/|$)/.test(name) || /(^|\/)(\.env|.*\.(pem|key))($|\.)/.test(name)) continue
  const full = path.join(root, name)
  if (!fs.existsSync(full)) continue
  const stat = fs.lstatSync(full)
  if (!stat.isFile() || stat.isSymbolicLink() || !fs.realpathSync(full).startsWith(root + path.sep)) continue
  if (stat.size > 300_000) throw Error(`File too large for context export: ${name}. Exclude generated data or split the file.`)
  const data = fs.readFileSync(full)
  if (data.includes(0)) continue
  total += data.length
  if (total > 2_000_000) throw Error('Context exceeds 2 MB. Select a focused source subset before exporting.')
  files.push({ path: name.replaceAll('\\', '/'), sha256: sha(data), text: data.toString('utf8') })
}
const manifest = { schema: 'worlds-apart.context.v1', baseCommit: commit, exportedAt: new Date().toISOString(), workingTreeStatus: status || 'clean', files: Object.fromEntries(files.map(file => [file.path, file.sha256])) }
const intro = `# WORLDS APART — current project context\n\nBase commit: ${commit}\nWorking tree: ${status ? 'HAS CHANGES; hashes below describe the exported files, not necessarily HEAD.' : 'clean'}\n\nUse this snapshot as evidence. Do not invent code or claim browser tests ran. Prefer one complete, small change per request. For executable text edits return a change-pack JSON using the included protocol and exact SHA-256 values. Normal ChatGPT chat can draft code and designs but cannot be assumed to run browser checks or push GitHub changes.\n\n## Manifest\n\n${JSON.stringify(manifest, null, 2)}\n`
const markdown = intro + files.map(file => `\n## File: ${file.path}\n\nSHA-256: ${file.sha256}\n\n${JSON.stringify(file.text)}\n`).join('')

const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})
const crc = bytes => {
  let checksum = 0xffffffff
  for (const value of bytes) checksum = crcTable[(checksum ^ value) & 255] ^ (checksum >>> 8)
  return (checksum ^ 0xffffffff) >>> 0
}
const chunks = []
const central = []
let offset = 0
for (const [name, content] of [['CHATGPT_CONTEXT.md', markdown], ['BASE_SNAPSHOT.json', JSON.stringify(manifest, null, 2)], ...files.map(file => ['source/' + file.path, file.text])]) {
  const nameBytes = Buffer.from(name)
  const data = Buffer.from(content)
  const checksum = crc(data)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(20, 4)
  local.writeUInt16LE(0x800, 6)
  local.writeUInt32LE(checksum, 14)
  local.writeUInt32LE(data.length, 18)
  local.writeUInt32LE(data.length, 22)
  local.writeUInt16LE(nameBytes.length, 26)
  const header = Buffer.alloc(46)
  header.writeUInt32LE(0x02014b50, 0)
  header.writeUInt16LE(20, 4)
  header.writeUInt16LE(20, 6)
  header.writeUInt16LE(0x800, 8)
  header.writeUInt32LE(checksum, 16)
  header.writeUInt32LE(data.length, 20)
  header.writeUInt32LE(data.length, 24)
  header.writeUInt16LE(nameBytes.length, 28)
  header.writeUInt32LE(offset, 42)
  chunks.push(local, nameBytes, data)
  central.push(header, nameBytes)
  offset += local.length + nameBytes.length + data.length
}
const centralData = Buffer.concat(central)
const end = Buffer.alloc(22)
const count = central.length / 2
end.writeUInt32LE(0x06054b50, 0)
end.writeUInt16LE(count, 8)
end.writeUInt16LE(count, 10)
end.writeUInt32LE(centralData.length, 12)
end.writeUInt32LE(offset, 16)
fs.mkdirSync(path.join(root, 'exports'), { recursive: true })
fs.writeFileSync(path.join(root, 'exports/CHATGPT_CONTEXT.md'), markdown)
fs.writeFileSync(path.join(root, 'exports/CHATGPT_CONTEXT.zip'), Buffer.concat([...chunks, centralData, end]))
console.log(`Exported ${files.length} files (${total} source bytes) at ${commit.slice(0, 8)} to exports/CHATGPT_CONTEXT.zip`)
if (status) console.log('Working tree has changes. Commit a stable baseline before requesting a change pack; export again after that commit.')
