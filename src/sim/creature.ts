import type { Creature, Food, SimConfig } from '../types'
import { FEATURE_IDS, getFeatureDefinition } from '../creatureFeatures'
import { inheritVisualGenome } from '../spriteGen'
import type { RNG } from '../rng'
import type { CollisionPair } from './physics'
import { SpatialHash } from './spatialHash'
import {
  CREATURE_CAP, CREATURE_MAX_ENERGY, CREATURE_SIZE_MIN, CREATURE_SIZE_CAP,
  ENERGY_DRAIN_BASE, ENERGY_DRAIN_PER_SIZE, ENERGY_DRAIN_PER_SPEED,
  REPRODUCTION_THRESHOLD, REPRODUCTION_MUTATION,
  ABSORPTION_MIN_RATIO, ABSORPTION_ENERGY_GAIN, ABSORPTION_MASS_GAIN,
  ABSORPTION_HUE_BLEND, ABSORPTION_TRAIT_BLEND,
  WANDER_STRENGTH, STEER_STRENGTH, FLEE_STRENGTH,
  TRAJECTORY_SMOOTHING, TRAJECTORY_SMOOTHING_MIN, TRAJECTORY_SMOOTHING_MAX,
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
    const feature = getFeatureDefinition(c.featureId).gameplay
    c.speedBurst = 1

    // Drain energy each tick
    c.energy -= (
      ENERGY_DRAIN_BASE
      + ENERGY_DRAIN_PER_SIZE * c.size
      + ENERGY_DRAIN_PER_SPEED * c.speed * feature.speedMultiplier
    ) * feature.energyDrainMultiplier
    c.age++

    let desiredVx = c.vx
    let desiredVy = c.vy

    // Wander contributes to the target heading instead of snapping direction immediately.
    desiredVx += (rng() - 0.5) * WANDER_STRENGTH * feature.wanderMultiplier
    desiredVy += (rng() - 0.5) * WANDER_STRENGTH * feature.wanderMultiplier

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
      desiredVx += (dx / d) * STEER_STRENGTH * 0.8 * feature.steerMultiplier
      desiredVy += (dy / d) * STEER_STRENGTH * 0.8 * feature.steerMultiplier
    } else if (nearestFood) {
      const dx = nearestFood.x - c.x; const dy = nearestFood.y - c.y
      const d = Math.sqrt(nearestFoodDistSq)
      desiredVx += (dx / d) * STEER_STRENGTH * feature.steerMultiplier
      desiredVy += (dy / d) * STEER_STRENGTH * feature.steerMultiplier
    }

    // Flee from predators
    if (nearestPredator) {
      const dx = c.x - nearestPredator.x; const dy = c.y - nearestPredator.y
      const d = Math.sqrt(nearestPredatorDistSq)
      desiredVx += (dx / d) * FLEE_STRENGTH * feature.fleeMultiplier
      desiredVy += (dy / d) * FLEE_STRENGTH * feature.fleeMultiplier
    }

    if (feature.burstChance > 0 && rng() < feature.burstChance) {
      c.speedBurst = feature.burstMultiplier
      desiredVx += (rng() - 0.5) * 0.35
      desiredVy += (rng() - 0.5) * 0.35
    }

    const desiredMag = Math.sqrt(desiredVx * desiredVx + desiredVy * desiredVy)
    if (desiredMag > 0) {
      desiredVx /= desiredMag
      desiredVy /= desiredMag
    }

    const turnLerp = clamp(
      TRAJECTORY_SMOOTHING * feature.steerMultiplier,
      TRAJECTORY_SMOOTHING_MIN,
      TRAJECTORY_SMOOTHING_MAX,
    )

    c.vx = c.vx * (1 - turnLerp) + desiredVx * turnLerp
    c.vy = c.vy * (1 - turnLerp) + desiredVy * turnLerp

    const mag = Math.sqrt(c.vx * c.vx + c.vy * c.vy)
    if (mag > 0) {
      c.vx /= mag
      c.vy /= mag
    }
  }
}

export function applyFeatureAuras(
  creatures: Creature[],
  creatureHash: SpatialHash,
): void {
  for (const c of creatures) {
    const feature = getFeatureDefinition(c.featureId).gameplay
    if (feature.poisonRadius <= 0 || feature.poisonDamage <= 0) continue

    for (const ci of creatureHash.query(c.x, c.y, feature.poisonRadius)) {
      const other = creatures[ci]
      if (!other || other.id === c.id) continue
      const dx = other.x - c.x
      const dy = other.y - c.y
      if (dx * dx + dy * dy <= feature.poisonRadius * feature.poisonRadius) {
        other.energy -= feature.poisonDamage
      }
    }
  }
}

export function applyCollisionFeatureEffects(
  creatures: Creature[],
  pairs: CollisionPair[],
  rng: RNG,
): void {
  for (const { largerIdx, smallerIdx } of pairs) {
    const a = creatures[largerIdx]
    const b = creatures[smallerIdx]
    if (!a || !b) continue

    const aFeature = getFeatureDefinition(a.featureId).gameplay
    const bFeature = getFeatureDefinition(b.featureId).gameplay

    if (aFeature.contactDamage > 0) b.energy -= aFeature.contactDamage
    if (bFeature.contactDamage > 0) a.energy -= bFeature.contactDamage

    const chaos = Math.max(aFeature.collisionChaos, bFeature.collisionChaos)
    if (chaos > 0) {
      a.vx += (rng() - 0.5) * chaos
      a.vy += (rng() - 0.5) * chaos
      b.vx += (rng() - 0.5) * chaos
      b.vy += (rng() - 0.5) * chaos
    }
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
    if (absorber.energy <= 0 || prey.energy <= 0) continue
    if (absorbedIds.has(absorber.id) || absorbedIds.has(prey.id)) continue
    const absorberFeature = getFeatureDefinition(absorber.featureId).gameplay
    const preyFeature = getFeatureDefinition(prey.featureId).gameplay
    const absorptionPower = absorber.size * absorberFeature.absorptionAttackMultiplier
    const absorptionResistance = prey.size * preyFeature.absorptionDefenseMultiplier
    if (absorptionPower < absorptionResistance * ABSORPTION_MIN_RATIO) continue
    if (prey.age < 5) continue  // newborn immunity — prevents instant re-absorption after reproduction

    // Energy transfer
    absorber.energy = Math.min(CREATURE_MAX_ENERGY, absorber.energy + prey.energy * ABSORPTION_ENERGY_GAIN)

    // Size growth (area-based, partial mass absorption, hard cap)
    const massGain = prey.size * prey.size * ABSORPTION_MASS_GAIN * absorberFeature.growthMultiplier
    absorber.size = Math.min(CREATURE_SIZE_CAP, Math.sqrt(absorber.size * absorber.size + massGain))

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
    const feature = getFeatureDefinition(c.featureId).gameplay
    const eatRange = c.size + 4 + feature.contactRangeBonus
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
    const featureId = mutateFeature(c.featureId, rng, config.mutationRate)

    const angle = rng() * Math.PI * 2
    offspring.push({
      id: nextId.value++,
      x: c.x + Math.cos(angle) * c.size * 3,
      y: c.y + Math.sin(angle) * c.size * 3,
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
      featureId,
      visual: inheritVisualGenome(c.visual, rng, config.mutationRate),
      speedBurst: 1,
      absorptions: 0,
      children: 0,
    })
  }

  return offspring
}

function mutateFeature(
  featureId: Creature['featureId'],
  rng: RNG,
  mutationRate: number,
): Creature['featureId'] {
  if (rng() >= 0.10 + mutationRate * 0.25) return featureId
  const options = FEATURE_IDS.filter(id => id !== featureId)
  return options[Math.floor(rng() * options.length)] ?? featureId
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
