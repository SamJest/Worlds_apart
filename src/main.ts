import * as THREE from 'three'
import { ARRIVAL_MOON, EARTH_RADIUS, END, JOURNEY_SECONDS, MOON_DISTANCE, MOON_RADIUS, START, apparentDiameterDegrees, moonPosition, route, routeLength } from './astronomy'
import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `<div id="viewport"></div>
<div class="vignette"></div>
<header><div class="brand"><span class="mark">◈</span><div><small>AN INTERPLANETARY RAIL EXPERIENCE</small><strong>WORLDS <em>APART</em></strong></div></div><div class="chapter">MILESTONE 01 <span>•</span> EARTH → MOON</div></header>
<div class="reticle"><i></i><i></i><i></i><i></i></div>
<div class="destination"><span>✦ &nbsp; NEXT DESTINATION</span><strong>THE MOON</strong><small id="distance">384,400 km away</small></div>
<div class="left-panel"><div class="eyebrow">MISSION TELEMETRY <span class="live">● LIVE</span></div><div class="reading"><span>JOURNEY</span><strong id="percent">0%</strong></div><div class="reading"><span>EARTH DISTANCE</span><strong id="earth-distance">0 km</strong></div><div class="reading"><span>MOON APPARENT SIZE</span><strong id="angular">0.52°</strong></div><div class="reading"><span>SIMULATED TIME</span><strong id="days">DAY 0.00 / 4.00</strong></div></div>
<div class="arrival hidden" id="arrival"><span>DESTINATION REACHED</span><h1>Welcome to the Moon.</h1><p>One small journey. A whole new world.</p><button id="restart">RIDE AGAIN ↗</button></div>
<div class="bottom"><div class="progress-label"><span>EARTH <b>DEPARTURE</b></span><span>384,400 KM <b>MEAN SEPARATION</b></span><span>MOON <b>ARRIVAL</b></span></div><input id="scrub" aria-label="Journey progress" type="range" min="0" max="1000" value="0"/><div class="controls"><button id="play" class="primary" aria-label="Pause journey">Ⅱ <span>PAUSE</span></button><button id="camera" aria-label="Switch camera">◉ <span>EXTERNAL VIEW</span></button><button id="speed" aria-label="Change speed">1× <span>SPEED</span></button><div class="hint">DRAG TO LOOK AROUND <span>·</span> SCROLL TO ZOOM <span>·</span> SPACE TO PAUSE <span>·</span> C TO SWITCH CAMERA</div></div></div>
<div class="intro" id="intro"><div class="intro-card"><div class="eyebrow">WORLDS APART &nbsp; / &nbsp; PROTOTYPE 01</div><h1>The distance<br/>between worlds.</h1><p>Ride a fictional adaptive railway from Earth to a moving Moon. The sizes and orbital distance are grounded in astronomy; the rail and accelerated journey are fiction.</p><button id="begin">BEGIN JOURNEY <span>↗</span></button><small>3 MINUTES AT 1× &nbsp; • &nbsp; DRAG TO LOOK &nbsp; • &nbsp; SWITCH CAMERAS</small></div></div>`

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const viewport = $('#viewport')
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.25
viewport.append(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x020611)
const camera = new THREE.PerspectiveCamera(67, innerWidth / innerHeight, 0.004, 1800)
scene.add(new THREE.AmbientLight(0x42577b, 1.15))
const sun = new THREE.DirectionalLight(0xfff0da, 3.3)
sun.position.set(150, 120, 190)
scene.add(sun)

function seeded(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) }
const rand = seeded(7241)
function texture(kind: 'earth' | 'moon'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512
  const g = canvas.getContext('2d')!
  if (kind === 'earth') {
    const sea = g.createLinearGradient(0, 0, 0, 512)
    sea.addColorStop(0, '#174c80'); sea.addColorStop(.52, '#0b3565'); sea.addColorStop(1, '#205787')
    g.fillStyle = sea; g.fillRect(0, 0, 1024, 512)
    // Longitude/latitude silhouettes in an equirectangular map; intentionally stylised.
    const lands: [string, number[]][] = [
      ['#668b68',[48,91,109,72,156,80,196,105,210,133,178,150,165,180,144,192,135,232,102,218,91,191,64,172,40,143]],
      ['#779465',[167,245,206,255,231,290,216,327,198,361,183,397,160,409,146,366,131,326,142,288]],
      ['#718e61',[452,102,501,84,555,96,594,117,621,105,673,126,741,120,792,153,824,173,790,202,734,199,710,233,658,219,631,185,597,178,571,200,534,169,502,163,484,140]],
      ['#9b9664',[492,180,533,161,566,177,591,209,608,256,579,306,556,350,526,340,502,301,481,260,474,211]],
      ['#62875c',[760,318,809,293,853,314,880,343,856,373,812,371,784,350]],
      ['#718c71',[309,70,342,63,356,89,345,117,318,119,300,99]],
      ['#d3dad3',[0,466,175,450,344,458,520,450,708,463,880,451,1024,466,1024,512,0,512]]
    ]
    for (const [color, pts] of lands) { g.fillStyle = color; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let j=2;j<pts.length;j+=2) g.lineTo(pts[j],pts[j+1]); g.closePath(); g.fill(); g.strokeStyle='#345e60'; g.lineWidth=2; g.stroke() }
    for(let i=0;i<11000;i++){ const x=rand()*1024,y=rand()*512; g.fillStyle=rand()>.5?'#b1aa78':'#365f51'; g.globalAlpha=.05+rand()*.15; g.fillRect(x,y,1+rand()*4,1+rand()*3) } g.globalAlpha=1
    for(let i=0;i<155;i++){ const x=rand()*1024,y=rand()*490,w=15+rand()*95; g.fillStyle='rgba(238,246,249,0.11)'; g.beginPath(); g.ellipse(x,y,w,2+rand()*8,rand()*.3,0,Math.PI*2); g.fill() }
  } else {
    g.fillStyle='#9b9a96'; g.fillRect(0,0,1024,512)
    for(let i=0;i<45000;i++){const v=Math.floor(90+rand()*120);g.fillStyle=`rgba(${v},${v},${v},${.02+rand()*.14})`;g.fillRect(rand()*1024,rand()*512,1+rand()*5,1+rand()*5)}
    for(let i=0;i<1050;i++){const x=rand()*1024,y=rand()*512,r=1+Math.pow(rand(),3)*23;g.strokeStyle='rgba(49,48,47,.25)';g.lineWidth=Math.max(1,r*.17);g.beginPath();g.ellipse(x,y,r,r*(.5+rand()*.5),0,0,Math.PI*2);g.stroke();g.fillStyle='rgba(220,218,210,.10)';g.beginPath();g.arc(x-r*.2,y-r*.3,r*.6,0,Math.PI*2);g.fill()}
  }
  const t = new THREE.CanvasTexture(canvas); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); return t
}
const sphere = new THREE.SphereGeometry(1, 64, 40)
const earth = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({map:texture('earth'),roughness:1,metalness:0}))
earth.scale.setScalar(EARTH_RADIUS); earth.rotation.y=1.55; scene.add(earth)
const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1,48,32), new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,uniforms:{glowColor:{value:new THREE.Color(0x448fff)}},vertexShader:`varying vec3 vNormal;varying vec3 vEye;void main(){vec4 world=modelMatrix*vec4(position,1.);vNormal=normalize(mat3(modelMatrix)*normal);vEye=normalize(cameraPosition-world.xyz);gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`varying vec3 vNormal;varying vec3 vEye;uniform vec3 glowColor;void main(){float a=pow(1.-abs(dot(vNormal,vEye)),3.);gl_FragColor=vec4(glowColor,a*.48);}`}))
atmosphere.scale.setScalar(EARTH_RADIUS*1.045);scene.add(atmosphere)
const moon = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({map:texture('moon'),roughness:1}))
moon.scale.setScalar(MOON_RADIUS);scene.add(moon)

const starPositions = new Float32Array(2600*3), starColors = new Float32Array(2600*3)
for(let i=0;i<2600;i++){const z=rand()*2-1,a=rand()*Math.PI*2,r=950;starPositions.set([r*Math.sqrt(1-z*z)*Math.cos(a),r*z,r*Math.sqrt(1-z*z)*Math.sin(a)],i*3);const c=.4+rand()*.6;starColors.set([c*.82,c*.9,c],i*3)}
const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute('position',new THREE.BufferAttribute(starPositions,3));starsGeo.setAttribute('color',new THREE.BufferAttribute(starColors,3))
scene.add(new THREE.Points(starsGeo,new THREE.PointsMaterial({size:1.1,sizeAttenuation:false,vertexColors:true,depthWrite:false})))

// World-space rail gauge changes from 3 m near the worlds to 12 km in open space.
// This fictional adaptive structure remains visible at cruise altitude.
const gauge=(t:number)=>.003+6*Math.pow(Math.sin(Math.PI*t),2)
const railPoints:[THREE.Vector3[],THREE.Vector3[]]=[[],[]]
const up=new THREE.Vector3(0,1,0)
for(let i=0;i<=900;i++){const t=i/900,p=route.getPoint(t),tangent=route.getTangent(t).normalize(),side=new THREE.Vector3().crossVectors(tangent,up).normalize();for(let s=0;s<2;s++)railPoints[s].push(p.clone().addScaledVector(side,(s?1:-1)*gauge(t)*.5).addScaledVector(up,-.006))}
const railMaterial=new THREE.MeshStandardMaterial({color:0x9ab7ca,metalness:.75,roughness:.3,emissive:0x1a4b6b,emissiveIntensity:.35})
for(const points of railPoints)scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),900,.007,5,false),railMaterial))
const spine=new THREE.Mesh(new THREE.TubeGeometry(route,720,.007,4,false),new THREE.MeshBasicMaterial({color:0x123d61}));scene.add(spine)
const sleeperGeometry=new THREE.BoxGeometry(1,.012,.014)
const sleepers=new THREE.InstancedMesh(sleeperGeometry,new THREE.MeshStandardMaterial({color:0x416575,metalness:.65,roughness:.38}),310)
const dummy=new THREE.Object3D()
for(let i=0;i<310;i++){const t=(i+.5)/310,p=route.getPoint(t),tan=route.getTangent(t).normalize();dummy.position.copy(p).addScaledVector(up,-.013);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),tan);dummy.scale.set(gauge(t)+.03,1,1);dummy.updateMatrix();sleepers.setMatrixAt(i,dummy.matrix)}
sleepers.instanceMatrix.needsUpdate=true;scene.add(sleepers)

const carriage=new THREE.Group();scene.add(carriage)
const bodyMat=new THREE.MeshStandardMaterial({color:0x9bb6c0,metalness:.7,roughness:.24})
const darkMat=new THREE.MeshStandardMaterial({color:0x101b2a,metalness:.5,roughness:.27})
const glassMat=new THREE.MeshPhysicalMaterial({color:0x204865,metalness:.12,roughness:.12,transparent:true,opacity:.48,side:THREE.DoubleSide})
function box(parent:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m}
box(carriage,.055,.019,.14,0,.019,0,bodyMat)
box(carriage,.054,.022,.087,0,.039,-.013,darkMat)
box(carriage,.051,.003,.09,0,.052,-.013,bodyMat)
box(carriage,.002,.023,.08,-.026,.041,-.014,glassMat)
box(carriage,.002,.023,.08,.026,.041,-.014,glassMat)
box(carriage,.048,.022,.003,0,.041,-.055,glassMat)
box(carriage,.04,.012,.004,0,.027,.067,new THREE.MeshBasicMaterial({color:0x8fe8ff}))
for(const x of [-.018,.018]){box(carriage,.009,.007,.015,x,.007,-.044,darkMat);box(carriage,.009,.007,.015,x,.007,.046,darkMat)}
const podLight=new THREE.PointLight(0x85dfff,1.8,.32);podLight.position.set(0,.032,.06);carriage.add(podLight)

let progress=0, playing=false, speed=1, external=false, yaw=0, pitch=0, orbitDistance=.25
const clock=new THREE.Clock(), tangent=new THREE.Vector3(), forward=new THREE.Vector3(0,0,1)
const speeds=[1,4,16]
const fmt=(n:number)=>Math.round(n).toLocaleString('en-GB')
function updateView(){
  const p=route.getPoint(progress);tangent.copy(route.getTangent(progress)).normalize()
  carriage.position.copy(p);carriage.quaternion.setFromUnitVectors(forward,tangent)
  moon.position.copy(moonPosition(progress));moon.rotation.y=progress*.22
  const desired=new THREE.Vector3()
  if(external){
    desired.copy(p).addScaledVector(tangent,-orbitDistance*Math.cos(yaw)).add(new THREE.Vector3(Math.sin(yaw)*orbitDistance,.055+orbitDistance*.37+pitch*orbitDistance,Math.cos(yaw)*orbitDistance*.2))
    // Keep the chase camera outside either globe at departure and arrival.
    for(const [center,radius] of [[earth.position,EARTH_RADIUS],[moon.position,MOON_RADIUS]] as const){
      const radial=desired.clone().sub(center)
      if(radial.length()<radius+.025)desired.copy(center).addScaledVector(radial.normalize(),radius+.025)
    }
    camera.position.lerp(desired,.16);camera.lookAt(p.clone().addScaledVector(tangent,.09))
  }
  else {desired.copy(p).addScaledVector(tangent,.017).addScaledVector(up,.043);camera.position.copy(desired);const dir=tangent.clone().applyAxisAngle(up,yaw).applyAxisAngle(new THREE.Vector3().crossVectors(up,tangent).normalize(),pitch);camera.lookAt(desired.clone().add(dir))}
  const distMoon=Math.max(MOON_RADIUS,moon.position.distanceTo(camera.position))
  $('#percent').textContent=`${Math.round(progress*100)}%`
  $('#earth-distance').textContent=`${fmt(p.length()*1000-EARTH_RADIUS*1000)} km`
  $('#distance').textContent=`${fmt(Math.max(0,(distMoon-MOON_RADIUS)*1000))} km away`
  $('#angular').textContent=`${apparentDiameterDegrees(MOON_RADIUS,distMoon).toFixed(2)}°`
  $('#days').textContent=`DAY ${(progress*4).toFixed(2)} / 4.00`
  $<HTMLInputElement>('#scrub').value=String(Math.round(progress*1000));$('#scrub').style.setProperty('--fill',`${progress*100}%`)
  $('#arrival').classList.toggle('hidden',progress<.999)
}
function setPlaying(value:boolean){playing=value;$('#play').innerHTML=value?'Ⅱ <span>PAUSE</span>':'▶ <span>RESUME</span>'}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.08);if(playing){progress=Math.min(1,progress+dt*speed/JOURNEY_SECONDS);if(progress===1)setPlaying(false)}updateView();renderer.render(scene,camera)}
updateView();animate()

$('#begin').addEventListener('click',()=>{$('#intro').classList.add('hidden');setPlaying(true)})
$('#play').addEventListener('click',()=>setPlaying(!playing))
$('#restart').addEventListener('click',()=>{progress=0;setPlaying(true)})
$('#camera').addEventListener('click',()=>{external=!external;yaw=0;pitch=0;$('#camera').innerHTML=external?'◉ <span>FIRST-PERSON VIEW</span>':'◉ <span>EXTERNAL VIEW</span>'})
$('#speed').addEventListener('click',()=>{speed=speeds[(speeds.indexOf(speed)+1)%speeds.length];$('#speed').innerHTML=`${speed}× <span>SPEED</span>`})
$('#scrub').addEventListener('input',e=>{progress=Number((e.target as HTMLInputElement).value)/1000;updateView()})
addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();setPlaying(!playing)}if(e.key.toLowerCase()==='c')$('#camera').click();if(e.key==='ArrowRight')progress=Math.min(1,progress+.01);if(e.key==='ArrowLeft')progress=Math.max(0,progress-.01)})
let dragging=false,lastX=0,lastY=0
renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)})
renderer.domElement.addEventListener('pointerup',()=>dragging=false)
renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;yaw=THREE.MathUtils.clamp(yaw-(e.clientX-lastX)*.004,-1.65,1.65);pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.003,-.75,.75);lastX=e.clientX;lastY=e.clientY})
renderer.domElement.addEventListener('wheel',e=>{orbitDistance=THREE.MathUtils.clamp(orbitDistance*(1+Math.sign(e.deltaY)*.12),.11,2)},{passive:true})
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75))})
console.info(`Worlds Apart: ${fmt(routeLength)} km adaptive rail; Earth-Moon mean separation ${MOON_DISTANCE*1000} km; target at ${ARRIVAL_MOON.length()*1000} km; landing point ${END.length()*1000} km from Earth; departure ${START.length()*1000} km.`)
