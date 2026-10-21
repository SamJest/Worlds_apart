import test from 'node:test'
import assert from 'node:assert/strict'
import { bodyFixedMetres, surfaceDirection, siteFromDirection, rotatedSiteDirection, validateRideSites, DEFAULT_RIDE_SITES, readRideSites, saveRideSites } from '../src/simulation/surfaceSites.ts'
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`)

test('WGS84 has longer equatorial than polar radius', () => {
  const base={body:'earth',elevationMeters:0,headingDeg:90,lonDeg:0}
  near(bodyFixedMetres({...base,latDeg:0})[0],6378137,.0001)
  near(bodyFixedMetres({...base,latDeg:90})[1],6356752.314245,.001)
})
test('lat/lon east positive, dateline, both poles and Colchester round trip', () => {
  for (const body of ['earth','moon']) for (const [latDeg,lonDeg] of [[0,0],[51.8892,.9042],[-35,120],[0,179.99],[0,-179.99],[90,0],[-90,0]]) {
    const site={body,latDeg,lonDeg,elevationMeters:0,headingDeg:90}
    const back=siteFromDirection(body,surfaceDirection(site))
    near(back.latDeg,latDeg,1e-7)
    if(Math.abs(latDeg)!==90) near(back.lonDeg,lonDeg,1e-7)
  }
})
test('rotating marker around the Y axis follows the visual planet spin',()=>{
  const site={body:'earth',latDeg:0,lonDeg:0,elevationMeters:0,headingDeg:0}
  const v=rotatedSiteDirection(site,Math.PI/2)
  near(v[0],0);near(v[1],0);near(v[2],-1)
})
test('save validation and migration fallback preserve older saved routes',()=>{
  let item=''
  const storage={getItem:()=>item,setItem:(_key,value)=>{item=value}}
  assert.equal(saveRideSites(structuredClone(DEFAULT_RIDE_SITES),storage),true)
  assert.deepEqual(readRideSites(storage),DEFAULT_RIDE_SITES)
  item='{"start":{"body":"mars"}}'
  assert.deepEqual(readRideSites(storage),DEFAULT_RIDE_SITES)
  assert.equal(validateRideSites({start:{...DEFAULT_RIDE_SITES.start,latDeg:91},arrival:DEFAULT_RIDE_SITES.arrival}),null)
})
