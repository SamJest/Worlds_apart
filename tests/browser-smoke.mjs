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
  // Round 4: supply rail is usable before designing a Moon route.
  await page.locator('#intro-freight').click()
  await page.locator('#freight-operations').waitFor({ state: 'visible' })
  assert.match((await page.locator('#freight-materials').textContent()) || '', /500/)
  assert.equal(await page.locator('#freight-upgrade').isDisabled(), true)
  await page.locator('#freight-dispatch').click()
  assert.equal(await page.locator('#freight-dispatch').isDisabled(), true)
  assert.match((await page.locator('#freight-status').textContent()) || '', /IN TRANSIT/)
  await page.waitForTimeout(1100)
  const savedInTransit = await page.evaluate(() => JSON.parse(localStorage.getItem('worlds-apart.freight.v1') || 'null'))
  assert.equal(savedInTransit?.shipment?.cargo, 45)
  assert.ok(savedInTransit?.shipment?.secondsRemaining < 18, 'in-transit progress should be persisted')
  await page.locator('#freight-to-planner').click()
  await page.locator('#route-planner').waitFor({ state: 'visible' })
  assert.ok(await page.locator('#freight-operations').isHidden())
  assert.match((await page.locator('#planner-wallet').textContent()) || '', /CONSTRUCTION COST/)

  await page.locator('#route-planner').waitFor({ state: 'visible' })
  assert.match((await page.locator('#planner-duration').textContent()) || '', /4 DAYS/)
  // Round 3: real blueprint preview + bounded construction editing.
  assert.equal(await page.locator('#construction-viewport canvas').count(), 1, '3D blueprint renderer should initialise')
  assert.equal(await page.locator('#construction-node-list [data-select-node]').count(), 1)
  await page.locator('[data-construction-preset="high"]').click()
  assert.equal(await page.locator('#construction-node-list [data-select-node]').count(), 2)
  assert.match((await page.locator('#construction-vertical-value').textContent()) || '', /40K/)
  await page.locator('#construction-add').click()
  assert.equal(await page.locator('#construction-node-list [data-select-node]').count(), 3)
  assert.equal(await page.locator('#construction-add').isDisabled(), true)
  await page.locator('[data-remove-node]').last().click()
  assert.equal(await page.locator('#construction-node-list [data-select-node]').count(), 2)
  await page.locator('[data-construction-preset="arc"]').click()
  assert.match((await page.locator('#construction-status').textContent()) || '', /GUIDEWAY VALID/)
  const scenicPath = await page.locator('#planner-rail').getAttribute('d')
  await page.locator('[data-construction-preset="direct"]').click()
  assert.notEqual(await page.locator('#planner-rail').getAttribute('d'), scenicPath, 'construction alters real track geometry')
  assert.match((await page.locator('#construction-material').textContent()) || '', /ALLOWED/)
  const plannerOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  assert.ok(plannerOverflow <= 1, `planner overflows at ${viewport.width}px: ${plannerOverflow}px`)
  if (viewport.width <= 780) {
    const minimumButtonHeight = await page.locator('#route-planner button').evaluateAll(elements => Math.min(...elements.map(element => element.getBoundingClientRect().height)))
    assert.ok(minimumButtonHeight >= 40, `planner touch target is only ${minimumButtonHeight}px tall`)
  }
  await page.locator('[data-plan-days="2"]').click()
  assert.match((await page.locator('#planner-duration').textContent()) || '', /2 DAYS/)
  await page.locator('#planner-offset').evaluate(element => {
    element.value = '6'
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  assert.equal(await page.locator('#planner-launch').isDisabled(), true)
  assert.match((await page.locator('#planner-status').textContent()) || '', /MISS/)
  await page.locator('#planner-snap').click()
  assert.equal(await page.locator('#planner-launch').isEnabled(), true)
  await page.locator('#planner-launch').click()
  const newMaterials = Number((await page.locator('#material-balance').textContent())?.replaceAll(',', ''))
  assert.ok(newMaterials > 0 && newMaterials < 500, 'lunar construction spends rail alloy')
  const savedRailState = await page.evaluate(() => JSON.parse(localStorage.getItem('worlds-apart.freight.v1') || 'null'))
  assert.equal(savedRailState?.purchasedRoutes?.length, 1)
  const savedBlueprint = await page.evaluate(() => JSON.parse(localStorage.getItem('worlds-apart.guideway.v1') || 'null'))
  assert.equal(savedBlueprint?.version, 1)
  assert.equal(savedBlueprint?.nodes?.length, 0)
  await page.locator('#route-planner').waitFor({ state: 'hidden' })
  await page.locator('#intro').waitFor({ state: 'hidden' })
  assert.equal((await page.locator('#phase').textContent())?.trim(), 'DEPARTURE')
  assert.match((await page.locator('#built-track').textContent()) || '', /KM/)
  assert.match((await page.locator('#days').textContent()) || '', /2\.00$/)
  await page.locator('#settings-open').click()
  await page.locator('#settings').waitFor({ state: 'visible' })
  await page.locator('#setting-motion').check()
  await page.locator('#setting-contrast').check()
  await page.locator('#setting-quality').selectOption('performance')
  await page.locator('#setting-sound').uncheck()
  assert.equal(await page.locator('#setting-volume').isDisabled(), true)
  assert.ok(await page.locator('#app').evaluate(element => element.classList.contains('high-contrast')))
  assert.equal(await page.locator('#setting-quality').inputValue(), 'performance')
  await page.locator('#settings-close').click()
  await page.keyboard.press('h')
  assert.ok(await page.locator('#app').evaluate(element => element.classList.contains('minimal-hud')))
  await page.keyboard.press('h')
  assert.ok(!(await page.locator('#app').evaluate(element => element.classList.contains('minimal-hud'))))
  await page.locator('#camera').click()
  assert.match(await page.locator('#camera').getAttribute('aria-label'), /first-person/)
  await page.locator('#speed').click()
  await page.locator('#speed').click()
  await page.locator('#scrub').evaluate(element => {
    element.value = '900'
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(50)
  assert.equal((await page.locator('#phase').textContent())?.trim(), 'LUNAR APPROACH')
  await page.locator('#scrub').evaluate(element => {
    element.value = '995'
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.locator('#arrival').waitFor({ state: 'visible' })
  assert.match((await page.locator('#build-arrival').textContent()) || '', /YOU BUILT/)
  await page.locator('#restart').click()
  await page.waitForTimeout(100)
  assert.ok(Number(await page.locator('#scrub').inputValue()) < 50, 'restart should return near departure')
  // Arrival offers another selectable orbital duration without navigating away.
  await page.locator('#scrub').evaluate(element => {
    element.value = '1000'
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.locator('#replan').click()
  await page.locator('[data-plan-days="6"]').click()
  assert.match((await page.locator('#planner-wallet').textContent()) || '', /NEED/)
  assert.equal(await page.locator('#planner-launch').isDisabled(), true, 'cannot build without funding')
  await page.locator('#planner-freight').click()
  await page.locator('#freight-operations').waitFor({ state: 'visible' })
  await page.locator('#freight-close').click()
  assert.ok(await page.locator('#route-planner').isVisible(), 'freight console returns to construction plan')
  await page.locator('[data-plan-days="2"]').click()
  assert.match((await page.locator('#planner-wallet').textContent()) || '', /ALREADY BUILT/)
  await page.locator('#planner-launch').click()
  await page.locator('#route-planner').waitFor({ state: 'hidden' })
  assert.match((await page.locator('#days').textContent()) || '', /2\.00$/)
  const replayState = await page.evaluate(() => JSON.parse(localStorage.getItem('worlds-apart.freight.v1') || 'null'))
  assert.equal(replayState?.purchasedRoutes?.length, 1, 'replaying the same route costs nothing')
  assert.ok(Number(await page.locator('#scrub').inputValue()) < 50, 'replan should reset progress')
  if (debug) {
    await page.locator('#diagnostics').waitFor({ state: 'visible' })
    assert.match(await page.locator('#diagnostics').textContent(), /FPS|Progress/)
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  assert.ok(overflow <= 1, `horizontal overflow at ${viewport.width}px: ${overflow}px`)
  assert.deepEqual(pageErrors, [])
  await page.close()
}


// Round 5: keyboard-friendly station placement, graph connections, freight dispatch
// along a multi-hop route, and full persistence after a page reload.
async function runLocalNetworkEditor(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const failures = []
  page.on('pageerror', error => failures.push(error.message))
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('#intro-freight').click()
  assert.equal(await page.locator('#freight-station-list button').count(), 2)
  await page.locator('#freight-placement-x').fill('260')
  await page.locator('#freight-placement-y').fill('80')
  await page.locator('#freight-build-coordinate').click()
  assert.equal(await page.locator('#freight-station-list button').count(), 3)
  assert.equal(await page.locator('#freight-materials').textContent(), '435')
  await page.locator('#freight-destination').selectOption('s2')
  assert.match((await page.locator('#freight-route-description').textContent()) || '', /No track connection/)
  assert.equal(await page.locator('#freight-dispatch').isDisabled(), true)
  await page.locator('#freight-link').click()
  await page.locator('[data-select-network-station="s0"]').click()
  await page.locator('[data-select-network-station="s2"]').click()
  assert.match((await page.locator('#freight-route-description').textContent()) || '', /Earth Depot.*Outpost 1/)
  assert.equal(await page.locator('#freight-dispatch').isDisabled(), false)
  await page.locator('#freight-placement-x').fill('365')
  await page.locator('#freight-placement-y').fill('66')
  await page.locator('#freight-build-coordinate').click()
  await page.locator('#freight-link').click()
  await page.locator('[data-select-network-station="s2"]').click()
  await page.locator('[data-select-network-station="s3"]').click()
  await page.locator('#freight-destination').selectOption('s3')
  assert.match((await page.locator('#freight-route-description').textContent()) || '', /Earth Depot.*Outpost 1.*Outpost 2/)
  await page.locator('#freight-dispatch').click()
  const network = await page.evaluate(() => JSON.parse(localStorage.getItem('worlds-apart.local-network.v1') || 'null'))
  assert.equal(network.stations.length, 4)
  assert.equal(network.links.length, 3)
  assert.deepEqual(network.activePath.stops, ['s0', 's2', 's3'])
  assert.equal(network.ore, 205)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('#intro-freight').click()
  assert.equal(await page.locator('#freight-station-list button').count(), 4)
  assert.equal(await page.locator('#freight-destination').inputValue(), 's3')
  assert.equal(await page.locator('#freight-dispatch').isDisabled(), true)
  const xOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  assert.ok(xOverflow <= 1, `local network UI overflows mobile viewport: ${xOverflow}`)
  const touchTarget = await page.locator('#freight-build-coordinate').evaluate(e => e.getBoundingClientRect().height)
  assert.ok(touchTarget >= 40)
  assert.deepEqual(failures, [])
  await context.close()
}

let browser
try {
  await waitForServer()
  const configuredExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  const systemExecutable = fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined
  browser = await chromium.launch({ headless: true, executablePath: configuredExecutable || systemExecutable })
  await runViewport(browser, { width: 1440, height: 900 }, true)
  await runViewport(browser, { width: 390, height: 844 })
  await runLocalNetworkEditor(browser)
  console.log('Browser smoke passed at desktop and mobile viewports.')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
  await Promise.race([
    new Promise(resolve => server.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, 2000)),
  ])
}
