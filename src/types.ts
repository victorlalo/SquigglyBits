import type { RNG } from './rng'

export type CreatureFeatureId =
  | 'spikes'
  | 'shell'
  | 'fins'
  | 'poisonSac'
  | 'thrusters'
  | 'tentacles'
  | 'denseCore'
  | 'frills'

export type CreatureBodyArchetype = 'round' | 'pear' | 'elongated' | 'tadpole'

export interface CreatureVisualGenome {
  bodyArchetype: CreatureBodyArchetype
  shapeSeed: number
  eyeSeed: number
  eyeOffsetX: number
  eyeOffsetY: number
  eyeScale: number
  accentHueOffset: number
}

export interface Creature {
  id: number
  x: number
  y: number
  vx: number       // normalized direction x
  vy: number       // normalized direction y
  speed: number    // pixels per tick
  size: number     // radius in pixels
  perception: number // sensing range in pixels
  energy: number
  maxEnergy: number
  age: number
  generation: number
  hue: number      // 0–360, used for tinting sprites
  spriteKey: string // matches a key from getSpriteManifest(), or 'default'
  featureId: CreatureFeatureId
  visual: CreatureVisualGenome
  speedBurst: number
  absorptions: number
  children: number
}

export interface Food {
  x: number
  y: number
  energy: number
}

export interface SimConfig {
  foodAbundance: number   // 1–10
  speedModifier: number   // 0.5–2.0
  mutationRate: number    // 0.0–1.0
}

export interface SimState {
  creatures: Creature[]
  food: Food[]
  tick: number
  nextCreatureId: number
  rng: RNG
  config: SimConfig
  phase: 'running' | 'paused' | 'finished'
  seed: number
}

export type GamePhase = 'setup' | 'simulate' | 'select'
