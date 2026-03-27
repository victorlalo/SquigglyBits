import type { Creature, SimConfig, SimState } from '../types'
import { FEATURE_IDS } from '../creatureFeatures'
import { createRandomVisualGenome } from '../spriteGen'
import { SpatialHash } from './spatialHash'
import { physicsStep } from './physics'
import { applyFeatureAuras, applyCollisionFeatureEffects, buildCreatureAIHash, updateSteering, resolveAbsorptions, eatFood, reproduce } from './creature'
import { spawnFood } from './food'
import { createRNG } from '../rng'
import {
  JAR_CENTER_X, JAR_CENTER_Y, JAR_RADIUS,
  STARTING_CREATURE_COUNT,
  CREATURE_SIZE_MIN, CREATURE_SIZE_MAX,
  CREATURE_SPEED_MIN, CREATURE_SPEED_MAX,
  CREATURE_START_ENERGY, CREATURE_MAX_ENERGY, CREATURE_PERCEPTION_BASE,
  MAX_TICKS, TWEAK_TICKS,
} from '../config'

const foodHash = new SpatialHash(32)

export function initSimulation(config: SimConfig, seed: number, spriteKeys: string[]): SimState {
  const rng = createRNG(seed)
  const creatures: Creature[] = []
  let nextCreatureId = 0

  for (let i = 0; i < STARTING_CREATURE_COUNT; i++) {
    const angle = rng() * Math.PI * 2
    const r = Math.sqrt(rng()) * JAR_RADIUS * 0.65
    const dir = rng() * Math.PI * 2

    creatures.push({
      id: nextCreatureId++,
      x: JAR_CENTER_X + Math.cos(angle) * r,
      y: JAR_CENTER_Y + Math.sin(angle) * r,
      vx: Math.cos(dir),
      vy: Math.sin(dir),
      speed: CREATURE_SPEED_MIN + rng() * (CREATURE_SPEED_MAX - CREATURE_SPEED_MIN),
      size: CREATURE_SIZE_MIN + rng() * (CREATURE_SIZE_MAX - CREATURE_SIZE_MIN),
      perception: CREATURE_PERCEPTION_BASE * (0.6 + rng() * 0.8),
      energy: CREATURE_START_ENERGY,
      maxEnergy: CREATURE_MAX_ENERGY,
      age: 0,
      generation: 0,
      hue: rng() * 360,
      spriteKey: spriteKeys.length > 0
        ? spriteKeys[Math.floor(rng() * spriteKeys.length)]
        : 'default',
      featureId: FEATURE_IDS[Math.floor(rng() * FEATURE_IDS.length)],
      visual: createRandomVisualGenome(rng),
      speedBurst: 1,
      absorptions: 0,
      children: 0,
    })
  }

  return {
    creatures,
    food: [],
    tick: 0,
    nextCreatureId,
    rng,
    config,
    phase: 'running',
    seed,
  }
}

export function stepSimulation(state: SimState): void {
  const { creatures, food, rng, config } = state
  const nextId = { value: state.nextCreatureId }

  // 1. Spawn food
  spawnFood(food, config, rng)

  // 2. Build food hash (stable for the whole tick)
  foodHash.clear()
  for (let i = 0; i < food.length; i++) foodHash.insert(i, food[i].x, food[i].y)

  // 3. Build creature hash for AI (pre-movement positions)
  const creatureHash = buildCreatureAIHash(creatures)

  // 4. AI steering (updates velocity + drains energy + increments age)
  updateSteering(creatures, food, foodHash, creatureHash, config, rng)

  // 4.5 Passive feature effects like poison auras.
  applyFeatureAuras(creatures, creatureHash)

  // 5. Physics: move + boundary + detect collisions
  const collisions = physicsStep(creatures, config.speedModifier)

  // 6. Contact-based feature effects like spikes and chaotic collisions.
  applyCollisionFeatureEffects(creatures, collisions, rng)

  // 7. Resolve absorptions
  const absorbedIds = resolveAbsorptions(creatures, collisions, config, rng)

  // 8. Eat food
  const eatenIndices = eatFood(creatures, food, foodHash)

  // 9. Reproduce
  const offspring = reproduce(creatures, config, rng, nextId)
  state.nextCreatureId = nextId.value

  // 10. Remove absorbed + dead creatures (iterate backwards to preserve indices)
  for (let i = creatures.length - 1; i >= 0; i--) {
    if (absorbedIds.has(creatures[i].id) || creatures[i].energy <= 0) {
      creatures.splice(i, 1)
    }
  }

  // 11. Add offspring after removals
  creatures.push(...offspring)

  // 12. Remove eaten food in-place
  let writeIdx = 0
  for (let i = 0; i < food.length; i++) {
    if (!eatenIndices.has(i)) food[writeIdx++] = food[i]
  }
  food.length = writeIdx

  state.tick++

  // Update phase
  if (state.tick >= MAX_TICKS || creatures.length <= 1) {
    state.phase = 'finished'
  } else if (TWEAK_TICKS.has(state.tick)) {
    state.phase = 'paused'
  }
}

export function resumeSimulation(state: SimState): void {
  state.phase = 'running'
}
