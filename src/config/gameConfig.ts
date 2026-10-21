export interface GameConfig {
  journey: {
    durationSeconds: number
    simulatedDays: number
    arrivalAltitudeKm: number
    speeds: readonly number[]
    initialSpeed: number
    maximumFrameStepSeconds: number
  }
  renderer: {
    antialias: boolean
    maximumPixelRatio: number
    toneMappingExposure: number
  }
  camera: {
    fieldOfViewDegrees: number
    nearWorldUnits: number
    farWorldUnits: number
    pointerSensitivity: number
    pitchSensitivity: number
    maximumYawRadians: number
    maximumPitchRadians: number
    firstPersonForwardWorldUnits: number
    firstPersonHeightWorldUnits: number
    externalDistanceWorldUnits: number
    minimumExternalDistanceWorldUnits: number
    maximumExternalDistanceWorldUnits: number
    zoomStep: number
  }
  scene: {
    proceduralSeed: number
    starCount: number
    starRadiusWorldUnits: number
    maximumTextureAnisotropy: number
    rail: {
      curveSamples: number
      sleeperCount: number
      endpointVisualGaugeWorldUnits: number
      openSpaceGaugeWorldUnits: number
      railVisualRadiusWorldUnits: number
    }
  }
  copy: {
    destination: string
    introEyebrow: string
    introTitleHtml: string
    introBody: string
    begin: string
    arrivalTitle: string
    arrivalBody: string
  }
}

export const defaultGameConfig: GameConfig = {
  journey: {
    durationSeconds: 180,
    simulatedDays: 4,
    arrivalAltitudeKm: 25,
    speeds: [1, 4, 16],
    initialSpeed: 1,
    maximumFrameStepSeconds: 0.08,
  },
  renderer: {
    antialias: true,
    maximumPixelRatio: 1.75,
    toneMappingExposure: 1.25,
  },
  camera: {
    fieldOfViewDegrees: 67,
    nearWorldUnits: 0.004,
    farWorldUnits: 1800,
    pointerSensitivity: 0.004,
    pitchSensitivity: 0.003,
    maximumYawRadians: Math.PI,
    maximumPitchRadians: 1.35,
    firstPersonForwardWorldUnits: 0.017,
    firstPersonHeightWorldUnits: 0.043,
    externalDistanceWorldUnits: 0.25,
    minimumExternalDistanceWorldUnits: 0.11,
    maximumExternalDistanceWorldUnits: 2,
    zoomStep: 0.12,
  },
  scene: {
    proceduralSeed: 7241,
    starCount: 2600,
    starRadiusWorldUnits: 950,
    maximumTextureAnisotropy: 8,
    rail: {
      curveSamples: 900,
      sleeperCount: 310,
      endpointVisualGaugeWorldUnits: 0.060,
      openSpaceGaugeWorldUnits: 0.085,
      railVisualRadiusWorldUnits: 0.003,
    },
  },
  copy: {
    destination: 'THE MOON',
    introEyebrow: 'WORLDS APART &nbsp; / &nbsp; PROTOTYPE 01',
    introTitleHtml: 'The distance<br/>between worlds.',
    introBody: 'Design spectacular rollercoaster tracks through space, then ride them from Earth to the Moon. Loops, swoops and planet views. No money, grinding or waiting.',
    begin: 'BEGIN JOURNEY',
    arrivalTitle: 'Welcome to the Moon.',
    arrivalBody: 'One small journey. A whole new world.',
  },
}

const positive = (value: number, name: string) => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive finite number.`)
}

export function validateGameConfig(config: GameConfig): GameConfig {
  positive(config.journey.durationSeconds, 'journey.durationSeconds')
  positive(config.journey.simulatedDays, 'journey.simulatedDays')
  positive(config.journey.arrivalAltitudeKm, 'journey.arrivalAltitudeKm')
  positive(config.journey.maximumFrameStepSeconds, 'journey.maximumFrameStepSeconds')
  if (!config.journey.speeds.length || config.journey.speeds.some(speed => !Number.isFinite(speed) || speed <= 0)) {
    throw new Error('journey.speeds must contain positive finite values.')
  }
  if (!config.journey.speeds.includes(config.journey.initialSpeed)) {
    throw new Error('journey.initialSpeed must appear in journey.speeds.')
  }
  positive(config.renderer.maximumPixelRatio, 'renderer.maximumPixelRatio')
  positive(config.renderer.toneMappingExposure, 'renderer.toneMappingExposure')
  positive(config.camera.fieldOfViewDegrees, 'camera.fieldOfViewDegrees')
  if (config.camera.fieldOfViewDegrees >= 180) throw new Error('camera.fieldOfViewDegrees must be below 180.')
  positive(config.camera.nearWorldUnits, 'camera.nearWorldUnits')
  positive(config.camera.farWorldUnits, 'camera.farWorldUnits')
  if (config.camera.farWorldUnits <= config.camera.nearWorldUnits) throw new Error('camera far plane must exceed the near plane.')
  positive(config.camera.pointerSensitivity, 'camera.pointerSensitivity')
  positive(config.camera.pitchSensitivity, 'camera.pitchSensitivity')
  positive(config.camera.externalDistanceWorldUnits, 'camera.externalDistanceWorldUnits')
  positive(config.camera.minimumExternalDistanceWorldUnits, 'camera.minimumExternalDistanceWorldUnits')
  positive(config.camera.maximumExternalDistanceWorldUnits, 'camera.maximumExternalDistanceWorldUnits')
  if (config.camera.minimumExternalDistanceWorldUnits > config.camera.externalDistanceWorldUnits || config.camera.externalDistanceWorldUnits > config.camera.maximumExternalDistanceWorldUnits) {
    throw new Error('camera external distance must be within its minimum and maximum.')
  }
  if (!Number.isInteger(config.scene.starCount) || config.scene.starCount < 0) throw new Error('scene.starCount must be a non-negative integer.')
  if (!Number.isInteger(config.scene.rail.curveSamples) || config.scene.rail.curveSamples < 8) throw new Error('scene.rail.curveSamples must be an integer of at least 8.')
  if (!Number.isInteger(config.scene.rail.sleeperCount) || config.scene.rail.sleeperCount < 1) throw new Error('scene.rail.sleeperCount must be a positive integer.')
  positive(config.scene.rail.endpointVisualGaugeWorldUnits, 'scene.rail.endpointVisualGaugeWorldUnits')
  positive(config.scene.rail.openSpaceGaugeWorldUnits, 'scene.rail.openSpaceGaugeWorldUnits')
  positive(config.scene.rail.railVisualRadiusWorldUnits, 'scene.rail.railVisualRadiusWorldUnits')
  for (const [name, value] of Object.entries(config.copy)) if (!value.trim()) throw new Error(`copy.${name} must not be empty.`)
  return config
}
