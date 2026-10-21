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

const profiles = ['direct', 'arc', 'high', 'corkscrew', 'wave', 'slalom', 'dive']

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

async function zeroMaterials(context) {
  await context.addInitScript(() => localStorage.setItem('worlds-apart.freight.v1', JSON.stringify({
    version: 1, materials: 0, tier: 0, shipments: 0, delivered: 0, purchasedRoutes: [], shipment: null,
  })))
}

async function seek(page, value) {
  await page.locator('#scrub').evaluate((element, next) => {
    element.value = String(next)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}

function collectRuntimeFailures(page) {
  const failures = []
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`))
  page.on('console', message => {
    if (/THREE\.WebGLProgram|shader.*(?:error|fail)|webgl.*(?:error|fail)|context_lost|program.*(?:invalid|fail)/i.test(message.text())) {
      failures.push(`graphics console: ${message.text()}`)
    }
  })
  return failures
}

async function runCreativeDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await zeroMaterials(context)
  const page = await context.newPage()
  const pageErrors = collectRuntimeFailures(page)
  await page.goto(`${baseUrl}/?debug=1`, { waitUntil: 'domcontentloaded' })
  await page.locator('#begin').waitFor()
  assert.equal(await page.locator('canvas').count(), 1)
  assert.ok(await page.locator('#intro').isVisible())
  assert.ok(await page.locator('#intro-freight').isHidden(), 'freight entry point must stay dormant')
  assert.equal((await page.locator('#material-balance').textContent())?.trim(), '0')
  await page.locator('#begin').click()
  await page.locator('#route-planner').waitFor({ state: 'visible' })
  assert.equal(await page.locator('#construction-viewport canvas').count(), 1, '3D blueprint renderer should initialise')
  assert.match((await page.locator('#planner-wallet').textContent()) || '', /FREE TO BUILD/)

  const paths = new Set()
  for (const [index, profile] of profiles.entries()) {
    const preset = page.locator(`[data-construction-preset="${profile}"]`)
    await preset.click()
    assert.equal(await preset.getAttribute('aria-pressed'), 'true')
    assert.equal(await page.locator('#planner-launch').isEnabled(), true, `${profile} should launch without materials`)
    assert.match((await page.locator('#construction-status').textContent()) || '', /GUIDEWAY VALID/)
    paths.add(await page.locator('#planner-rail').getAttribute('d'))
    await page.locator('#planner-launch').click()
    await page.locator('#route-planner').waitFor({ state: 'hidden' })
    assert.equal((await page.locator('#phase').textContent())?.trim(), 'DEPARTURE')
    assert.match((await page.locator('#built-track').textContent()) || '', /KM/)
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('worlds-apart.guideway.v1') || 'null'))
    assert.equal(saved?.version, 1)
    if (['corkscrew', 'wave', 'slalom', 'dive'].includes(profile)) assert.equal(saved.profile, profile)
    await seek(page, 995)
    await page.locator('#arrival').waitFor({ state: 'visible' })
    assert.match((await page.locator('#build-arrival').textContent()) || '', /YOU RODE/)
    if (index < profiles.length - 1) {
      await page.locator('#replan').click()
      await page.locator('#route-planner').waitFor({ state: 'visible' })
    }
  }
  assert.equal(paths.size, profiles.length, 'all seven presets should produce visibly distinct route projections')
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('worlds-apart.freight.v1') || 'null')?.materials), 0)

  // Ride again remains immediate, then a dragged custom anchor survives launch and reload.
  await page.locator('#restart').click()
  assert.ok(Number(await page.locator('#scrub').inputValue()) < 50)
  await seek(page, 1000)
  await page.locator('#replan').click()
  await page.locator('[data-construction-preset="arc"]').click()
  const marker = page.locator('[data-construction-node]').first()
  const box = await marker.boundingBox()
  assert.ok(box)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 35, box.y + box.height / 2 + 8, { steps: 8 })
  await page.mouse.up()
  assert.equal(await page.locator('[data-construction-preset="arc"]').getAttribute('aria-pressed'), 'false')
  await page.locator('#planner-launch').click()
  const draggedDesign = await page.evaluate(() => JSON.parse(localStorage.getItem('worlds-apart.guideway.v1') || 'null'))
  assert.ok(draggedDesign.nodes.some(node => node.lateralKm !== 30000 && node.lateralKm !== 46000), 'drag should edit an anchor')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('#begin').click()
  assert.equal(await page.locator('#construction-node-list [data-select-node]').count(), draggedDesign.nodes.length)
  const reloadedDesign = await page.evaluate(() => JSON.parse(localStorage.getItem('worlds-apart.guideway.v1') || 'null'))
  assert.deepEqual(reloadedDesign, draggedDesign)
  assert.ok(await page.locator('#diagnostics').isVisible())
  assert.match(await page.locator('#diagnostics').textContent(), /FPS|Progress/)
  assert.deepEqual(pageErrors, [])
  await context.close()
}

async function runCreativeMobile(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  await zeroMaterials(context)
  const page = await context.newPage()
  const pageErrors = collectRuntimeFailures(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('#begin').click()
  await page.locator('[data-construction-preset="corkscrew"]').click()
  assert.equal(await page.locator('#planner-launch').isEnabled(), true)
  const minimumButtonHeight = await page.locator('#route-planner button:visible').evaluateAll(elements => Math.min(...elements.map(element => element.getBoundingClientRect().height)))
  assert.ok(minimumButtonHeight >= 40, `planner touch target is only ${minimumButtonHeight}px tall`)
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  assert.ok(overflow <= 1, `planner overflows mobile viewport by ${overflow}px`)
  await page.locator('#planner-launch').click()
  await page.locator('#route-planner').waitFor({ state: 'hidden' })

  // Preserve the current mobile HUD: collapsed by default, expandable, draggable and persistent.
  const panel = page.locator('.left-panel')
  const toggle = page.locator('#telemetry-toggle')
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
  await toggle.click()
  const initial = await panel.boundingBox()
  const handle = await page.locator('#telemetry-handle').boundingBox()
  assert.ok(initial && handle)
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(handle.x + handle.width / 2 + 70, handle.y + handle.height / 2 - 65, { steps: 8 })
  await page.mouse.up()
  const dragged = await panel.boundingBox()
  assert.ok(dragged && dragged.x > initial.x + 20)

  // Mobile cinematic mode must be reversible without a keyboard or an options dialog.
  await page.locator('#cinematic-toggle').click()
  assert.equal(await page.locator('.bottom').isVisible(), false)
  await page.locator('#cinematic-exit').click()
  assert.equal(await page.locator('.bottom').isVisible(), true)

  // First person follows the track, starts facing Earth and uses explicit cardinal views.
  await page.locator('#play').click()
  const canvas = page.locator('#viewport canvas')
  const beforeLook = await canvas.screenshot()
  assert.equal(await page.locator('[data-facing="backward"]').getAttribute('aria-pressed'), 'true')
  assert.match(await page.locator('#camera').textContent() || '', /THIRD PERSON/)
  const minimumFacingHeight = await page.locator('[data-facing]:visible').evaluateAll(elements => Math.min(...elements.map(element => element.getBoundingClientRect().height)))
  assert.ok(minimumFacingHeight >= 40, `facing touch target is only ${minimumFacingHeight}px tall`)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1)
  await page.locator('[data-facing="forward"]').click()
  await page.waitForTimeout(80)
  const afterLook = await canvas.screenshot()
  assert.equal(beforeLook.equals(afterLook), false, 'forward/backward should visibly rotate first-person view')
  const canvasBox = await canvas.boundingBox()
  assert.ok(canvasBox)
  // Horizontal first-person drag is deliberately locked; vertical drag remains free.
  await page.mouse.move(canvasBox.x + 300, canvasBox.y + 350)
  await page.mouse.down()
  await page.mouse.move(canvasBox.x + 80, canvasBox.y + 270, { steps: 10 })
  await page.mouse.up()
  await page.locator('#camera').click()
  assert.match(await page.locator('#camera').getAttribute('aria-label'), /first-person/)
  assert.match(await page.locator('#camera').textContent() || '', /FIRST PERSON/)
  assert.equal(await page.locator('#facing-controls').isHidden(), true)
  assert.equal(await page.locator('#look-back').isVisible(), true)
  const thirdBefore = await canvas.screenshot()
  await page.locator('#look-back').click()
  await page.waitForTimeout(80)
  const thirdAfter = await canvas.screenshot()
  assert.equal(thirdBefore.equals(thirdAfter), false, 'third-person rotate 180 should reveal the opposite side')
  await page.mouse.move(canvasBox.x + 300, canvasBox.y + 350)
  await page.mouse.down()
  await page.mouse.move(canvasBox.x + 80, canvasBox.y + 350, { steps: 10 })
  await page.mouse.up()
  await page.locator('#camera').click()
  assert.match(await page.locator('#camera').getAttribute('aria-label'), /third-person/)
  assert.equal(await page.locator('#facing-controls').isVisible(), true)

  await page.reload({ waitUntil: 'domcontentloaded' })
  const restored = await page.locator('.left-panel').boundingBox()
  assert.ok(restored && restored.x > initial.x + 20)
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  assert.ok(overflow <= 1, `ride UI overflows mobile viewport by ${overflow}px`)
  assert.deepEqual(pageErrors, [])
  await context.close()
}

async function runSurfaceSiteSelection(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  const errors = collectRuntimeFailures(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('#begin').click()
  await page.locator('[data-pick-body="earth"]').click()
  assert.equal(await page.locator('#site-picker-globe canvas').count(), 1)
  const globe = await page.locator('#site-picker-globe canvas').boundingBox()
  assert.ok(globe)
  await page.touchscreen.tap(globe.x + globe.width * 0.62, globe.y + globe.height * 0.48)
  assert.match(await page.locator('#site-picker-label').textContent() || '', /EARTH/)
  await page.locator('#site-picker-lat').fill('51.8892')
  await page.locator('#site-picker-lon').fill('0.9042')
  await page.locator('[data-site-confirm]').click()
  assert.match(await page.locator('#site-start').textContent() || '', /51\.89°N/)
  await page.locator('[data-pick-body="moon"]').click()
  await page.locator('[data-site-preset="nearside"]').click()
  assert.equal(await page.locator('#site-picker-lon').inputValue(), '0.0000')
  await page.locator('[data-site-preset="farside"]').click()
  await page.locator('[data-site-confirm]').click()
  assert.equal(await page.locator('#site-arrival').textContent(), '0.00°N, 180.00°E')
  await page.locator('[data-construction-preset="direct"]').click()
  assert.equal(await page.locator('#planner-launch').isEnabled(), true)
  await page.locator('#planner-launch').click()
  await page.locator('#route-planner').waitFor({ state: 'hidden' })
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('worlds-apart.ride-sites.v1') || 'null'))
  assert.equal(saved?.start?.latDeg,51.8892)
  assert.equal(saved?.start?.lonDeg,0.9042)
  assert.equal(saved?.arrival?.body,'moon')
  assert.equal(saved?.arrival?.lonDeg,180)
  await seek(page, 995)
  await page.locator('#arrival').waitFor({ state: 'visible' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('#begin').click()
  assert.match(await page.locator('#site-start').textContent() || '', /51\.89°N/)
  assert.deepEqual(errors, [])
  await context.close()
}

let browser
try {
  await waitForServer()
  const configuredExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  const systemExecutable = fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined
  browser = await chromium.launch({ headless: true, executablePath: configuredExecutable || systemExecutable })
  await runCreativeDesktop(browser)
  await runCreativeMobile(browser)
  await runSurfaceSiteSelection(browser)
  console.log('Creative coaster browser smoke passed at desktop and mobile viewports.')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
  await Promise.race([
    new Promise(resolve => server.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, 2000)),
  ])
}
