import type { Creature } from '../types'
import { SpatialHash } from './spatialHash'
import { JAR_CENTER_X, JAR_CENTER_Y, JAR_RADIUS } from '../config'

export interface CollisionPair {
  largerIdx: number
  smallerIdx: number
}

// Reused each tick — avoids allocating a new SpatialHash every frame
const collisionHash = new SpatialHash(64)

export function physicsStep(creatures: Creature[], speedModifier: number): CollisionPair[] {
  // 1. Integrate positions and enforce jar boundary
  for (const c of creatures) {
    c.x += c.vx * c.speed * speedModifier
    c.y += c.vy * c.speed * speedModifier

    const dx = c.x - JAR_CENTER_X
    const dy = c.y - JAR_CENTER_Y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const limit = JAR_RADIUS - c.size

    if (dist > limit && dist > 0) {
      const nx = dx / dist
      const ny = dy / dist
      // Push creature back inside
      c.x = JAR_CENTER_X + nx * limit
      c.y = JAR_CENTER_Y + ny * limit
      // Reflect velocity off the boundary normal
      const dot = c.vx * nx + c.vy * ny
      c.vx -= 2 * dot * nx
      c.vy -= 2 * dot * ny
    }
  }

  // 2. Rebuild spatial hash with post-movement positions
  collisionHash.clear()
  for (let i = 0; i < creatures.length; i++) {
    collisionHash.insert(i, creatures[i].x, creatures[i].y)
  }

  // 3. Broad-phase collision detection
  const pairs: CollisionPair[] = []
  const checked = new Set<number>() // packed pair key to avoid duplicates

  for (let i = 0; i < creatures.length; i++) {
    const a = creatures[i]
    const nearby = collisionHash.query(a.x, a.y, a.size + 60) // 60 = max possible other radius

    for (const j of nearby) {
      if (j === i) continue
      // Pack pair into a single int — order-independent
      const pairKey = i < j ? i * 100000 + j : j * 100000 + i
      if (checked.has(pairKey)) continue
      checked.add(pairKey)

      const b = creatures[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const distSq = dx * dx + dy * dy
      const contactDist = a.size + b.size

      if (distSq < contactDist * contactDist) {
        if (a.size >= b.size) {
          pairs.push({ largerIdx: i, smallerIdx: j })
        } else {
          pairs.push({ largerIdx: j, smallerIdx: i })
        }
      }
    }
  }

  return pairs
}
