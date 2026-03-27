import type { Creature, Food, SimConfig } from '../types'
import type { RNG } from '../rng'
import type { CollisionPair } from './physics'
import { SpatialHash } from './spatialHash'
import {
  CREATURE_CAP, CREATURE_MAX_ENERGY, CREATURE_SIZE_MIN,
  ENERGY_DRAIN_BASE, ENERGY_DRAIN_PER_SIZE, ENERGY_DRAIN_PER_SPEED,
  REPRODUCTION_THRESHOLD, REPRODUCTION_MUTATION,
  ABSORPTION_MIN_RATIO, ABSORPTION_ENERGY_GAIN, ABSORPTION_MASS_GAIN,
  ABSORPTION_HUE_BLEND, ABSORPTION_TRAIT_BLEND,
  WANDER_STRENGTH, STEER_STRENGTH, FLEE_STRENGTH,
} from '../config'

// Reused hashes — caller rebuilds and passes in each tick
const _aiCreatureHash = new SpatialHash(64)

export function buildCreatureAIHash(creatures: Creature[]): SpatialHash {
  _aiCreatureHash.clear()
  for (let i = 0; i < creatures.length; i++) {
    _aiCreatureHash.insert(i, creatures[i].x, creatures[i].y)
  }
  return _aiCreatureHash
}

export function updateSteering(
  creatures: Creature[],
  food: Food[],
  foodHash: SpatialHash,
  creatureHash: SpatialHash,
  _config: SimConfig,
  rng: RNG,
): void {
  for (const c of creatures) {
    // Drain energy each tick
    c.energy -= ENERGY_DRAIN_BASE + ENERGY_DRAIN_PER_SIZE * c.size + ENERGY_DRAIN_PER_SPEED * c.speed
    c.age++

    // Wander: random nudge to velocity direction
    c.vx += (rng() - 0.5) * WANDER_STRENGTH
    c.vy += (rng() - 0.5) * WANDER_STRENGTH

    // Find nearest food in perception range
    let nearestFoodDistSq = Infinity
    let nearestFood: Food | null = null
    for (const fi of foodHash.query(c.x, c.y, c.perception)) {
      const f = food[fi]
      const dx = f.x - c.x; const dy = f.y - c.y
      const dSq = dx * dx + dy * dy
      if (dSq < nearestFoodDistSq) { nearestFoodDistSq = dSq; nearestFood = f }
    }

    // Find nearest prey and nearest predator
    let nearestPreyDistSq = Infinity
    let nearestPrey: Creature | null = null
    let nearestPredatorDistSq = Infinity
    let nearestPredator: Creature | null = null

    for (const ci of creatureHash.query(c.x, c.y, c.perception)) {
      const other = creatures[ci]
      if (other.id === c.id) continue
      const dx = other.x - c.x; const dy = other.y - c.y
      const dSq = dx * dx + dy * dy
      if (other.size * ABSORPTION_MIN_RATIO <= c.size) {
        if (dSq < nearestPreyDistSq) { nearestPreyDistSq = dSq; nearestPrey = other }
      } else if (other.size >= c.size * ABSORPTION_MIN_RATIO) {
        if (dSq < nearestPredatorDistSq) { nearestPredatorDistSq = dSq; nearestPredator = other }
      }
    }

    // Steer toward prey if closer than nearest food
    if (nearestPrey && nearestPreyDistSq < nearestFoodDistSq) {
      const dx = nearestPrey.x - c.x; const dy = nearestPrey.y - c.y
      const d = Math.sqrt(nearestPreyDistSq)
      c.vx += (dx / d) * STEER_STRENGTH * 0.8
      c.vy += (dy / d) * STEER_STRENGTH * 0.8
    } else if (nearestFood) {
      const dx = nearestFood.x - c.x; const dy = nearestFood.y - c.y
      const d = Math.sqrt(nearestFoodDistSq)
      c.vx += (dx / d) * STEER_STRENGTH
      c.vy += (dy / d) * STEER_STRENGTH
    }

    // Flee from predators
    if (nearestPredator) {
      const dx = c.x - nearestPredator.x; const dy = c.y - nearestPredator.y
      const d = Math.sqrt(nearestPredatorDistSq)
      c.vx += (dx / d) * FLEE_STRENGTH
      c.vy += (dy / d) * FLEE_STRENGTH
    }

    // Normalize velocity to unit vector
    const mag = Math.sqrt(c.vx * c.vx + c.vy * c.vy)
    if (mag > 0) { c.vx /= mag; c.vy /= mag }
  }
}

// Returns the set of absorbed creature IDs (by creature.id, not array index)
export function resolveAbsorptions(
  creatures: Creature[],
  pairs: CollisionPair[],
  config: SimConfig,
  rng: RNG,
): Set<number> {
  const absorbedIds = new Set<number>()

  for (const { largerIdx, smallerIdx } of pairs) {
    const absorber = creatures[largerIdx]
    const prey = creatures[smallerIdx]
    if (!absorber || !prey) continue
    if (absorbedIds.has(absorber.id) || absorbedIds.has(prey.id)) continue
    if (absorber.size < prey.size * ABSORPTION_MIN_RATIO) continue

    // Energy transfer
    absorber.energy = Math.min(CREATURE_MAX_ENERGY, absorber.energy + prey.energy * ABSORPTION_ENERGY_GAIN)

    // Size growth (area-based, partial mass absorption)
    const massGain = prey.size * prey.size * ABSORPTION_MASS_GAIN
    absorber.size = Math.sqrt(absorber.size * absorber.size + massGain)

    // Trait blending — mutationRate amplifies variance
    const blendVariance = 1 + (rng() - 0.5) * config.mutationRate
    const blend = ABSORPTION_TRAIT_BLEND * blendVariance
    absorber.speed = absorber.speed * (1 - blend) + prey.speed * blend
    absorber.perception = absorber.perception * (1 - blend) + prey.perception * blend

    // Hue blending — shortest path around the color wheel
    const hueDiff = ((prey.hue - absorber.hue) + 360) % 360
    const hueShift = hueDiff > 180 ? hueDiff - 360 : hueDiff
    absorber.hue = (absorber.hue + hueShift * ABSORPTION_HUE_BLEND + 360) % 360

    absorber.absorptions++
    absorbedIds.add(prey.id)
  }

  return absorbedIds
}

// Returns set of eaten food indices
export function eatFood(creatures: Creature[], food: Food[], foodHash: SpatialHash): Set<number> {
  const eaten = new Set<number>()
  for (const c of creatures) {
    const eatRange = c.size + 4
    for (const fi of foodHash.query(c.x, c.y, eatRange)) {
      if (eaten.has(fi)) continue
      const f = food[fi]
      const dx = f.x - c.x; const dy = f.y - c.y
      if (dx * dx + dy * dy < eatRange * eatRange) {
        c.energy = Math.min(CREATURE_MAX_ENERGY, c.energy + f.energy)
        eaten.add(fi)
      }
    }
  }
  return eaten
}

// Returns newly spawned offspring (not yet added to creatures array)
export function reproduce(
  creatures: Creature[],
  config: SimConfig,
  rng: RNG,
  nextId: { value: number },
): Creature[] {
  if (creatures.length >= CREATURE_CAP) return []
  const offspring: Creature[] = []

  for (const c of creatures) {
    if (c.energy < REPRODUCTION_THRESHOLD) continue
    if (creatures.length + offspring.length >= CREATURE_CAP) break

    c.energy /= 2
    c.children++

    const mutate = (v: number) =>
      v * (1 + (rng() - 0.5) * REPRODUCTION_MUTATION * (1 + config.mutationRate * 2))

    const angle = rng() * Math.PI * 2
    offspring.push({
      id: nextId.value++,
      x: c.x + Math.cos(angle) * c.size * 1.5,
      y: c.y + Math.sin(angle) * c.size * 1.5,
      vx: Math.cos(angle + Math.PI), // opposite direction from parent
      vy: Math.sin(angle + Math.PI),
      speed: Math.max(0.5, mutate(c.speed)),
      size: Math.max(CREATURE_SIZE_MIN, mutate(c.size) * 0.75), // children start smaller
      perception: Math.max(20, mutate(c.perception)),
      energy: c.energy,
      maxEnergy: CREATURE_MAX_ENERGY,
      age: 0,
      generation: c.generation + 1,
      hue: (c.hue + (rng() - 0.5) * 25 + 360) % 360,
      spriteKey: c.spriteKey,
      absorptions: 0,
      children: 0,
    })
  }

  return offspring
}
