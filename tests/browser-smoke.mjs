import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const port = 4179
const baseUrl = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] })
let serverOutput = ''
server.stdout.on('data', chunk => { serverOutput += chunk })
server.stderr.on('data', chunk => { serverOutput += chunk })

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Vite stopped before readiness.\n${serverOutput}`)
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out waiting for Vite.\n${serverOutput}`)
}

async function runViewport(browser, viewport, debug = false) {
  const page = await browser.newPage({ viewport })
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto(`${baseUrl}/${debug ? '?debug=1' : ''}`, { waitUntil: 'domcontentloaded' })
  await page.locator('#begin').waitFor()
  assert.equal(await page.locator('canvas').count(), 1)
  assert.ok(await page.locator('#intro').isVisible())
  await page.locator('#begin').click()
  await page.locator('#camera').click()
  assert.match(await page.locator('#camera').getAttribute('aria-label'), /first-person/)
  await page.locator('#speed').click()
  await page.locator('#speed').click()
  await page.locator('#scrub').evaluate(element => {
    element.value = '995'
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.locator('#arrival').waitFor({ state: 'visible' })
  await page.locator('#restart').click()
  await page.waitForTimeout(100)
  assert.ok(Number(await page.locator('#scrub').inputValue()) < 50, 'restart should return near departure')
  if (debug) {
    await page.locator('#diagnostics').waitFor({ state: 'visible' })
    assert.match(await page.locator('#diagnostics').textContent(), /FPS|Progress/)
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  assert.ok(overflow <= 1, `horizontal overflow at ${viewport.width}px: ${overflow}px`)
  assert.deepEqual(pageErrors, [])
  await page.close()
}

let browser
try {
  await waitForServer()
  const configuredExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  const systemExecutable = fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined
  browser = await chromium.launch({ headless: true, executablePath: configuredExecutable || systemExecutable })
  await runViewport(browser, { width: 1440, height: 900 }, true)
  await runViewport(browser, { width: 390, height: 844 })
  console.log('Browser smoke passed at desktop and mobile viewports.')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
  await Promise.race([
    new Promise(resolve => server.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, 2000)),
  ])
}
